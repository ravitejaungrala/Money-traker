import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, bankAccounts, balanceSnapshots, notifications } from "@/lib/schema";
import { eq, and, gte, lte, like, or, desc, sql } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { z } from "zod";
import { generateDedupHash } from "@/lib/utils";

const createSchema = z.object({
  bankAccountId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["CREDIT", "DEBIT"]),
  category: z.string().default("OTHER"),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  paymentMethod: z.string().default("OTHER"),
  transactionDate: z.string(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const bankAccountId = searchParams.get("bankAccountId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const conditions = [eq(transactions.userId, userId)];
  if (type) conditions.push(eq(transactions.type, type));
  if (category) conditions.push(eq(transactions.category, category));
  if (bankAccountId) conditions.push(eq(transactions.bankAccountId, bankAccountId));
  if (dateFrom) conditions.push(gte(transactions.transactionDate, dateFrom));
  if (dateTo) conditions.push(lte(transactions.transactionDate, dateTo + "T23:59:59"));
  if (search) {
    conditions.push(
      or(
        like(transactions.description, `%${search}%`),
        like(transactions.merchantName, `%${search}%`),
      )!
    );
  }

  const where = and(...conditions);

  const txList = await db.select({
    id: transactions.id,
    amount: transactions.amount,
    type: transactions.type,
    category: transactions.category,
    description: transactions.description,
    merchantName: transactions.merchantName,
    paymentMethod: transactions.paymentMethod,
    transactionDate: transactions.transactionDate,
    referenceId: transactions.referenceId,
    source: transactions.source,
    verificationStatus: transactions.verificationStatus,
    bankAccountBankName: bankAccounts.bankName,
    bankAccountLast4: bankAccounts.accountNumberLast4,
  })
    .from(transactions)
    .leftJoin(bankAccounts, eq(transactions.bankAccountId, bankAccounts.id))
    .where(where)
    .orderBy(desc(transactions.transactionDate))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ count: total }] = await db.select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(where);

  const formatted = txList.map((tx) => ({
    ...tx,
    bankAccount: {
      bankName: tx.bankAccountBankName,
      accountNumberLast4: tx.bankAccountLast4,
    },
  }));

  return NextResponse.json({
    transactions: formatted,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const [account] = await db.select().from(bankAccounts)
      .where(and(eq(bankAccounts.id, data.bankAccountId), eq(bankAccounts.userId, userId)))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const dedupHash = generateDedupHash(data.bankAccountId, data.amount, data.transactionDate, data.referenceId);

    const [existing] = await db.select().from(transactions)
      .where(eq(transactions.dedupHash, dedupHash)).limit(1);
    if (existing) {
      return NextResponse.json({ error: "Duplicate transaction detected" }, { status: 409 });
    }

    const currentBalance = account.currentBalance ?? 0;
    const newBalance = data.type === "CREDIT"
      ? currentBalance + data.amount
      : currentBalance - data.amount;

    const threshold = account.thresholdAmount ?? 10000;
    const isBelowThreshold = newBalance < threshold;
    const wasBelowThreshold = account.isBelowThreshold ?? false;

    const [transaction] = await db.insert(transactions).values({
      userId,
      bankAccountId: data.bankAccountId,
      amount: data.amount,
      type: data.type,
      category: data.category,
      description: data.description,
      merchantName: data.merchantName,
      paymentMethod: data.paymentMethod,
      transactionDate: data.transactionDate,
      referenceId: data.referenceId,
      notes: data.notes,
      source: "MANUAL",
      verificationStatus: "VERIFIED",
      dedupHash,
      balanceAfter: newBalance,
    }).returning();

    await db.update(bankAccounts)
      .set({ currentBalance: newBalance, isBelowThreshold })
      .where(eq(bankAccounts.id, data.bankAccountId));

    await db.insert(balanceSnapshots).values({
      bankAccountId: data.bankAccountId,
      balance: newBalance,
      source: "MANUAL",
    });

    if (isBelowThreshold && !wasBelowThreshold) {
      await db.insert(notifications).values({
        userId,
        type: "LOW_BALANCE",
        title: "Low Balance Alert!",
        message: `Your ${account.bankName} account (XXXX ${account.accountNumberLast4}) balance has dropped to ₹${newBalance.toLocaleString("en-IN")}. Minimum threshold: ₹${threshold.toLocaleString("en-IN")}. Amount needed: ₹${(threshold - newBalance).toLocaleString("en-IN")}.`,
        metadata: JSON.stringify({
          bankAccountId: account.id,
          balance: newBalance,
          threshold,
          triggerTransactionId: transaction.id,
        }),
      });
    }

    if (!isBelowThreshold && wasBelowThreshold) {
      await db.insert(notifications).values({
        userId,
        type: "BALANCE_RECOVERED",
        title: "Balance Recovered",
        message: `Your ${account.bankName} account balance has recovered to ₹${newBalance.toLocaleString("en-IN")}, above the ₹${threshold.toLocaleString("en-IN")} threshold.`,
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Transaction creation error:", err);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
