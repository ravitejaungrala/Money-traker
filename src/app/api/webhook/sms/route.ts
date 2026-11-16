import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, BankAccount, Notification } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { parseBankSMS } from "@/lib/sms-parser";
import { generateDedupHash } from "@/lib/utils";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    await connectDB();
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

    let account = await BankAccount.findOne({
      userId,
      isActive: true,
      accountNumberLast4: { $regex: parsed.accountLast4 },
    }).lean();

    if (!account) {
      account = await BankAccount.findOne({ userId, isActive: true }).lean();
    }

    if (!account) {
      return NextResponse.json({
        error: "No bank account found",
        parsed,
        hint: "Add a bank account first",
      }, { status: 404 });
    }

    const txDate = new Date().toISOString();
    const dedupHash = generateDedupHash(account._id, parsed.amount, txDate, parsed.referenceId);

    const existing = await Transaction.findOne({ dedupHash }).lean();
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

    const transaction = await Transaction.create({
      userId,
      bankAccountId: account._id,
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
    });

    await BankAccount.findByIdAndUpdate(account._id, {
      currentBalance: parsed.balance ?? newBalance,
      lastSyncedAt: txDate,
    });

    const threshold = account.thresholdAmount ?? 10000;
    const finalBalance = parsed.balance ?? newBalance;
    if (finalBalance < threshold && !(account.isBelowThreshold ?? false)) {
      await BankAccount.findByIdAndUpdate(account._id, { isBelowThreshold: true });
      await Notification.create({
        userId,
        type: "LOW_BALANCE",
        title: "Low Balance Alert!",
        message: `Your ${account.bankName} account (XXXX ${account.accountNumberLast4}) balance dropped to ₹${finalBalance.toLocaleString("en-IN")}. Threshold: ₹${threshold.toLocaleString("en-IN")}.`,
      });
    }

    await Notification.create({
      userId,
      type: parsed.type === "CREDIT" ? "NEW_CREDIT" : "LARGE_TRANSACTION",
      title: parsed.type === "CREDIT" ? "Money Received" : "Payment Detected",
      message: `${parsed.type === "CREDIT" ? "Received" : "Paid"} ₹${parsed.amount.toLocaleString("en-IN")}${parsed.merchantName ? ` ${parsed.type === "CREDIT" ? "from" : "to"} ${parsed.merchantName}` : ""} via ${parsed.paymentMethod}${parsed.upiApp ? ` (${parsed.upiApp})` : ""}`,
    });

    return NextResponse.json({
      status: "created",
      transaction: transaction.toObject(),
      parsed,
      account: { bankName: account.bankName, last4: account.accountNumberLast4 },
      balance: parsed.balance ?? newBalance,
    }, { status: 201 });
  } catch (err) {
    console.error("SMS webhook error:", err);
    return NextResponse.json({ error: "Failed to process SMS" }, { status: 500 });
  }
}
