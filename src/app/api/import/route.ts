import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, bankAccounts, notifications } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { generateDedupHash } from "@/lib/utils";
import { parseCSVStatement } from "@/lib/csv-parser";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const accountId = formData.get("accountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "No bank account selected" }, { status: 400 });
    }

    const account = db
      .select()
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.userId, userId)))
      .get();

    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const csvText = await file.text();
    const parsed = parseCSVStatement(csvText);

    if (parsed.transactions.length === 0) {
      return NextResponse.json({
        error: "No transactions found in CSV",
        bank: parsed.bank,
        format: parsed.format,
        parseErrors: parsed.errors,
      }, { status: 400 });
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const tx of parsed.transactions) {
      const dedupHash = generateDedupHash(accountId, tx.amount, tx.date, tx.referenceId);

      try {
        db.insert(transactions)
          .values({
            userId,
            bankAccountId: accountId,
            amount: tx.amount,
            type: tx.type,
            category: categorizeFromDescription(tx.description),
            description: tx.description || null,
            merchantName: extractMerchant(tx.description),
            paymentMethod: "OTHER",
            transactionDate: tx.date,
            referenceId: tx.referenceId || null,
            source: "CSV",
            verificationStatus: "VERIFIED",
            dedupHash,
            balanceAfter: tx.balance ?? null,
          })
          .run();
        imported++;
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes("UNIQUE constraint")) {
          duplicates++;
        } else {
          errors++;
        }
      }
    }

    if (imported > 0) {
      const lastTx = parsed.transactions[parsed.transactions.length - 1];
      if (lastTx.balance !== undefined) {
        db.update(bankAccounts)
          .set({
            currentBalance: lastTx.balance,
            lastSyncedAt: new Date().toISOString(),
            isBelowThreshold: lastTx.balance < (account.thresholdAmount ?? 10000),
          })
          .where(eq(bankAccounts.id, accountId))
          .run();
      }

      db.insert(notifications)
        .values({
          userId,
          type: "IMPORT",
          title: "CSV Import Complete",
          message: `Imported ${imported} transaction${imported !== 1 ? "s" : ""} from ${parsed.bank} statement${duplicates > 0 ? ` (${duplicates} duplicate${duplicates !== 1 ? "s" : ""} skipped)` : ""}.`,
        })
        .run();
    }

    return NextResponse.json({
      success: true,
      bank: parsed.bank,
      format: parsed.format,
      total: parsed.transactions.length,
      imported,
      duplicates,
      errors,
      parseErrors: parsed.errors,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 });
  }
}

function categorizeFromDescription(desc: string): string {
  if (!desc) return "OTHER";
  const lower = desc.toLowerCase();

  const map: Record<string, string[]> = {
    SALARY: ["salary", "payroll", "stipend", "wages"],
    FOOD: ["swiggy", "zomato", "food", "restaurant", "cafe", "pizza", "burger", "starbucks", "domino", "mcdonalds"],
    SHOPPING: ["amazon", "flipkart", "myntra", "shopping", "mart", "store", "retail", "bazaar", "meesho"],
    TRANSPORT: ["uber", "ola", "rapido", "metro", "irctc", "railway", "petrol", "fuel", "parking", "cab"],
    RENT: ["rent", "lease", "landlord", "housing", "property", "pg "],
    EMI: ["emi", "loan", "instalment", "installment", "bajaj", "hdfc ltd"],
    BILLS: ["electricity", "water", "gas", "internet", "broadband", "airtel", "jio", "vodafone", "bsnl", "recharge", "dth"],
    HEALTH: ["hospital", "medical", "pharmacy", "medicine", "doctor", "lab ", "diagnostic", "apollo", "medplus"],
    ENTERTAINMENT: ["netflix", "spotify", "hotstar", "prime", "disney", "movie", "theatre", "gaming"],
    EDUCATION: ["school", "college", "tuition", "course", "udemy", "coaching", "exam", "book"],
    INVESTMENT: ["mutual fund", "sip", "investment", "stock", "zerodha", "groww", "mf ", "nps"],
    TRANSFER: ["transfer", "neft", "rtgs", "imps", "self"],
  };

  for (const [category, keywords] of Object.entries(map)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "OTHER";
}

function extractMerchant(desc: string): string | null {
  if (!desc) return null;
  const patterns = [
    /(?:to|from|at|paid to|received from)\s+([A-Za-z][A-Za-z0-9\s&'.,-]+)/i,
    /UPI[-\/]([A-Za-z][A-Za-z0-9\s&'.,-]+)/i,
  ];
  for (const p of patterns) {
    const match = desc.match(p);
    if (match) {
      const merchant = match[1].trim().replace(/\s+/g, " ");
      if (merchant.length > 2 && merchant.length < 50) return merchant;
    }
  }
  return null;
}
