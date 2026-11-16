"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency } from "@/lib/utils";
import {
  FileSpreadsheet, MessageSquare, Smartphone, Upload, Shield,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Send, RefreshCw,
  Landmark, ArrowRight, Copy, Check, Globe, Zap, HelpCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";

type Tab = "csv" | "sms" | "auto";

export default function ConnectPage() {
  const [tab, setTab] = useState<Tab>("csv");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Connect & Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Get your real bank transactions into FinTrack — all methods are 100% free
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
        <TabButton active={tab === "csv"} onClick={() => setTab("csv")} icon={<FileSpreadsheet className="h-4 w-4" />} label="CSV Import" />
        <TabButton active={tab === "sms"} onClick={() => setTab("sms")} icon={<MessageSquare className="h-4 w-4" />} label="SMS Paste" />
        <TabButton active={tab === "auto"} onClick={() => setTab("auto")} icon={<Smartphone className="h-4 w-4" />} label="Auto Setup" />
      </div>

      {tab === "csv" && <CSVImportTab />}
      {tab === "sms" && <SMSPasteTab />}
      {tab === "auto" && <AutoSetupTab />}

      {/* Privacy Notice */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-300">Your Data Stays Yours</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                FinTrack never accesses your bank directly. All data comes from files you upload or SMS you share. No bank credentials, UPI PINs, or passwords are stored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/* ─── CSV IMPORT TAB ─── */

interface ImportResult {
  success: boolean;
  bank: string;
  format: string;
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  parseErrors: string[];
}

interface Account {
  id: string;
  bankName: string;
  accountNumberLast4: string;
  currentBalance: number;
}

function CSVImportTab() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.accounts || [];
        setAccounts(list);
        if (list.length === 1) setSelectedAccount(list[0].id);
      })
      .catch(() => {});
  }, []);

  async function handleUpload() {
    if (!file || !selectedAccount) return;
    setUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", selectedAccount);
    if (password) formData.append("password", password);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || "Import failed");
        if (data.parseErrors?.length) {
          setError(`${data.error}\n${data.parseErrors.join("\n")}`);
        }
      }
    } catch {
      setError("Failed to upload file");
    }
    setUploading(false);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Supported Banks */}
      <div className="grid gap-2 grid-cols-4">
        {["SBI", "HDFC", "ICICI", "Any Bank"].map((name) => (
          <div key={name} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-2 text-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0 ${
              name === "SBI" ? "bg-blue-600" : name === "HDFC" ? "bg-red-600" : name === "ICICI" ? "bg-orange-600" : "bg-gray-600"
            }`}>
              {name === "Any Bank" ? "PDF" : name}
            </div>
            <span className="text-xs font-medium hidden sm:block">{name}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Bank Statement</CardTitle>
          <CardDescription>Upload PDF or CSV downloaded from net banking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select Account */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Select Bank Account</label>
            {accounts.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedAccount === acc.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Landmark className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{acc.bankName}</p>
                      <p className="text-xs text-gray-500">XXXX {acc.accountNumberLast4} &middot; {fmtCurrency(acc.currentBalance)}</p>
                    </div>
                    {selectedAccount === acc.id && <CheckCircle2 className="h-4 w-4 text-blue-600 ml-auto" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                No bank accounts found. Add one from the Accounts page first.
              </p>
            )}
          </div>

          {/* File Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
              file
                ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10"
                : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); setError(null); } }} />
            {file ? (
              <>
                <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400 mb-1" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); reset(); }} className="text-xs text-red-600 mt-1 underline">Remove</button>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-1" />
                <p className="font-medium text-sm">Click to upload PDF or CSV</p>
                <p className="text-xs text-gray-500">SBI, HDFC, ICICI or any bank statement</p>
              </>
            )}
          </div>

          {/* PDF Password */}
          {file?.name.toLowerCase().endsWith(".pdf") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">PDF Password (if protected)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. date of birth DDMMYYYY"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">Most banks use your date of birth or customer ID as the PDF password</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={!file || !selectedAccount || uploading} className="flex-1">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : <><ArrowRight className="h-4 w-4 mr-2" /> Import Transactions</>}
            </Button>
            {(result || error) && <Button variant="outline" onClick={reset}>Import Another</Button>}
          </div>

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800 dark:text-green-300">Import Successful</span>
                {result.bank !== "Unknown" && <Badge variant="secondary">{result.bank}</Badge>}
              </div>
              <div className="grid gap-2 grid-cols-4">
                <Stat label="Total" value={String(result.total)} />
                <Stat label="Imported" value={String(result.imported)} color="green" />
                <Stat label="Duplicates" value={String(result.duplicates)} color="amber" />
                <Stat label="Errors" value={String(result.errors)} color={result.errors > 0 ? "red" : undefined} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 p-3 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Download CSV */}
      <button onClick={() => setShowGuide(!showGuide)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <HelpCircle className="h-4 w-4" />
        How to download statement from your bank
        {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showGuide && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { bank: "SBI", steps: ["Login to onlinesbi.sbi.co.in", "My Accounts → Account Statement", "Select date range, format \"CSV\"", "Click View → Download"] },
            { bank: "HDFC", steps: ["Login to netbanking.hdfcbank.com", "Accounts → Statement", "Select date range", "Download as \"Delimited\" / CSV"] },
            { bank: "ICICI", steps: ["Login to infinity.icicibank.com", "Accounts & Deposits → Statement", "Select date range", "Download as CSV"] },
            { bank: "Others", steps: ["Login to net banking", "Go to Account Statement", "Select date range", "Download as CSV / Excel"] },
          ].map((g) => (
            <div key={g.bank} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <h4 className="font-semibold text-sm mb-1">{g.bank}</h4>
              {g.steps.map((s, i) => (
                <p key={i} className="text-xs text-gray-600 dark:text-gray-400"><span className="text-blue-600 font-medium">{i + 1}.</span> {s}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SMS PASTE TAB ─── */

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
  { label: "PhonePe", sms: "SBI: Rs.499.00 debited from A/c XX4521 on 15-11-26. UPI Ref 432156789012. PhonePe to Swiggy. Avl Bal Rs.44,731.50" },
  { label: "GPay", sms: "HDFC: Rs.5,000.00 credited to A/c XX8734 on 15-11-26. UPI Ref 987654321098. Google Pay from Rahul Kumar. Avl Bal Rs.1,33,750.00" },
  { label: "Paytm", sms: "SBI: Rs.250.00 debited from A/c XX4521. UPI Ref 111222333444. Paytm to Starbucks Coffee. Avl Bal Rs.44,481.50" },
  { label: "NEFT", sms: "Rs.85,000.00 credited to your A/c XX8734 by NEFT from TechCorp India Pvt Ltd. Ref HDFC0026112026. Avl Bal Rs.2,18,750.00" },
  { label: "Card", sms: "HDFC Bank: Rs.3,499.00 spent on your Card XX8734 at Amazon India on 15-Nov-26. Avl Bal Rs.1,25,251.00" },
];

function SMSPasteTab() {
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
      const res = await fetch("/api/webhook/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sms: smsText }) });
      setParseResult(await res.json());
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
      const res = await fetch("/api/webhook/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sms: smsText }) });
      const data = await res.json();
      setSubmitResult({
        status: data.status || (res.ok ? "created" : "error"),
        message: data.status === "duplicate" ? "Already recorded" : res.ok ? `Recorded: ${data.parsed?.type === "CREDIT" ? "+" : "-"}${fmtCurrency(data.parsed?.amount || 0)}` : data.error || "Failed",
      });
    } catch {
      setSubmitResult({ status: "error", message: "Failed to submit" });
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      {/* Supported Apps */}
      <div className="grid gap-2 grid-cols-4">
        {[
          { name: "PhonePe", color: "bg-purple-600" },
          { name: "GPay", color: "bg-blue-500" },
          { name: "Paytm", color: "bg-sky-500" },
          { name: "BHIM", color: "bg-green-600" },
        ].map((app) => (
          <div key={app.name} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${app.color} text-white text-xs font-bold shrink-0`}>
              {app.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs truncate">{app.name}</p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> OK</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste Bank SMS</CardTitle>
          <CardDescription>Copy a bank transaction SMS from your phone and paste it here</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 self-center">Samples:</span>
            {SAMPLE_SMS.map((s) => (
              <button key={s.label} onClick={() => { setSmsText(s.sms); setParseResult(null); setSubmitResult(null); }} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            value={smsText}
            onChange={(e) => { setSmsText(e.target.value); setParseResult(null); setSubmitResult(null); }}
            placeholder="Paste your bank SMS here..."
            rows={3}
            className="flex w-full rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="flex gap-2">
            <Button onClick={testParse} disabled={!smsText.trim() || parsing} variant="outline">
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Test Parse
            </Button>
            <Button onClick={submitTransaction} disabled={!smsText.trim() || submitting || !parseResult?.success}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Record
            </Button>
          </div>

          {parseResult && (
            <div className={`rounded-lg border p-4 ${parseResult.success ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"}`}>
              {parseResult.success && parseResult.parsed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800 dark:text-green-300">Parsed</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Type" value={parseResult.parsed.type} highlight={parseResult.parsed.type === "CREDIT" ? "green" : "red"} />
                    <Field label="Amount" value={fmtCurrency(parseResult.parsed.amount)} />
                    <Field label="Account" value={`XXXX ${parseResult.parsed.accountLast4}`} />
                    <Field label="Method" value={parseResult.parsed.paymentMethod} />
                    {parseResult.parsed.upiApp && <Field label="UPI App" value={parseResult.parsed.upiApp} />}
                    {parseResult.parsed.merchantName && <Field label="Merchant" value={parseResult.parsed.merchantName} />}
                    <Field label="Category" value={parseResult.parsed.category} />
                    {parseResult.parsed.referenceId && <Field label="Ref" value={parseResult.parsed.referenceId} />}
                    {parseResult.parsed.balance !== undefined && <Field label="Balance" value={fmtCurrency(parseResult.parsed.balance)} />}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 dark:text-red-300">{parseResult.error || "Could not parse"}</span>
                </div>
              )}
            </div>
          )}

          {submitResult && (
            <div className={`rounded-lg border p-3 flex items-center gap-2 ${
              submitResult.status === "created" ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10"
              : submitResult.status === "duplicate" ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
            }`}>
              {submitResult.status === "created" ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              : submitResult.status === "duplicate" ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              : <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
              <span className="text-sm">{submitResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── AUTO SETUP TAB ─── */

function AutoSetupTab() {
  return (
    <div className="space-y-4">
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm text-green-800 dark:text-green-300">Fully Automatic & Free</h3>
            <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
              Deploy FinTrack online, then set up MacroDroid on your phone. Every PhonePe/GPay/Paytm payment auto-records.
            </p>
          </div>
        </CardContent>
      </Card>

      <CollapsibleSection title="Step 1: Deploy on Vercel (Free)" icon={<Globe className="h-5 w-5" />} defaultOpen>
        <DeployGuide />
      </CollapsibleSection>

      <CollapsibleSection title="Step 2: MacroDroid SMS Automation" icon={<Smartphone className="h-5 w-5" />}>
        <MacroDroidGuide />
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="text-gray-500">{icon}</div>
            <CardTitle className="text-base flex-1">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">Free</Badge>
            {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </CardHeader>
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg bg-gray-900 dark:bg-gray-950 p-3 font-mono text-xs text-green-400 overflow-x-auto">
      <pre className="whitespace-pre-wrap pr-8">{text}</pre>
      <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-2 right-2 p-1 rounded bg-gray-800 hover:bg-gray-700">
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold shrink-0 mt-0.5">{n}</div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}

function DeployGuide() {
  return (
    <div className="space-y-3">
      <Step n={1} title="Push Code to GitHub">
        <CopyBlock text={`git remote add origin https://github.com/YOUR_USERNAME/fintrack.git\ngit push -u origin master`} />
      </Step>
      <Step n={2} title="Deploy on Vercel">
        <p className="text-sm text-gray-600 dark:text-gray-400">Go to vercel.com → Import GitHub repo → Deploy. Free tier: unlimited deploys.</p>
      </Step>
      <Step n={3} title="Add Neon Database (Free)">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sign up at neon.tech (free) → Create project → Copy connection string.</p>
        <CopyBlock text="DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb" />
      </Step>
      <Step n={4} title="Set Environment Variables">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">In Vercel → Settings → Environment Variables:</p>
        <CopyBlock text={`NEXTAUTH_SECRET=your-random-secret-key\nNEXTAUTH_URL=https://your-app.vercel.app\nDATABASE_URL=your-neon-connection-string`} />
      </Step>
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3">
        <p className="text-xs text-amber-800 dark:text-amber-300"><strong>Cost:</strong> Vercel free (100GB/month) + Neon free (512MB DB) = ₹0</p>
      </div>
    </div>
  );
}

function MacroDroidGuide() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        MacroDroid (free Android app) auto-forwards every bank SMS to FinTrack.
      </p>
      <Step n={1} title="Install MacroDroid">
        <p className="text-sm text-gray-600 dark:text-gray-400">Download from Google Play Store (free). Grant SMS permission.</p>
      </Step>
      <Step n={2} title="Create Macro">
        <p className="text-sm text-gray-600 dark:text-gray-400">Tap &quot;+&quot; → name it &quot;FinTrack SMS&quot;.</p>
      </Step>
      <Step n={3} title="Trigger: SMS Received">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Triggers → SMS Received → Content contains:</p>
        <CopyBlock text="debited|credited|spent|received|transferred" />
      </Step>
      <Step n={4} title="Action: HTTP Request">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actions → Connectivity → HTTP Request:</p>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2 text-xs space-y-0.5 mb-2">
          <p><strong>Method:</strong> POST</p>
          <p><strong>URL:</strong> https://your-app.vercel.app/api/webhook/sms</p>
          <p><strong>Content-Type:</strong> application/json</p>
        </div>
        <CopyBlock text={`{"sms": "{sms_text}"}`} />
      </Step>
      <Step n={5} title="Add Auth Cookie">
        <p className="text-sm text-gray-600 dark:text-gray-400">Header: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">Cookie: next-auth.session-token=YOUR_TOKEN</code></p>
        <p className="text-xs text-gray-500 mt-1">Get token: Login → DevTools → Application → Cookies</p>
      </Step>
      <Step n={6} title="Save & Test">
        <p className="text-sm text-gray-600 dark:text-gray-400">Enable the macro. Test with a small UPI payment — it should appear in seconds.</p>
      </Step>
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3">
        <p className="text-xs text-blue-800 dark:text-blue-300"><strong>Alternatives:</strong> Tasker or Automate also work with similar HTTP POST setup.</p>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  return (
    <div className="rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`font-medium text-sm mt-0.5 ${highlight === "green" ? "text-green-700 dark:text-green-400" : highlight === "red" ? "text-red-700 dark:text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const c: Record<string, string> = { green: "text-green-700 dark:text-green-400", amber: "text-amber-700 dark:text-amber-400", red: "text-red-700 dark:text-red-400" };
  return (
    <div className="rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color ? c[color] : ""}`}>{value}</p>
    </div>
  );
}
