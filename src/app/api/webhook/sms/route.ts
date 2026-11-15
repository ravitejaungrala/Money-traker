import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, bankAccounts, notifications } from "@/lib/schema";
import { eq, and, like } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parseBankSMS } from "@/lib/sms-parser";
import { generateDedupHash } from "@/lib/utils";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const { sms } = body;

    if (!sms || typeof sms !== "string") {
      return NextResponse.json({ error: "SMS text is required" }, { status: 400 });
    }

    const parsed = parseBankSMS(sms);
    if (!parsed) {
      return NextResponse.json({
        error: "Could not parse transaction from SMS",
        hint: "Make sure this is a valid bank transaction SMS",
      }, { status: 422 });
    }

    const accounts = await db.select().from(bankAccounts)
      .where(and(
        eq(bankAccounts.userId, userId),
        eq(bankAccounts.isActive, true),
        like(bankAccounts.accountNumberLast4, `%${parsed.accountLast4}%`),
      ));

    let account = accounts[0];

    if (!account) {
      const [anyAccount] = await db.select().from(bankAccounts)
        .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)))
        .limit(1);
      account = anyAccount;
    }

    if (!account) {
      return NextResponse.json({
        error: "No bank account found",
        parsed,
        hint: "Add a bank account first",
      }, { status: 404 });
    }

    const txDate = new Date().toISOString();
    const dedupHash = generateDedupHash(account.id, parsed.amount, txDate, parsed.referenceId);

    const [existing] = await db.select().from(transactions)
      .where(eq(transactions.dedupHash, dedupHash)).limit(1);
    if (existing) {
      return NextResponse.json({
        status: "duplicate",
        message: "This transaction was already recorded",
        transaction: existing,
        parsed,
      });
    }

    const currentBalance = account.currentBalance ?? 0;
    const newBalance = parsed.type === "CREDIT"
      ? currentBalance + parsed.amount
      : currentBalance - parsed.amount;

    const [transaction] = await db.insert(transactions).values({
      userId,
      bankAccountId: account.id,
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      description: parsed.description,
      merchantName: parsed.merchantName,
      paymentMethod: parsed.paymentMethod,
      transactionDate: txDate,
      referenceId: parsed.referenceId,
      source: "SMS",
      verificationStatus: "PENDING",
      dedupHash,
      balanceAfter: parsed.balance ?? newBalance,
    }).returning();

    await db.update(bankAccounts)
      .set({ currentBalance: parsed.balance ?? newBalance, lastSyncedAt: txDate })
      .where(eq(bankAccounts.id, account.id));

    const threshold = account.thresholdAmount ?? 10000;
    const finalBalance = parsed.balance ?? newBalance;
    if (finalBalance < threshold && !(account.isBelowThreshold ?? false)) {
      await db.update(bankAccounts).set({ isBelowThreshold: true }).where(eq(bankAccounts.id, account.id));
      await db.insert(notifications).values({
        userId,
        type: "LOW_BALANCE",
        title: "Low Balance Alert!",
        message: `Your ${account.bankName} account (XXXX ${account.accountNumberLast4}) balance dropped to ₹${finalBalance.toLocaleString("en-IN")}. Threshold: ₹${threshold.toLocaleString("en-IN")}.`,
      });
    }

    await db.insert(notifications).values({
      userId,
      type: parsed.type === "CREDIT" ? "NEW_CREDIT" : "LARGE_TRANSACTION",
      title: parsed.type === "CREDIT" ? "Money Received" : "Payment Detected",
      message: `${parsed.type === "CREDIT" ? "Received" : "Paid"} ₹${parsed.amount.toLocaleString("en-IN")}${parsed.merchantName ? ` ${parsed.type === "CREDIT" ? "from" : "to"} ${parsed.merchantName}` : ""} via ${parsed.paymentMethod}${parsed.upiApp ? ` (${parsed.upiApp})` : ""}`,
    });

    return NextResponse.json({
      status: "created",
      transaction,
      parsed,
      account: { bankName: account.bankName, last4: account.accountNumberLast4 },
      balance: parsed.balance ?? newBalance,
    }, { status: 201 });
  } catch (err) {
    console.error("SMS webhook error:", err);
    return NextResponse.json({ error: "Failed to process SMS" }, { status: 500 });
  }
}
