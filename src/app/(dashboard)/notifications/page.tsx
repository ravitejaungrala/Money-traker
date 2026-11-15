"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDDMMYY } from "@/lib/utils";
import {
  Bell, AlertTriangle, CheckCircle2, ArrowDownRight, ArrowUpRight,
  CreditCard, PiggyBank, RefreshCw, Check, Trash2,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const iconMap: Record<string, React.ReactNode> = {
  LOW_BALANCE: <AlertTriangle className="h-5 w-5 text-red-500" />,
  BALANCE_RECOVERED: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  LARGE_TRANSACTION: <CreditCard className="h-5 w-5 text-amber-500" />,
  BUDGET_EXCEEDED: <PiggyBank className="h-5 w-5 text-red-500" />,
  NEW_CREDIT: <ArrowDownRight className="h-5 w-5 text-green-500" />,
  NEW_DEBIT: <ArrowUpRight className="h-5 w-5 text-red-500" />,
  SYNC_FAILED: <RefreshCw className="h-5 w-5 text-gray-500" />,
};

const typeColors: Record<string, "danger" | "success" | "warning" | "default"> = {
  LOW_BALANCE: "danger",
  BALANCE_RECOVERED: "success",
  LARGE_TRANSACTION: "warning",
  BUDGET_EXCEEDED: "danger",
  NEW_CREDIT: "success",
  NEW_DEBIT: "default",
  SYNC_FAILED: "default",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4 mr-2" />Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">You&apos;re all caught up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={!n.isRead ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20" : ""}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="mt-0.5 shrink-0">
                  {iconMap[n.type] || <Bell className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <Badge variant={typeColors[n.type] || "default"} className="text-[10px]">
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{fmtDDMMYY(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} className="shrink-0">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
