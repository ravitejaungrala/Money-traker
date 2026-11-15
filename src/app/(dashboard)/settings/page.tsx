"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Smartphone, Mail, Bell, Database, Key, Globe, Info,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
              <p className="font-medium">{session?.user?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="font-medium">{session?.user?.email || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last changed: Never</p>
            </div>
            <Badge variant="outline">Change</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add extra security to your account</p>
            </div>
            <Badge variant="warning">Not enabled</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Active Sessions</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage devices logged into your account</p>
            </div>
            <Badge variant="success">1 active</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Low Balance Alerts", desc: "When balance drops below threshold", enabled: true },
            { label: "Large Transactions", desc: "Transactions above ₹10,000", enabled: true },
            { label: "Budget Exceeded", desc: "When category budget is exceeded", enabled: true },
            { label: "Monthly Summary", desc: "Monthly financial report", enabled: false },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pref.desc}</p>
              </div>
              <Badge variant={pref.enabled ? "success" : "outline"}>
                {pref.enabled ? "On" : "Off"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Data Sync Method</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">How transactions are imported</p>
            </div>
            <Badge>Manual Entry</Badge>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Download all your financial data</p>
            </div>
            <Badge variant="outline">Export</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">About Bank Integration</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              This app operates in <strong>read-only tracking mode</strong>. It cannot make payments or access your bank credentials.
              Transactions are imported via manual entry, CSV import, or SMS/email parsing (with your permission).
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
              Full bank integration via India&apos;s Account Aggregator (AA) ecosystem is planned for a future release,
              pending FIU licensing and regulatory approvals.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
