import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets, transactions } from "@/lib/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  category: z.string(),
  monthlyLimit: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budgetList = await db.select().from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)));

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

  const txList = await db.select().from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "DEBIT"),
      eq(transactions.verificationStatus, "VERIFIED"),
      gte(transactions.transactionDate, startOfMonth),
      lte(transactions.transactionDate, endOfMonth),
    ));

  const spending: Record<string, number> = {};
  for (const tx of txList) {
    const cat = tx.category ?? "OTHER";
    spending[cat] = (spending[cat] || 0) + tx.amount;
  }

  const budgetsWithSpending = budgetList.map((b) => ({
    ...b,
    spent: spending[b.category] || 0,
    remaining: Math.max(0, b.monthlyLimit - (spending[b.category] || 0)),
    percentage: ((spending[b.category] || 0) / b.monthlyLimit) * 100,
    isExceeded: (spending[b.category] || 0) > b.monthlyLimit,
  }));

  const totalBudget = budgetList.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = Object.values(spending).reduce((s, v) => s + v, 0);

  return NextResponse.json({ budgets: budgetsWithSpending, totalBudget, totalSpent, month, year });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const [existing] = await db.select().from(budgets)
      .where(and(
        eq(budgets.userId, userId),
        eq(budgets.category, data.category),
        eq(budgets.month, data.month),
        eq(budgets.year, data.year),
      ))
      .limit(1);

    let budget;
    if (existing) {
      [budget] = await db.update(budgets)
        .set({ monthlyLimit: data.monthlyLimit })
        .where(eq(budgets.id, existing.id))
        .returning();
    } else {
      [budget] = await db.insert(budgets)
        .values({ userId, ...data })
        .returning();
    }

    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create budget" }, { status: 500 });
  }
}
