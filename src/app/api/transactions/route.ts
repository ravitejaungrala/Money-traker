import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, BankAccount, BalanceSnapshot, Notification } from "@/lib/schema";
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

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const bankAccountId = searchParams.get("bankAccountId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const filter: Record<string, unknown> = { userId };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (bankAccountId) filter.bankAccountId = bankAccountId;
  if (dateFrom || dateTo) {
    filter.transactionDate = {};
    if (dateFrom) (filter.transactionDate as Record<string, string>).$gte = dateFrom;
    if (dateTo) (filter.transactionDate as Record<string, string>).$lte = dateTo + "T23:59:59";
  }
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: "i" } },
      { merchantName: { $regex: search, $options: "i" } },
    ];
  }

  const [txList, total] = await Promise.all([
    Transaction.find(filter).sort({ transactionDate: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  const accountIds = [...new Set(txList.map((t) => t.bankAccountId))];
  const accounts = await BankAccount.find({ _id: { $in: accountIds } }).lean();
  const accountMap = new Map(accounts.map((a) => [a._id, a]));

  const formatted = txList.map((tx) => {
    const acc = accountMap.get(tx.bankAccountId);
    return {
      id: tx._id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      merchantName: tx.merchantName,
      paymentMethod: tx.paymentMethod,
      transactionDate: tx.transactionDate,
      referenceId: tx.referenceId,
      source: tx.source,
      verificationStatus: tx.verificationStatus,
      bankAccount: {
        bankName: acc?.bankName,
        accountNumberLast4: acc?.accountNumberLast4,
      },
    };
  });

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
    await connectDB();
    const body = await req.json();
    const data = createSchema.parse(body);

    const account = await BankAccount.findOne({ _id: data.bankAccountId, userId }).lean();
    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const dedupHash = generateDedupHash(data.bankAccountId, data.amount, data.transactionDate, data.referenceId);

    const existing = await Transaction.findOne({ dedupHash }).lean();
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

    const transaction = await Transaction.create({
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
    });

    await BankAccount.findByIdAndUpdate(data.bankAccountId, {
      currentBalance: newBalance,
      isBelowThreshold,
    });

    await BalanceSnapshot.create({
      bankAccountId: data.bankAccountId,
      balance: newBalance,
      source: "MANUAL",
    });

    if (isBelowThreshold && !wasBelowThreshold) {
      await Notification.create({
        userId,
        type: "LOW_BALANCE",
        title: "Low Balance Alert!",
        message: `Your ${account.bankName} account (XXXX ${account.accountNumberLast4}) balance has dropped to ₹${newBalance.toLocaleString("en-IN")}. Minimum threshold: ₹${threshold.toLocaleString("en-IN")}. Amount needed: ₹${(threshold - newBalance).toLocaleString("en-IN")}.`,
        metadata: JSON.stringify({
          bankAccountId: account._id,
          balance: newBalance,
          threshold,
          triggerTransactionId: transaction._id,
        }),
      });
    }

    if (!isBelowThreshold && wasBelowThreshold) {
      await Notification.create({
        userId,
        type: "BALANCE_RECOVERED",
        title: "Balance Recovered",
        message: `Your ${account.bankName} account balance has recovered to ₹${newBalance.toLocaleString("en-IN")}, above the ₹${threshold.toLocaleString("en-IN")} threshold.`,
      });
    }

    return NextResponse.json(transaction.toObject(), { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Transaction creation error:", err);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
