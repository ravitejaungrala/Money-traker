"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtCurrency, getCategoryInfo } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import type { CategorySpending, MonthlyTrend } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

export default function AnalyticsPage() {
  const [data, setData] = useState<{
    dashboard: { monthlyIncome: number; monthlyExpenses: number; monthlySavings: number };
    categoryBreakdown: CategorySpending[];
    trends: MonthlyTrend[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading analytics...</div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Failed to load data</div>;

  const { dashboard, categoryBreakdown, trends } = data;
  const currentMonth = trends[trends.length - 1];
  const previousMonth = trends[trends.length - 2];

  const expenseChange = previousMonth && previousMonth.expenses > 0
    ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
    : 0;

  const incomeChange = previousMonth && previousMonth.income > 0
    ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Financial Analytics</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</p>
            <p className="text-2xl font-bold mt-1">{fmtCurrency(dashboard.monthlyIncome)}</p>
            {incomeChange !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${incomeChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {incomeChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {Math.abs(incomeChange).toFixed(1)}% vs last month
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Expenses</p>
            <p className="text-2xl font-bold mt-1">{fmtCurrency(dashboard.monthlyExpenses)}</p>
            {expenseChange !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${expenseChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                {expenseChange <= 0 ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                {Math.abs(expenseChange).toFixed(1)}% vs last month
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Savings</p>
            <p className={`text-2xl font-bold mt-1 ${dashboard.monthlySavings >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {fmtCurrency(dashboard.monthlySavings)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {dashboard.monthlySavings >= 0 ? "You're saving money this month" : "You're overspending this month"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income vs Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => fmtCurrency(value)} />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Expenses" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => fmtCurrency(value)} />
                <Bar dataKey="savings" name="Savings" radius={[4, 4, 0, 0]}>
                  {trends.map((entry, i) => (
                    <Cell key={i} fill={entry.savings >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="amount" nameKey="category">
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmtCurrency(value)} />
                  <Legend formatter={(value: string) => getCategoryInfo(value).label} wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">No spending data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => {
                  const info = getCategoryInfo(cat.category);
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{info.icon} {info.label}</span>
                        <span className="text-sm font-semibold">{fmtCurrency(cat.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-gray-400">{cat.count} transaction{cat.count !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-gray-400">{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {categoryBreakdown.length > 0 && previousMonth && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryBreakdown[0] && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <TrendingUp className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Your highest spending category is <strong>{getCategoryInfo(categoryBreakdown[0].category).label}</strong> at{" "}
                    {fmtCurrency(categoryBreakdown[0].amount)} ({categoryBreakdown[0].percentage.toFixed(1)}% of expenses).
                  </p>
                </div>
              )}
              {dashboard.monthlySavings < 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                  <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    You&apos;re spending {fmtCurrency(Math.abs(dashboard.monthlySavings))} more than you&apos;re earning this month. Consider reviewing your expenses.
                  </p>
                </div>
              )}
              {expenseChange > 10 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <ArrowUp className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm">
                    Your spending is up {expenseChange.toFixed(1)}% compared to last month. Keep an eye on your budget.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
