import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BankAccount } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await connectDB();
  const account = await BankAccount.findOne({ _id: params.id, userId }).lean();
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

  const updated = await BankAccount.findByIdAndUpdate(params.id, updateData, { new: true }).lean();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await connectDB();
  const account = await BankAccount.findOne({ _id: params.id, userId }).lean();
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  await BankAccount.findByIdAndUpdate(params.id, { isActive: false });
  return NextResponse.json({ success: true });
}
