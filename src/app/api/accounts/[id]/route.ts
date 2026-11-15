import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankAccounts } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const [account] = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.id, params.id), eq(bankAccounts.userId, userId)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.thresholdAmount !== undefined) {
    updateData.thresholdAmount = body.thresholdAmount;
    updateData.isBelowThreshold = (account.currentBalance ?? 0) < body.thresholdAmount;
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive;
  }

  const [updated] = await db.update(bankAccounts)
    .set(updateData)
    .where(eq(bankAccounts.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const [account] = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.id, params.id), eq(bankAccounts.userId, userId)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await db.update(bankAccounts).set({ isActive: false }).where(eq(bankAccounts.id, params.id));

  return NextResponse.json({ success: true });
}
