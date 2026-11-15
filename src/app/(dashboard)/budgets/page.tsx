"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { fmtCurrency, getCategoryInfo, CATEGORIES } from "@/lib/utils";
import { Plus, PiggyBank, AlertTriangle, CheckCircle2 } from "lucide-react";

interface BudgetItem {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/budgets");
    const data = await res.json();
    setBudgets(data.budgets);
    setTotalBudget(data.totalBudget);
    setTotalSpent(data.totalSpent);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const exceeded = budgets.filter((b) => b.isExceeded);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Budget Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Set Budget</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Set Category Budget</DialogTitle>
            </DialogHeader>
            <AddBudgetForm onSuccess={() => { setDialogOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
            <p className="text-2xl font-bold mt-1">{fmtCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
            <p className="text-2xl font-bold mt-1">{fmtCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
            <p className={`text-2xl font-bold mt-1 ${totalBudget - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtCurrency(Math.max(0, totalBudget - totalSpent))}
            </p>
          </CardContent>
        </Card>
      </div>

      {exceeded.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Budget Exceeded</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {exceeded.map((b) => getCategoryInfo(b.category).label).join(", ")} — over budget this month
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-gray-400">
            <PiggyBank className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No budgets set</p>
            <p className="text-sm mt-1">Create budgets to track your spending limits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const info = getCategoryInfo(budget.category);
            const barColor = budget.isExceeded ? "bg-red-500" : budget.percentage > 80 ? "bg-amber-500" : "bg-green-500";
            return (
              <Card key={budget.id} className={budget.isExceeded ? "border-red-200 dark:border-red-800" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{info.icon}</span>
                      <span className="font-medium">{info.label}</span>
                    </div>
                    {budget.isExceeded ? (
                      <Badge variant="danger">Exceeded</Badge>
                    ) : budget.percentage > 80 ? (
                      <Badge variant="warning">Near limit</Badge>
                    ) : (
                      <Badge variant="success">On track</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Spent</span>
                      <span className="font-semibold">{fmtCurrency(budget.spent)} / {fmtCurrency(budget.monthlyLimit)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, budget.percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{budget.percentage.toFixed(0)}% used</span>
                      <span>{fmtCurrency(budget.remaining)} left</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddBudgetForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      category: form.get("category"),
      monthlyLimit: parseFloat(form.get("monthlyLimit") as string),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to set budget");
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
        <label className="text-sm font-medium">Category</label>
        <select name="category" required className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
          {CATEGORIES.filter((c) => !["SALARY", "TRANSFER"].includes(c.value)).map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Monthly Limit (₹)</label>
        <Input name="monthlyLimit" type="number" step="500" min="100" placeholder="5000" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Set Budget"}
      </Button>
    </form>
  );
}
