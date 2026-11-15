import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  currency: text("currency").default("INR"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const bankAccounts = sqliteTable("bank_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  accountNumberLast4: text("account_number_last4").notNull(),
  accountNumberHash: text("account_number_hash").notNull(),
  accountType: text("account_type").default("SAVINGS"),
  ifscCode: text("ifsc_code"),
  currentBalance: real("current_balance").default(0),
  thresholdAmount: real("threshold_amount").default(10000),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isBelowThreshold: integer("is_below_threshold", { mode: "boolean" }).default(false),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bankAccountId: text("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  type: text("type").notNull(), // CREDIT or DEBIT
  category: text("category").default("OTHER"),
  description: text("description"),
  merchantName: text("merchant_name"),
  paymentMethod: text("payment_method").default("OTHER"),
  transactionDate: text("transaction_date").notNull(),
  referenceId: text("reference_id"),
  source: text("source").default("MANUAL"),
  verificationStatus: text("verification_status").default("VERIFIED"),
  dedupHash: text("dedup_hash").notNull().unique(),
  balanceAfter: real("balance_after"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const balanceSnapshots = sqliteTable("balance_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  bankAccountId: text("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
  balance: real("balance").notNull(),
  source: text("source").default("MANUAL"),
  recordedAt: text("recorded_at").default(sql`(datetime('now'))`),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  monthlyLimit: real("monthly_limit").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
