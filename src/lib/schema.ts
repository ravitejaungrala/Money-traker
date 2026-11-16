import mongoose, { Schema, type Document } from "mongoose";

// ─── Users ───
export interface IUser extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true, _id: false }
);

// ─── Bank Accounts ───
export interface IBankAccount extends Document {
  _id: string;
  userId: string;
  bankName: string;
  accountNumberLast4: string;
  accountNumberHash: string;
  accountType: string;
  ifscCode?: string;
  currentBalance: number;
  thresholdAmount: number;
  isActive: boolean;
  isBelowThreshold: boolean;
  lastSyncedAt?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bankAccountSchema = new Schema<IBankAccount>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    bankName: { type: String, required: true },
    accountNumberLast4: { type: String, required: true },
    accountNumberHash: { type: String, required: true },
    accountType: { type: String, default: "SAVINGS" },
    ifscCode: String,
    currentBalance: { type: Number, default: 0 },
    thresholdAmount: { type: Number, default: 10000 },
    isActive: { type: Boolean, default: true },
    isBelowThreshold: { type: Boolean, default: false },
    lastSyncedAt: String,
  },
  { timestamps: true, _id: false }
);

// ─── Transactions ───
export interface ITransaction extends Document {
  _id: string;
  userId: string;
  bankAccountId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: string;
  description?: string;
  merchantName?: string;
  paymentMethod: string;
  transactionDate: string;
  referenceId?: string;
  source: string;
  verificationStatus: string;
  dedupHash: string;
  balanceAfter?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    bankAccountId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ["CREDIT", "DEBIT"] },
    category: { type: String, default: "OTHER" },
    description: String,
    merchantName: String,
    paymentMethod: { type: String, default: "OTHER" },
    transactionDate: { type: String, required: true, index: true },
    referenceId: String,
    source: { type: String, default: "MANUAL" },
    verificationStatus: { type: String, default: "VERIFIED" },
    dedupHash: { type: String, required: true, unique: true },
    balanceAfter: Number,
    notes: String,
  },
  { timestamps: true, _id: false }
);

// ─── Balance Snapshots ───
export interface IBalanceSnapshot extends Document {
  _id: string;
  bankAccountId: string;
  balance: number;
  source: string;
  recordedAt: Date;
}

const balanceSnapshotSchema = new Schema<IBalanceSnapshot>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    bankAccountId: { type: String, required: true, index: true },
    balance: { type: Number, required: true },
    source: { type: String, default: "MANUAL" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Budgets ───
export interface IBudget extends Document {
  _id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true, _id: false }
);
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

// ─── Notifications ───
export interface INotification extends Document {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
);

// ─── Audit Logs ───
export interface IAuditLog extends Document {
  _id: string;
  userId: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    details: String,
    ipAddress: String,
  },
  { timestamps: true, _id: false }
);

// ─── Model exports (prevent re-compilation in dev) ───
export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export const BankAccount = mongoose.models.BankAccount || mongoose.model<IBankAccount>("BankAccount", bankAccountSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", transactionSchema);
export const BalanceSnapshot = mongoose.models.BalanceSnapshot || mongoose.model<IBalanceSnapshot>("BalanceSnapshot", balanceSnapshotSchema);
export const Budget = mongoose.models.Budget || mongoose.model<IBudget>("Budget", budgetSchema);
export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
