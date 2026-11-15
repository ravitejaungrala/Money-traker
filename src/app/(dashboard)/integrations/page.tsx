"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency } from "@/lib/utils";
import {
  Smartphone, MessageSquare, Zap, Shield, CheckCircle2, XCircle,
  ArrowRight, Send, Loader2, AlertTriangle, Radio, RefreshCw,
} from "lucide-react";

interface ParsedResult {
  amount: number;
  type: "CREDIT" | "DEBIT";
  accountLast4: string;
  referenceId?: string;
  merchantName?: string;
  paymentMethod: string;
  upiApp?: string;
  upiId?: string;
  balance?: number;
  description: string;
  category: string;
}

const SAMPLE_SMS = [
  {
    label: "PhonePe UPI Payment",
    sms: "SBI: Rs.499.00 debited from A/c XX4521 on 15-11-26. UPI Ref 432156789012. PhonePe to Swiggy. Avl Bal Rs.44,731.50",
  },
  {
    label: "GPay UPI Received",
    sms: "HDFC: Rs.5,000.00 credited to A/c XX8734 on 15-11-26. UPI Ref 987654321098. Google Pay from Rahul Kumar. Avl Bal Rs.1,33,750.00",
  },
  {
    label: "Paytm Payment",
    sms: "SBI: Rs.250.00 debited from A/c XX4521. UPI Ref 111222333444. Paytm to Starbucks Coffee. Avl Bal Rs.44,481.50",
  },
  {
    label: "NEFT Salary Credit",
    sms: "Rs.85,000.00 credited to your A/c XX8734 by NEFT from TechCorp India Pvt Ltd. Ref HDFC0026112026. Avl Bal Rs.2,18,750.00",
  },
  {
    label: "Card Purchase",
    sms: "HDFC Bank: Rs.3,499.00 spent on your Card XX8734 at Amazon India on 15-Nov-26. Avl Bal Rs.1,25,251.00",
  },
];

