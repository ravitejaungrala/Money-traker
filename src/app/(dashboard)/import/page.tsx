"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency, fmtDDMMYY } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Download, Landmark, ArrowRight, HelpCircle,
} from "lucide-react";

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

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        if (data.accounts?.length === 1) setSelectedAccount(data.accounts[0].id);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Import Bank Statement</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload CSV files from SBI, HDFC, ICICI, or any Indian bank
        </p>
      </div>

      {/* Supported Banks */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { name: "SBI", color: "bg-blue-600" },
          { name: "HDFC", color: "bg-red-600" },
          { name: "ICICI", color: "bg-orange-600" },
          { name: "Any Bank", color: "bg-gray-600" },
        ].map((bank) => (
          <div key={bank.name} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bank.color} text-white text-xs font-bold`}>
              {bank.name === "Any Bank" ? "CSV" : bank.name.slice(0, 3)}
            </div>
            <div>
              <p className="font-medium text-sm">{bank.name}</p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Supported
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload CSV Statement
          </CardTitle>
          <CardDescription>
            Download your bank statement as CSV from net banking, then upload it here
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Select Account */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">1. Select Bank Account</label>
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
                    <Landmark className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">{acc.bankName}</p>
                      <p className="text-xs text-gray-500">XXXX {acc.accountNumberLast4} &middot; {fmtCurrency(acc.currentBalance)}</p>
                    </div>
                    {selectedAccount === acc.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  No bank accounts found. Add a bank account first from the Accounts page.
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Upload File */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">2. Choose CSV File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                file
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/10"
                  : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/10"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); setResult(null); setError(null); }
                }}
              />
              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-green-600 dark:text-green-400 mb-2" />
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="text-xs text-red-600 mt-2 underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="font-medium text-sm">Click to upload CSV</p>
                  <p className="text-xs text-gray-500 mt-1">Supports SBI, HDFC, ICICI and other bank formats</p>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Import */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || !selectedAccount || uploading}
              className="flex-1"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><ArrowRight className="h-4 w-4 mr-2" /> Import Transactions</>
              )}
            </Button>
            {(result || error) && (
              <Button variant="outline" onClick={reset}>
                Import Another
              </Button>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-800 dark:text-green-300">Import Successful</span>
                {result.bank !== "Unknown" && (
                  <Badge variant="secondary">{result.bank} format</Badge>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <ResultStat label="Total Rows" value={String(result.total)} />
                <ResultStat label="Imported" value={String(result.imported)} color="green" />
                <ResultStat label="Duplicates" value={String(result.duplicates)} color="amber" />
                <ResultStat label="Errors" value={String(result.errors)} color={result.errors > 0 ? "red" : undefined} />
              </div>
              {result.parseErrors.length > 0 && (
                <div className="rounded-md bg-amber-100 dark:bg-amber-900/20 p-2 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Warnings:</p>
                  {result.parseErrors.slice(0, 5).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                  {result.parseErrors.length > 5 && (
                    <p>...and {result.parseErrors.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-red-800 dark:text-red-300">Import Failed</span>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Download CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5" /> How to Download Bank Statement CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              bank: "SBI",
              steps: [
                "Login to onlinesbi.sbi.co.in",
                "Go to My Accounts → Account Statement",
                "Select date range and format as \"Excel\" or \"CSV\"",
                "Click \"View\" then \"Download\"",
              ],
            },
            {
              bank: "HDFC Bank",
              steps: [
                "Login to netbanking.hdfcbank.com",
                "Go to Accounts → Savings Account → Statement",
                "Select date range",
                "Click \"Download\" and choose \"Delimited\" or \"CSV\"",
              ],
            },
            {
              bank: "ICICI Bank",
              steps: [
                "Login to infinity.icicibank.com",
                "Go to Accounts & Deposits → Account Statement",
                "Select date range",
                "Click \"Download\" and choose \"CSV\" format",
              ],
            },
            {
              bank: "Other Banks",
              steps: [
                "Login to your bank's net banking portal",
                "Navigate to Account Statement section",
                "Select your desired date range",
                "Download as CSV or Excel format",
              ],
            },
          ].map((guide) => (
            <div key={guide.bank} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <h4 className="font-semibold text-sm mb-2">{guide.bank}</h4>
              <ol className="space-y-1">
                {guide.steps.map((step, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                    <span className="text-blue-600 dark:text-blue-400 font-medium shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "text-green-700 dark:text-green-400",
    amber: "text-amber-700 dark:text-amber-400",
    red: "text-red-700 dark:text-red-400",
  };
  return (
    <div className="rounded-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color ? colorMap[color] : ""}`}>{value}</p>
    </div>
  );
}
