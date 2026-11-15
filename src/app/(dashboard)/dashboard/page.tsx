"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency, fmtDDMMYY, getCategoryInfo, maskAccountNumber } from "@/lib/utils";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark,
  ArrowUpRight, ArrowDownRight, AlertTriangle, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { DashboardStats, AccountSummary, CategorySpending, MonthlyTrend } from "@/types";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [recentTx, setRecentTx] = useState<Array<{
    id: string; amount: number; type: string; category: string;
    description: string | null; merchantName: string | null;
    transactionDate: string; bankAccount: { bankName: string; accountNumberLast4: string };
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, txRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/transactions?limit=5"),
        ]);
        const analyticsData = await analyticsRes.json();
        const txData = await txRes.json();

        setStats(analyticsData.dashboard);
        setAccounts(analyticsData.accounts);
        setCategories(analyticsData.categoryBreakdown);
        setTrends(analyticsData.trends);
        setRecentTx(txData.transactions);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return <div className="text-center text-gray-500 py-20">Failed to load dashboard data</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Balance"
          value={fmtCurrency(stats.totalBalance)}
          icon={<Wallet className="h-5 w-5" />}
          subtitle={`${stats.accountCount} account${stats.accountCount !== 1 ? "s" : ""}`}
          color="blue"
        />
        <StatCard
          title="Monthly Income"
          value={fmtCurrency(stats.monthlyIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle={`Today: ${fmtCurrency(stats.todayIncome)}`}
          color="green"
        />
        <StatCard
          title="Monthly Expenses"
          value={fmtCurrency(stats.monthlyExpenses)}
          icon={<TrendingDown className="h-5 w-5" />}
          subtitle={`Today: ${fmtCurrency(stats.todayExpenses)}`}
          color="red"
        />
        <StatCard
          title="Monthly Savings"
          value={fmtCurrency(stats.monthlySavings)}
          icon={<PiggyBank className="h-5 w-5" />}
          subtitle={stats.monthlySavings >= 0 ? "On track" : "Overspending"}
          color={stats.monthlySavings >= 0 ? "emerald" : "amber"}
        />
      </div>

      {accounts.some((a) => a.isBelowThreshold) && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-4 p-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Low Balance Alert</p>
              {accounts.filter((a) => a.isBelowThreshold).map((a) => (
                <p key={a.id} className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {a.bankName} ({maskAccountNumber(a.accountNumberLast4)}): {fmtCurrency(a.currentBalance)} — below {fmtCurrency(a.thresholdAmount)} threshold.
                  Need {fmtCurrency(a.thresholdAmount - a.currentBalance)} more.
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Income vs Expenses (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trends} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => fmtCurrency(value)}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="amount" nameKey="category">
                    {categories.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmtCurrency(value)} />
                  <Legend
                    formatter={(value: string) => getCategoryInfo(value).label}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">No expenses yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length > 0 ? (
              <div className="space-y-3">
                {recentTx.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${
                        tx.type === "CREDIT"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {tx.type === "CREDIT"
                          ? <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                          : <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.merchantName || "Transaction"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tx.bankAccount.bankName} &middot; {fmtDDMMYY(tx.transactionDate)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      tx.type === "CREDIT" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {tx.type === "CREDIT" ? "+" : "-"}{fmtCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No transactions yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">{account.bankName}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {maskAccountNumber(account.accountNumberLast4)}
                </p>
                <p className="text-lg font-bold">{fmtCurrency(account.currentBalance)}</p>
                {account.isBelowThreshold && (
                  <Badge variant="danger" className="mt-2">Below threshold</Badge>
                )}
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-center text-gray-400 py-4">No accounts added</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, subtitle, color,
}: {
  title: string; value: string; icon: React.ReactNode; subtitle: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
