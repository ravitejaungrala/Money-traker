import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'INR',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number_last4 TEXT NOT NULL,
    account_number_hash TEXT NOT NULL,
    account_type TEXT DEFAULT 'SAVINGS',
    ifsc_code TEXT,
    current_balance REAL DEFAULT 0,
    threshold_amount REAL DEFAULT 10000,
    is_active INTEGER DEFAULT 1,
    is_below_threshold INTEGER DEFAULT 0,
    last_synced_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'OTHER',
    description TEXT,
    merchant_name TEXT,
    payment_method TEXT DEFAULT 'OTHER',
    transaction_date TEXT NOT NULL,
    reference_id TEXT,
    source TEXT DEFAULT 'MANUAL',
    verification_status TEXT DEFAULT 'VERIFIED',
    dedup_hash TEXT NOT NULL UNIQUE,
    balance_after REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS balance_snapshots (
    id TEXT PRIMARY KEY,
    bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    balance REAL NOT NULL,
    source TEXT DEFAULT 'MANUAL',
    recorded_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit REAL NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, category, month, year)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const userId = "user_demo_1";

  sqlite.exec(`DELETE FROM notifications; DELETE FROM transactions; DELETE FROM balance_snapshots; DELETE FROM budgets; DELETE FROM bank_accounts; DELETE FROM users;`);

  sqlite.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`).run(
    userId, "demo@financeapp.com", passwordHash, "Ravi Kumar"
  );

  const sbiId = "acc_sbi_1";
  const hdfcId = "acc_hdfc_1";

  sqlite.prepare(`INSERT INTO bank_accounts (id, user_id, bank_name, account_number_last4, account_number_hash, account_type, ifsc_code, current_balance, threshold_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(sbiId, userId, "State Bank of India", "4521", "hash_sbi_4521", "SAVINGS", "SBIN0001234", 45230.50, 10000);

  sqlite.prepare(`INSERT INTO bank_accounts (id, user_id, bank_name, account_number_last4, account_number_hash, account_type, ifsc_code, current_balance, threshold_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(hdfcId, userId, "HDFC Bank", "8734", "hash_hdfc_8734", "SAVINGS", "HDFC0005678", 128750.00, 10000);

  const now = new Date();
  const txData = [
    { bankAccountId: sbiId, amount: 55000, type: "CREDIT", category: "SALARY", description: "Monthly Salary - Nov 2026", merchantName: "TechCorp India", paymentMethod: "NEFT", daysAgo: 14 },
    { bankAccountId: sbiId, amount: 2500, type: "DEBIT", category: "FOOD", description: "Swiggy Order", merchantName: "Swiggy", paymentMethod: "UPI", daysAgo: 13 },
    { bankAccountId: sbiId, amount: 1200, type: "DEBIT", category: "TRANSPORT", description: "Uber Rides", merchantName: "Uber India", paymentMethod: "UPI", daysAgo: 12 },
    { bankAccountId: sbiId, amount: 15000, type: "DEBIT", category: "RENT", description: "House Rent - Nov", merchantName: "Landlord", paymentMethod: "NEFT", daysAgo: 10 },
    { bankAccountId: sbiId, amount: 3500, type: "DEBIT", category: "BILLS", description: "Electricity Bill", merchantName: "BESCOM", paymentMethod: "UPI", daysAgo: 8 },
    { bankAccountId: hdfcId, amount: 85000, type: "CREDIT", category: "SALARY", description: "Freelance Payment", merchantName: "Client ABC", paymentMethod: "IMPS", daysAgo: 11 },
    { bankAccountId: hdfcId, amount: 4500, type: "DEBIT", category: "SHOPPING", description: "Amazon Purchase", merchantName: "Amazon India", paymentMethod: "CARD", daysAgo: 9 },
    { bankAccountId: hdfcId, amount: 8000, type: "DEBIT", category: "EMI", description: "Car Loan EMI", merchantName: "HDFC Auto Loans", paymentMethod: "NEFT", daysAgo: 7 },
    { bankAccountId: hdfcId, amount: 1500, type: "DEBIT", category: "ENTERTAINMENT", description: "Netflix + Spotify", merchantName: "Netflix", paymentMethod: "CARD", daysAgo: 5 },
    { bankAccountId: sbiId, amount: 750, type: "DEBIT", category: "FOOD", description: "Zomato Order", merchantName: "Zomato", paymentMethod: "UPI", daysAgo: 4 },
    { bankAccountId: hdfcId, amount: 2200, type: "DEBIT", category: "HEALTH", description: "Apollo Pharmacy", merchantName: "Apollo Pharmacy", paymentMethod: "UPI", daysAgo: 3 },
    { bankAccountId: sbiId, amount: 5000, type: "CREDIT", category: "TRANSFER", description: "Transfer from HDFC", merchantName: "Self Transfer", paymentMethod: "IMPS", daysAgo: 2 },
    { bankAccountId: sbiId, amount: 350, type: "DEBIT", category: "FOOD", description: "Coffee + Snacks", merchantName: "Starbucks", paymentMethod: "UPI", daysAgo: 1 },
    { bankAccountId: hdfcId, amount: 12000, type: "DEBIT", category: "SHOPPING", description: "Myntra Shopping", merchantName: "Myntra", paymentMethod: "CARD", daysAgo: 1 },
    { bankAccountId: sbiId, amount: 800, type: "DEBIT", category: "TRANSPORT", description: "Metro Card Recharge", merchantName: "BMRCL", paymentMethod: "UPI", daysAgo: 0 },
    { bankAccountId: hdfcId, amount: 3000, type: "DEBIT", category: "EDUCATION", description: "Udemy Courses", merchantName: "Udemy", paymentMethod: "CARD", daysAgo: 0 },
  ];

  const stmt = sqlite.prepare(`INSERT INTO transactions (id, user_id, bank_account_id, amount, type, category, description, merchant_name, payment_method, transaction_date, source, verification_status, dedup_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  for (const tx of txData) {
    const txDate = new Date(now);
    txDate.setDate(txDate.getDate() - tx.daysAgo);
    const id = crypto.randomUUID();
    const dedupHash = `seed_${tx.bankAccountId}_${tx.amount}_${tx.daysAgo}_${tx.category}`;
    stmt.run(id, userId, tx.bankAccountId, tx.amount, tx.type, tx.category, tx.description, tx.merchantName, tx.paymentMethod, txDate.toISOString(), "MANUAL", "VERIFIED", dedupHash);
  }

  sqlite.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), userId, "NEW_CREDIT", "Money Received", "You received ₹55,000 from TechCorp India (Salary)");

  sqlite.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), userId, "LARGE_TRANSACTION", "Large Transaction", "Payment of ₹15,000 made for House Rent - Nov");

  // Add some budgets for current month
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const budgetStmt = sqlite.prepare(`INSERT OR REPLACE INTO budgets (id, user_id, category, monthly_limit, month, year) VALUES (?, ?, ?, ?, ?, ?)`);
  budgetStmt.run(crypto.randomUUID(), userId, "FOOD", 5000, month, year);
  budgetStmt.run(crypto.randomUUID(), userId, "SHOPPING", 10000, month, year);
  budgetStmt.run(crypto.randomUUID(), userId, "TRANSPORT", 3000, month, year);
  budgetStmt.run(crypto.randomUUID(), userId, "ENTERTAINMENT", 2000, month, year);
  budgetStmt.run(crypto.randomUUID(), userId, "BILLS", 5000, month, year);

  console.log("Seed completed: 1 user, 2 bank accounts, 16 transactions, 5 budgets, 2 notifications");
}

main().then(() => sqlite.close()).catch((e) => { console.error(e); process.exit(1); });
