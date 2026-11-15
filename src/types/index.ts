export type TransactionType = "CREDIT" | "DEBIT";

export type TransactionSource = "MANUAL" | "SMS" | "EMAIL" | "IMPORT";

export type VerificationStatus = "VERIFIED" | "PENDING" | "FAILED";

export type PaymentMethod = "UPI" | "IMPS" | "NEFT" | "RTGS" | "CARD" | "CASH" | "OTHER";

export type NotificationType =
  | "LOW_BALANCE"
  | "BALANCE_RECOVERED"
  | "LARGE_TRANSACTION"
  | "BUDGET_EXCEEDED"
  | "NEW_CREDIT"
  | "NEW_DEBIT"
  | "SYNC_FAILED";

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  todayIncome: number;
  todayExpenses: number;
  accountCount: number;
  unreadNotifications: number;
}

export interface AccountSummary {
  id: string;
  bankName: string;
  accountNumberLast4: string;
  accountType: string;
  currentBalance: number;
  thresholdAmount: number;
  isBelowThreshold: boolean;
  lastSyncedAt: string | null;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  bankAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}
