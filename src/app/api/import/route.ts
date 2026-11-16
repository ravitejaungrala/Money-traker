import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Transaction, BankAccount, Notification } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { generateDedupHash } from "@/lib/utils";
import { parseCSVStatement } from "@/lib/csv-parser";
import { parsePDFStatement } from "@/lib/pdf-parser";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const accountId = formData.get("accountId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: "No bank account selected" }, { status: 400 });
    }

    const account = await BankAccount.findOne({ _id: accountId, userId }).lean();
    if (!account) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const password = formData.get("password") as string | null;
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith(".pdf") || file.type === "application/pdf";

    let parsedTransactions: Array<{ date: string; description: string; amount: number; type: "CREDIT" | "DEBIT"; balance?: number; referenceId?: string }>;
    let bankName: string;
    let formatName: string;
    let parseErrors: string[];
    let rawTextSample: string | undefined;

    if (isPDF) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfResult = await parsePDFStatement(buffer, password || undefined);
      parsedTransactions = pdfResult.transactions;
      bankName = pdfResult.bank;
      formatName = "PDF Statement";
      parseErrors = pdfResult.errors;
      rawTextSample = pdfResult.rawTextSample;
    } else {
      const csvText = await file.text();
      const csvResult = parseCSVStatement(csvText);
      parsedTransactions = csvResult.transactions;
      bankName = csvResult.bank;
      formatName = csvResult.format;
      parseErrors = csvResult.errors;
    }

    if (parsedTransactions.length === 0) {
      if (rawTextSample) {
        const txnStart = rawTextSample.search(/Txn\s*Date|Transaction\s*Date|Value\s*Date|Particulars|Narration/i);
        const startIdx = txnStart > 0 ? Math.max(0, txnStart - 50) : 0;
        parseErrors.push("--- PDF Text Sample ---");
        parseErrors.push(rawTextSample.slice(startIdx, startIdx + 2000));
      }
      return NextResponse.json({
        error: `No transactions found in ${isPDF ? "PDF" : "CSV"}`,
        bank: bankName,
        format: formatName,
        parseErrors,
      }, { status: 400 });
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    const source = isPDF ? "PDF" : "CSV";

    for (const tx of parsedTransactions) {
      const dedupHash = generateDedupHash(accountId, tx.amount, tx.date, tx.referenceId);

      try {
        await Transaction.create({
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
          source,
          verificationStatus: "VERIFIED",
          dedupHash,
          balanceAfter: tx.balance ?? null,
        });
        imported++;
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes("duplicate key")) {
          duplicates++;
        } else {
          errors++;
        }
      }
    }

    if (imported > 0) {
      const lastTx = parsedTransactions[parsedTransactions.length - 1];
      if (lastTx.balance !== undefined) {
        await BankAccount.findByIdAndUpdate(accountId, {
          currentBalance: lastTx.balance,
          lastSyncedAt: new Date().toISOString(),
          isBelowThreshold: lastTx.balance < (account.thresholdAmount ?? 10000),
        });
      }

      await Notification.create({
        userId,
        type: "IMPORT",
        title: `${source} Import Complete`,
        message: `Imported ${imported} transaction${imported !== 1 ? "s" : ""} from ${bankName} ${source} statement${duplicates > 0 ? ` (${duplicates} duplicate${duplicates !== 1 ? "s" : ""} skipped)` : ""}.`,
      });
    }

    return NextResponse.json({
      success: true,
      bank: bankName,
      format: formatName,
      total: parsedTransactions.length,
      imported,
      duplicates,
      errors,
      parseErrors,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
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
