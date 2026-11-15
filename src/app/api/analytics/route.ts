import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts, transactions, notifications } from "@/lib/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const accounts = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)));

  const monthlyTx = await db.select().from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, startOfMonth),
      eq(transactions.verificationStatus, "VERIFIED"),
    ));

  const todayTx = await db.select().from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.transactionDate, startOfDay),
      eq(transactions.verificationStatus, "VERIFIED"),
    ));

  const [{ count: unreadNotifications }] = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
  const monthlyIncome = monthlyTx.filter((t) => t.type === "CREDIT").reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = monthlyTx.filter((t) => t.type === "DEBIT").reduce((sum, t) => sum + t.amount, 0);
  const todayIncome = todayTx.filter((t) => t.type === "CREDIT").reduce((sum, t) => sum + t.amount, 0);
  const todayExpenses = todayTx.filter((t) => t.type === "DEBIT").reduce((sum, t) => sum + t.amount, 0);

  const categorySpending: Record<string, { amount: number; count: number }> = {};
  for (const tx of monthlyTx.filter((t) => t.type === "DEBIT")) {
    const cat = tx.category ?? "OTHER";
    if (!categorySpending[cat]) categorySpending[cat] = { amount: 0, count: 0 };
    categorySpending[cat].amount += tx.amount;
    categorySpending[cat].count += 1;
  }

  const categoryBreakdown = Object.entries(categorySpending)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: monthlyExpenses > 0 ? (data.amount / monthlyExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const trends = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthTransactions = await db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, monthStart.toISOString()),
        lte(transactions.transactionDate, monthEnd.toISOString()),
        eq(transactions.verificationStatus, "VERIFIED"),
      ));

    const income = monthTransactions.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
    const expenses = monthTransactions.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);
    trends.push({
      month: monthStart.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      income,
      expenses,
      savings: income - expenses,
    });
  }

  return NextResponse.json({
    dashboard: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
      todayIncome,
      todayExpenses,
      accountCount: accounts.length,
      unreadNotifications,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      bankName: a.bankName,
      accountNumberLast4: a.accountNumberLast4,
      accountType: a.accountType,
      currentBalance: a.currentBalance,
      thresholdAmount: a.thresholdAmount,
      isBelowThreshold: a.isBelowThreshold,
      lastSyncedAt: a.lastSyncedAt,
    })),
    categoryBreakdown,
    trends,
  });
}