export default function IntegrationsPage() {
  const [smsText, setSmsText] = useState("");
  const [parseResult, setParseResult] = useState<{ success: boolean; parsed?: ParsedResult; error?: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: string; message?: string } | null>(null);

  async function testParse() {
    if (!smsText.trim()) return;
    setParsing(true);
    setParseResult(null);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/webhook/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms: smsText }),
      });
      const data = await res.json();
      setParseResult(data);
    } catch {
      setParseResult({ success: false, error: "Failed to parse" });
    }
    setParsing(false);
  }

  async function submitTransaction() {
    if (!smsText.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/webhook/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms: smsText }),
      });
      const data = await res.json();
      setSubmitResult({
        status: data.status || (res.ok ? "created" : "error"),
        message: data.status === "duplicate"
          ? "This transaction was already recorded"
          : res.ok
            ? `Transaction recorded: ${data.parsed?.type === "CREDIT" ? "+" : "-"}${fmtCurrency(data.parsed?.amount || 0)}`
            : data.error || "Failed to record",
      });
    } catch {
      setSubmitResult({ status: "error", message: "Failed to submit" });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">UPI & Bank Integration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect PhonePe, Google Pay, Paytm and track transactions in real-time
        </p>
      </div>

      {/* How it Works */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-1">1. Bank Sends SMS</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Every UPI payment via PhonePe, GPay, or Paytm triggers a bank SMS
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-1">2. Smart Parser</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Our AI parser extracts amount, merchant, UPI app, category, and balance
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Radio className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-1">3. Real-Time Tracking</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transactions appear instantly in your dashboard with auto-categorization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* UPI Apps Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Supported UPI Apps
          </CardTitle>
          <CardDescription>
            Transactions from these apps are automatically detected via bank SMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "PhonePe", color: "bg-purple-600", icon: "📱", status: "Supported" },
              { name: "Google Pay", color: "bg-blue-500", icon: "💳", status: "Supported" },
              { name: "Paytm", color: "bg-sky-500", icon: "📲", status: "Supported" },
              { name: "BHIM UPI", color: "bg-green-600", icon: "🏦", status: "Supported" },
            ].map((app) => (
              <div key={app.name} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${app.color} text-white text-lg`}>
                  {app.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{app.name}</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {app.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Privacy First</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  We never access your UPI apps directly. Transactions are detected only from bank SMS notifications.
                  No bank credentials are stored. Your UPI PIN and app passwords remain private.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Test Console */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" /> SMS Transaction Parser — Test Console
          </CardTitle>
          <CardDescription>
            Paste a bank SMS to see how it gets automatically parsed into a transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Try sample:</span>
            {SAMPLE_SMS.map((s) => (
              <button
                key={s.label}
                onClick={() => { setSmsText(s.sms); setParseResult(null); setSubmitResult(null); }}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <textarea
              value={smsText}
              onChange={(e) => { setSmsText(e.target.value); setParseResult(null); setSubmitResult(null); }}
              placeholder="Paste your bank SMS here...&#10;&#10;Example: SBI: Rs.499.00 debited from A/c XX4521 on 15-11-26. UPI Ref 432156789012. PhonePe to Swiggy. Avl Bal Rs.44,731.50"
              rows={3}
              className="flex w-full rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={testParse} disabled={!smsText.trim() || parsing} variant="outline">
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Test Parse
            </Button>
            <Button onClick={submitTransaction} disabled={!smsText.trim() || submitting || !parseResult?.success}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Record Transaction
            </Button>
          </div>

          {parseResult && (
            <div className={`rounded-lg border p-4 ${
              parseResult.success
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
                : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
            }`}>
              {parseResult.success && parseResult.parsed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-800 dark:text-green-300">Successfully Parsed</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <ParsedField label="Type" value={parseResult.parsed.type} highlight={parseResult.parsed.type === "CREDIT" ? "green" : "red"} />
                    <ParsedField label="Amount" value={fmtCurrency(parseResult.parsed.amount)} />
                    <ParsedField label="Account" value={`XXXX ${parseResult.parsed.accountLast4}`} />
                    <ParsedField label="Payment Method" value={parseResult.parsed.paymentMethod} />
                    {parseResult.parsed.upiApp && <ParsedField label="UPI App" value={parseResult.parsed.upiApp} />}
                    {parseResult.parsed.merchantName && <ParsedField label="Merchant" value={parseResult.parsed.merchantName} />}
                    <ParsedField label="Category" value={parseResult.parsed.category} />
                    {parseResult.parsed.referenceId && <ParsedField label="Reference" value={parseResult.parsed.referenceId} />}
                    {parseResult.parsed.balance !== undefined && <ParsedField label="Balance After" value={fmtCurrency(parseResult.parsed.balance)} />}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-800 dark:text-red-300">{parseResult.error || "Could not parse transaction from this SMS"}</span>
                </div>
              )}
            </div>
          )}

          {submitResult && (
            <div className={`rounded-lg border p-3 flex items-center gap-2 ${
              submitResult.status === "created"
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
                : submitResult.status === "duplicate"
                  ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10"
                  : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
            }`}>
              {submitResult.status === "created" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : submitResult.status === "duplicate" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span className="text-sm">{submitResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Endpoint for Automation</CardTitle>
          <CardDescription>
            Use this webhook to send bank SMS automatically from your phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-gray-900 dark:bg-gray-950 p-4 font-mono text-sm text-green-400 overflow-x-auto">
            <p className="text-gray-500">{"// POST /api/webhook/sms"}</p>
            <p className="text-gray-500">{"// Headers: Content-Type: application/json"}</p>
            <p className="text-gray-500">{"// Cookie: next-auth session cookie"}</p>
            <p className="mt-2">{"{"}</p>
            <p className="pl-4">{'"sms": "SBI: Rs.499.00 debited from A/c XX4521..."'}</p>
            <p>{"}"}</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>How to automate:</strong> On Android, use apps like Tasker or MacroDroid to forward bank SMS
              to this webhook automatically. Every PhonePe, GPay, or Paytm payment will appear in your dashboard within seconds.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ParsedField({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  return (
    <div className="rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`font-medium text-sm mt-0.5 ${
        highlight === "green" ? "text-green-700 dark:text-green-400" :
        highlight === "red" ? "text-red-700 dark:text-red-400" : ""
      }`}>
        {value}
      </p>
    </div>
  );
}
