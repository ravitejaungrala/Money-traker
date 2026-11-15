"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { fmtCurrency, fmtDDMMYY, maskAccountNumber } from "@/lib/utils";
import { Plus, Landmark, AlertTriangle, CheckCircle2, Settings } from "lucide-react";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumberLast4: string;
  accountType: string;
  ifscCode: string | null;
  currentBalance: number;
  thresholdAmount: number;
  isBelowThreshold: boolean;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

const BANK_NAMES = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India",
  "IndusInd Bank", "Yes Bank", "IDBI Bank", "Federal Bank", "Bank of India", "Other",
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [thresholdDialog, setThresholdDialog] = useState<string | null>(null);

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { loadAccounts(); }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const alertAccounts = accounts.filter((a) => a.isBelowThreshold);

  async function updateThreshold(accountId: string, threshold: number) {
    await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholdAmount: threshold }),
    });
    setThresholdDialog(null);
    loadAccounts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Bank Accounts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} &middot; Total: {fmtCurrency(totalBalance)}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Account</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <AddAccountForm
              onSuccess={() => { setDialogOpen(false); loadAccounts(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {alertAccounts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">
                {alertAccounts.length} account{alertAccounts.length !== 1 ? "s" : ""} below minimum threshold
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Review your balances and consider adding funds.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Landmark className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No bank accounts added</p>
            <p className="text-sm mt-1">Add your first bank account to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className={account.isBelowThreshold ? "border-red-200 dark:border-red-800" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      account.isBelowThreshold
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-blue-100 dark:bg-blue-900/30"
                    }`}>
                      <Landmark className={`h-5 w-5 ${
                        account.isBelowThreshold
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.bankName}</CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {maskAccountNumber(account.accountNumberLast4)} &middot; {account.accountType}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setThresholdDialog(account.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-2xl font-bold">{fmtCurrency(account.currentBalance)}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Min. Threshold</span>
                  <span className="font-medium">{fmtCurrency(account.thresholdAmount)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {account.isBelowThreshold ? (
                    <Badge variant="danger">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Below threshold — need {fmtCurrency(account.thresholdAmount - account.currentBalance)}
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Healthy
                    </Badge>
                  )}
                </div>

                {account.ifscCode && (
                  <p className="text-xs text-gray-400">IFSC: {account.ifscCode}</p>
                )}
                <p className="text-xs text-gray-400">
                  Added: {fmtDDMMYY(account.createdAt)}
                  {account.lastSyncedAt && ` · Last sync: ${fmtDDMMYY(account.lastSyncedAt)}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {thresholdDialog && (
        <ThresholdDialog
          account={accounts.find((a) => a.id === thresholdDialog)!}
          onClose={() => setThresholdDialog(null)}
          onSave={updateThreshold}
        />
      )}
    </div>
  );
}

function ThresholdDialog({
  account, onClose, onSave,
}: {
  account: BankAccount;
  onClose: () => void;
  onSave: (id: string, threshold: number) => void;
}) {
  const [threshold, setThreshold] = useState(account.thresholdAmount.toString());

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Balance Threshold</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {account.bankName} ({maskAccountNumber(account.accountNumberLast4)})
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Balance Threshold (₹)</label>
          <Input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            min="0"
            step="1000"
          />
          <p className="text-xs text-gray-400">
            You&apos;ll be alerted when your balance falls below this amount.
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(account.id, parseFloat(threshold))}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      bankName: form.get("bankName"),
      accountNumberLast4: form.get("accountNumberLast4"),
      accountType: form.get("accountType"),
      ifscCode: form.get("ifscCode") || undefined,
      currentBalance: parseFloat(form.get("currentBalance") as string) || 0,
      thresholdAmount: parseFloat(form.get("thresholdAmount") as string) || 10000,
    };

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add account");
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Bank Name</label>
        <select name="bankName" required className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
          <option value="">Select bank</option>
          {BANK_NAMES.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Last 4 Digits</label>
          <Input name="accountNumberLast4" maxLength={4} minLength={4} pattern="\d{4}" placeholder="4521" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Account Type</label>
          <select name="accountType" className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            <option value="SAVINGS">Savings</option>
            <option value="CURRENT">Current</option>
            <option value="SALARY">Salary</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">IFSC Code (Optional)</label>
        <Input name="ifscCode" placeholder="SBIN0001234" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Current Balance (₹)</label>
          <Input name="currentBalance" type="number" step="0.01" placeholder="0.00" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Alert Threshold (₹)</label>
          <Input name="thresholdAmount" type="number" step="1000" placeholder="10000" defaultValue="10000" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Adding..." : "Add Account"}
      </Button>
    </form>
  );
}
