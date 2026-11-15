import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCurrentUserId, unauthorized } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const notifList = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const [{ count: unreadCount }] = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return NextResponse.json({ notifications: notifList, unreadCount });
}

export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const body = await req.json();

  if (body.markAllRead) {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  } else if (body.id) {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, body.id));
  }

  return NextResponse.json({ success: true });
}
