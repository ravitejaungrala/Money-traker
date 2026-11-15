"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { fmtCurrency, fmtDDMMYY, getCategoryInfo, CATEGORIES, PAYMENT_METHODS } from "@/lib/utils";
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, Filter, Download, ChevronLeft, ChevronRight,
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  merchantName: string | null;
  paymentMethod: string;
  transactionDate: string;
  referenceId: string | null;
  source: string;
  verificationStatus: string;
  bankAccount: { bankName: string; accountNumberLast4: string };
}

interface Account {
  id: string;
  bankName: string;
  accountNumberLast4: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "15");
    if (filterType) params.set("type", filterType);
    if (filterCategory) params.set("category", filterCategory);
    if (filterAccount) params.set("bankAccountId", filterAccount);
    if (filterSearch) params.set("search", filterSearch);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setTotal(data.total);
    setPages(data.pages);
    setLoading(false);
  }, [page, filterType, filterCategory, filterAccount, filterSearch, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  function clearFilters() {
    setFilterType("");
    setFilterCategory("");
    setFilterAccount("");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(1);
  }

  async function exportCSV() {
    const params = new URLSearchParams();
    params.set("limit", "1000");
    if (filterType) params.set("type", filterType);
    if (filterCategory) params.set("category", filterCategory);
    if (filterAccount) params.set("bankAccountId", filterAccount);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();

    const header = "Date,Type,Category,Description,Amount,Payment Method,Bank,Account,Status\n";
    const rows = data.transactions
      .map((tx: Transaction) =>
        `${fmtDDMMYY(tx.transactionDate)},${tx.type},${getCategoryInfo(tx.category).label},"${tx.description || ""}",${tx.amount},${tx.paymentMethod},${tx.bankAccount.bankName},XXXX ${tx.bankAccount.accountNumberLast4},${tx.verificationStatus}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${fmtDDMMYY(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Transactions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              <AddTransactionForm
                accounts={accounts}
                onSuccess={() => { setDialogOpen(false); loadTransactions(); }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Filter className="h-4 w-4" /> Filters
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={filterSearch}
                onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
                <SelectItem value="DEBIT">Debit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.bankName} (XXXX {a.accountNumberLast4})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters} className="self-center">Clear</Button>
          </div>
          <div className="flex gap-3 mt-3">
            <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} className="max-w-[160px]" />
            <span className="self-center text-gray-400 text-sm">to</span>
            <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} className="max-w-[160px]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p>No transactions found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const cat = getCategoryInfo(tx.category);
                    return (
                      <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3 whitespace-nowrap">{fmtDDMMYY(tx.transactionDate)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-md text-xs shrink-0 ${
                              tx.type === "CREDIT" ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                            }`}>
                              {tx.type === "CREDIT"
                                ? <ArrowDownRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                : <ArrowUpRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{tx.description || tx.merchantName || "Transaction"}</p>
                              {tx.merchantName && tx.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.merchantName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{cat.icon} {cat.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {tx.bankAccount.bankName}<br />XXXX {tx.bankAccount.accountNumberLast4}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{tx.paymentMethod}</Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                          tx.type === "CREDIT" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {tx.type === "CREDIT" ? "+" : "-"}{fmtCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tx.verificationStatus === "VERIFIED" ? "success" : "warning"}>
                            {tx.verificationStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddTransactionForm({ accounts, onSuccess }: { accounts: Account[]; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      bankAccountId: form.get("bankAccountId"),
      amount: parseFloat(form.get("amount") as string),
      type: form.get("type"),
      category: form.get("category"),
      description: form.get("description") || undefined,
      merchantName: form.get("merchantName") || undefined,
      paymentMethod: form.get("paymentMethod"),
      transactionDate: form.get("transactionDate"),
    };

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add transaction");
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Account</label>
          <select name="bankAccountId" required className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bankName} (XXXX {a.accountNumberLast4})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <select name="type" required className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            <option value="DEBIT">Debit (Expense)</option>
            <option value="CREDIT">Credit (Income)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount (₹)</label>
          <Input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date</label>
          <Input name="transactionDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Input name="description" placeholder="What was this for?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <select name="category" className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Payment Method</label>
          <select name="paymentMethod" className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Merchant / Recipient</label>
        <Input name="merchantName" placeholder="Who did you pay / receive from?" />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Adding..." : "Add Transaction"}
      </Button>
    </form>
  );
}
