import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtDDMMYY(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd-MM-yy");
}

export function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function maskAccountNumber(last4: string): string {
  return `XXXX XXXX ${last4}`;
}

export function generateDedupHash(
  accountId: string,
  amount: number,
  date: string,
  referenceId?: string
): string {
  const raw = `${accountId}|${amount}|${date}|${referenceId || ""}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export const CATEGORIES = [
  { value: "FOOD", label: "Food & Restaurants", icon: "🍽️" },
  { value: "SHOPPING", label: "Shopping", icon: "🛍️" },
  { value: "TRANSPORT", label: "Transportation", icon: "🚗" },
  { value: "RENT", label: "Rent & Accommodation", icon: "🏠" },
  { value: "EMI", label: "EMI & Loans", icon: "🏦" },
  { value: "BILLS", label: "Bills & Utilities", icon: "💡" },
  { value: "HEALTH", label: "Healthcare", icon: "🏥" },
  { value: "ENTERTAINMENT", label: "Entertainment", icon: "🎬" },
  { value: "EDUCATION", label: "Education", icon: "📚" },
  { value: "SALARY", label: "Salary & Income", icon: "💰" },
  { value: "TRANSFER", label: "Transfers", icon: "🔄" },
  { value: "INVESTMENT", label: "Investments", icon: "📈" },
  { value: "OTHER", label: "Other", icon: "📋" },
] as const;

export const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI" },
  { value: "PHONEPE", label: "PhonePe" },
  { value: "GPAY", label: "Google Pay" },
  { value: "PAYTM", label: "Paytm" },
  { value: "IMPS", label: "IMPS" },
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
] as const;

export function getCategoryInfo(value: string) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}
