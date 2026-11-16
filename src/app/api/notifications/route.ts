import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification } from "@/lib/schema";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await connectDB();

  const [notifList, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return NextResponse.json({ notifications: notifList, unreadCount });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  await connectDB();
  const body = await req.json();

  if (body.markAllRead) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  } else if (body.id) {
    await Notification.findByIdAndUpdate(body.id, { isRead: true });
  }

  return NextResponse.json({ success: true });
}
