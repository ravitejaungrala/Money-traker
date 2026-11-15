interface ParsedTransaction {
  amount: number;
  type: "CREDIT" | "DEBIT";
  accountLast4: string;
  referenceId?: string;
  merchantName?: string;
  paymentMethod: string;
  upiApp?: string;
  upiId?: string;
  balance?: number;
  description: string;
  category: string;
}

const DEBIT_PATTERNS = [
  /(?:debited|sent|paid|withdrawn|purchase|spent|transferred)\b/i,
  /(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:has been|was)?\s*(?:debited|deducted)/i,
];

const CREDIT_PATTERNS = [
  /(?:credited|received|deposited|refund)\b/i,
  /(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:has been|was)?\s*(?:credited|deposited)/i,
];

const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
  /(?:amount|amt)[\s:]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
  /([\d,]+(?:\.\d{2})?)\s*(?:Rs\.?|INR|₹)/i,
];

const ACCOUNT_PATTERNS = [
  /(?:a\/c|ac|acct|account)\s*(?:no\.?)?\s*[xX*]*(\d{4})/i,
  /[xX*]+(\d{4})/,
  /(?:ending|linked)\s*(?:with)?\s*(\d{4})/i,
];

const UPI_REF_PATTERNS = [
  /(?:UPI\s*(?:Ref|ref|REF)[\s.:]*#?\s*)(\d+)/i,
  /(?:Ref[\s.:]*#?\s*)(\d+)/i,
  /(?:txn|transaction)\s*(?:id|no|#)?[\s.:]*(\w+)/i,
];

const BALANCE_PATTERNS = [
  /(?:Avl?\s*Bal|Available\s*Balance|Balance|Bal)[\s.:]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
];

const UPI_APP_PATTERNS: Record<string, RegExp> = {
  PHONEPE: /phone\s*pe|phonepe/i,
  GPAY: /google\s*pay|gpay|tez/i,
  PAYTM: /paytm/i,
  BHIM: /bhim/i,
  CRED: /cred\b/i,
};

const UPI_ID_PATTERN = /[\w.+-]+@[\w]+/;

const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  swiggy: "FOOD",
  zomato: "FOOD",
  starbucks: "FOOD",
  dominos: "FOOD",
  mcdonalds: "FOOD",
  amazon: "SHOPPING",
  flipkart: "SHOPPING",
  myntra: "SHOPPING",
  ajio: "SHOPPING",
  uber: "TRANSPORT",
  ola: "TRANSPORT",
  rapido: "TRANSPORT",
  irctc: "TRANSPORT",
  metro: "TRANSPORT",
  netflix: "ENTERTAINMENT",
  spotify: "ENTERTAINMENT",
  hotstar: "ENTERTAINMENT",
  prime: "ENTERTAINMENT",
  jio: "BILLS",
  airtel: "BILLS",
  vodafone: "BILLS",
  bescom: "BILLS",
  electricity: "BILLS",
  water: "BILLS",
  gas: "BILLS",
  broadband: "BILLS",
  apollo: "HEALTH",
  pharmacy: "HEALTH",
  hospital: "HEALTH",
  medplus: "HEALTH",
  netmeds: "HEALTH",
  rent: "RENT",
  landlord: "RENT",
  emi: "EMI",
  loan: "EMI",
  hdfc: "EMI",
  bajaj: "EMI",
  udemy: "EDUCATION",
  coursera: "EDUCATION",
  school: "EDUCATION",
  college: "EDUCATION",
  salary: "SALARY",
  mutual: "INVESTMENT",
  sip: "INVESTMENT",
  zerodha: "INVESTMENT",
  groww: "INVESTMENT",
};

function extractAmount(sms: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = sms.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
  }
  return null;
}

function extractAccountLast4(sms: string): string | null {
  for (const pattern of ACCOUNT_PATTERNS) {
    const match = sms.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractUpiRef(sms: string): string | null {
  for (const pattern of UPI_REF_PATTERNS) {
    const match = sms.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractBalance(sms: string): number | null {
  const match = sms.match(BALANCE_PATTERNS[0]);
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return null;
}

function detectUpiApp(sms: string): string | null {
  for (const [app, pattern] of Object.entries(UPI_APP_PATTERNS)) {
    if (pattern.test(sms)) return app;
  }
  return null;
}

function detectCategory(sms: string): string {
  const lower = sms.toLowerCase();
  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return "OTHER";
}

function extractMerchant(sms: string): string | null {
  const patterns = [
    /(?:to|at|for|from)\s+([A-Z][\w\s&'.,-]+?)(?:\s+(?:on|via|through|UPI|Ref|ref|Rs|INR|₹|\d))/i,
    /(?:paid to|sent to|received from|credited by)\s+([A-Z][\w\s&'.,-]+?)(?:\s|$)/i,
  ];
  for (const p of patterns) {
    const match = sms.match(p);
    if (match) return match[1].trim();
  }
  return null;
}

export function parseBankSMS(sms: string): ParsedTransaction | null {
  const amount = extractAmount(sms);
  if (!amount || amount <= 0) return null;

  let type: "CREDIT" | "DEBIT" = "DEBIT";
  if (CREDIT_PATTERNS.some((p) => p.test(sms))) type = "CREDIT";
  else if (DEBIT_PATTERNS.some((p) => p.test(sms))) type = "DEBIT";
  else return null;

  const accountLast4 = extractAccountLast4(sms) || "0000";
  const referenceId = extractUpiRef(sms) || undefined;
  const balance = extractBalance(sms) || undefined;
  const upiApp = detectUpiApp(sms) || undefined;
  const upiIdMatch = sms.match(UPI_ID_PATTERN);
  const upiId = upiIdMatch ? upiIdMatch[0] : undefined;
  const merchantName = extractMerchant(sms) || undefined;
  const category = detectCategory(sms);

  let paymentMethod = "OTHER";
  if (/upi/i.test(sms)) paymentMethod = upiApp || "UPI";
  else if (/imps/i.test(sms)) paymentMethod = "IMPS";
  else if (/neft/i.test(sms)) paymentMethod = "NEFT";
  else if (/rtgs/i.test(sms)) paymentMethod = "RTGS";
  else if (/card|pos|atm/i.test(sms)) paymentMethod = "CARD";

  const description = sms.length > 200 ? sms.slice(0, 200) + "..." : sms;

  return {
    amount,
    type,
    accountLast4,
    referenceId,
    merchantName,
    paymentMethod,
    upiApp,
    upiId,
    balance,
    description,
    category,
  };
}
