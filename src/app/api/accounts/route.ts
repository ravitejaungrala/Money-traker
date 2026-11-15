import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts, balanceSnapshots } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  bankName: z.string().min(2),
  accountNumberLast4: z.string().length(4),
  accountType: z.string().default("SAVINGS"),
  ifscCode: z.string().optional(),
  currentBalance: z.number().default(0),
  thresholdAmount: z.number().default(10000),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const accounts = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)))
    .orderBy(bankAccounts.createdAt);

  return NextResponse.json(accounts);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const [account] = await db.insert(bankAccounts).values({
      userId,
      bankName: data.bankName,
      accountNumberLast4: data.accountNumberLast4,
      accountNumberHash: `hashed_${data.accountNumberLast4}_${Date.now()}`,
      accountType: data.accountType,
      ifscCode: data.ifscCode,
      currentBalance: data.currentBalance,
      thresholdAmount: data.thresholdAmount,
      isBelowThreshold: data.currentBalance < data.thresholdAmount,
    }).returning();

    if (data.currentBalance > 0) {
      await db.insert(balanceSnapshots).values({
        bankAccountId: account.id,
        balance: data.currentBalance,
        source: "MANUAL",
      });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
