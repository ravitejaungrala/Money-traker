import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BankAccount, Transaction, Notification } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [accounts, monthlyTx, todayTx, unreadNotifications] = await Promise.all([
    BankAccount.find({ userId, isActive: true }).lean(),
    Transaction.find({
      userId,
      transactionDate: { $gte: startOfMonth },
      verificationStatus: "VERIFIED",
    }).lean(),
    Transaction.find({
      userId,
      transactionDate: { $gte: startOfDay },
      verificationStatus: "VERIFIED",
    }).lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

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

    const monthTransactions = await Transaction.find({
      userId,
      transactionDate: { $gte: monthStart.toISOString(), $lte: monthEnd.toISOString() },
      verificationStatus: "VERIFIED",
    }).lean();

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
      id: a._id,
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
