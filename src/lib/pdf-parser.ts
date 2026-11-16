import pdfParse from "pdf-parse";

interface PDFTransaction {
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  balance?: number;
  referenceId?: string;
}

interface PDFParseResult {
  transactions: PDFTransaction[];
  bank: string;
  errors: string[];
  rawTextSample?: string;
}

function detectBank(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("state bank of india") || lower.includes("onlinesbi") || lower.includes("sbin")) return "SBI";
  if (lower.includes("hdfc bank") || lower.includes("hdfcbank")) return "HDFC";
  if (lower.includes("icici bank") || lower.includes("icicibank")) return "ICICI";
  if (lower.includes("axis bank")) return "Axis";
  if (lower.includes("kotak")) return "Kotak";
  if (lower.includes("punjab national") || lower.includes("pnb")) return "PNB";
  if (lower.includes("bank of baroda") || lower.includes("bob")) return "BOB";
  if (lower.includes("canara bank")) return "Canara";
  if (lower.includes("union bank")) return "Union";
  if (lower.includes("indian bank")) return "Indian Bank";
  if (lower.includes("idbi")) return "IDBI";
  if (lower.includes("yes bank")) return "Yes Bank";
  if (lower.includes("indusind")) return "IndusInd";
  if (lower.includes("federal bank")) return "Federal";
  return "Unknown";
}

// SBI Email Statement parser
// Format: each transaction is a multi-line block:
//   DD/MM/YYYYDD/MM/YYYY   (txn date + value date concatenated)
//   WDL TFR / DEP TFR      (transaction type)
//   UPI/DR/... or desc      (description, may be multiple lines)
//   reference AT branch
//   BRANCH_NAME
//   -320.00-4,552.84       (debit: -amount-balance)
//   --15.004,314.91        (credit: --amountbalance)
const SBI_DOUBLE_DATE = /^(\d{2}\/\d{2}\/\d{4})(\d{2}\/\d{2}\/\d{4})$/;
const SBI_DEBIT_AMT = /^-([\d,]+\.\d{2})-([\d,]+\.\d{2})$/;
const SBI_CREDIT_AMT = /^--([\d,]+\.\d{2})([\d,]+\.\d{2})$/;

function isSBIEmailFormat(text: string): boolean {
  return SBI_DOUBLE_DATE.test(text.split("\n").map((l) => l.trim()).find((l) => SBI_DOUBLE_DATE.test(l)) || "");
}

function parseSBIEmail(text: string): PDFTransaction[] {
  const transactions: PDFTransaction[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip page footers and repeated column headers
    if (/^\d+Page\s*no/i.test(line) || line === "Balance" || /^STATEMENT\s+OF\s+ACCOUNT/i.test(line)) {
      i++;
      continue;
    }

    const dateMatch = line.match(SBI_DOUBLE_DATE);
    if (!dateMatch) {
      i++;
      continue;
    }

    // Parse txn date (first of the two concatenated dates)
    const [dd, mm, yyyy] = dateMatch[1].split("/");
    const parsedDate = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;

    // Next line: transaction type (WDL TFR, DEP TFR, etc.)
    i++;
    if (i >= lines.length) break;
    const txnType = lines[i];

    // Collect description lines until we find the amount+balance line
    i++;
    const descLines: string[] = [];
    let amount = 0;
    let balance: number | undefined;
    let type: "CREDIT" | "DEBIT" = "DEBIT";
    let foundAmount = false;

    while (i < lines.length) {
      const cur = lines[i];

      // Skip page breaks within a transaction
      if (/^\d+Page\s*no/i.test(cur) || cur === "Balance" || /^STATEMENT\s+OF\s+ACCOUNT/i.test(cur)) {
        i++;
        continue;
      }

      // Check debit amount: -320.00-4,552.84
      const debitMatch = cur.match(SBI_DEBIT_AMT);
      if (debitMatch) {
        amount = parseFloat(debitMatch[1].replace(/,/g, ""));
        balance = parseFloat(debitMatch[2].replace(/,/g, ""));
        type = "DEBIT";
        foundAmount = true;
        i++;
        break;
      }

      // Check credit amount: --15.004,314.91
      const creditMatch = cur.match(SBI_CREDIT_AMT);
      if (creditMatch) {
        amount = parseFloat(creditMatch[1].replace(/,/g, ""));
        balance = parseFloat(creditMatch[2].replace(/,/g, ""));
        type = "CREDIT";
        foundAmount = true;
        i++;
        break;
      }

      // If we hit the next transaction date, stop (amount was missing)
      if (SBI_DOUBLE_DATE.test(cur)) break;

      descLines.push(cur);
      i++;
    }

    if (foundAmount && amount > 0) {
      // Confirm type from transaction type text
      if (txnType.includes("DEP") || txnType.includes("CR")) type = "CREDIT";
      else if (txnType.includes("WDL") || txnType.includes("DR")) type = "DEBIT";

      const fullDesc = [txnType, ...descLines].join(" ").replace(/\s+/g, " ").trim();

      // Extract UPI reference number
      const refMatch = fullDesc.match(/UPI\/(?:DR|REF|CR)\/(\d+)\//);

      transactions.push({
        date: parsedDate,
        description: fullDesc.slice(0, 200),
        amount,
        type,
        balance,
        referenceId: refMatch?.[1],
      });
    }
  }

  return transactions;
}

// Generic parser for other bank PDF formats (tabular layout)
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
const DATE_NUMERIC = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
const DATE_ALPHA = /\b(\d{1,2})[\s\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\/\-](\d{2,4})\b/i;
const AMOUNT_PATTERN = /(?:\d{1,3}(?:,\d{2,3})*|\d+)\.\d{2}\b/g;

function parseDate(raw: string): string | null {
  const cleaned = raw.trim();
  let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T00:00:00.000Z`;

  match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (match) {
    const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}T00:00:00.000Z`;
  }

  match = cleaned.match(/^(\d{1,2})[\s\/\-](\w{3,9})[\s\/\-](\d{2,4})$/i);
  if (match) {
    const month = MONTH_MAP[match[2].slice(0, 3).toLowerCase()];
    if (!month) return null;
    const year = match[3].length === 2
      ? (parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`)
      : match[3];
    return `${year}-${month}-${match[1].padStart(2, "0")}T00:00:00.000Z`;
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function findDateInLine(line: string): { raw: string; parsed: string } | null {
  let match = line.match(DATE_ALPHA);
  if (match) { const parsed = parseDate(match[0]); if (parsed) return { raw: match[0], parsed }; }
  match = line.match(DATE_NUMERIC);
  if (match) { const parsed = parseDate(match[0]); if (parsed) return { raw: match[0], parsed }; }
  return null;
}

function extractAmounts(text: string): number[] {
  const matches = text.match(AMOUNT_PATTERN) || [];
  return matches.map((m) => parseFloat(m.replace(/,/g, ""))).filter((n) => n > 0);
}

function parseGenericPDFLines(text: string): PDFTransaction[] {
  const transactions: PDFTransaction[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let startIdx = 0;
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("opening balance") || lower.includes("b/f") || lower.includes("brought forward")) { startIdx = i + 1; break; }
    if ((lower.includes("date") && (lower.includes("debit") || lower.includes("credit") || lower.includes("amount") || lower.includes("withdrawal") || lower.includes("deposit")))
      || (lower.includes("txn") && lower.includes("date"))) { startIdx = i + 1; break; }
  }

  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (lower.includes("closing balance") || lower.includes("statement summary") || lower.includes("page ") || lower.includes("disclaimer") || lower.includes("this is a computer generated")) { i++; continue; }

    const dateInfo = findDateInLine(line);
    if (dateInfo) {
      let fullLine = line;
      let j = i + 1;
      while (j < lines.length && j <= i + 4) {
        const nextLine = lines[j];
        if (findDateInLine(nextLine) && j > i + 1) break;
        if (nextLine.toLowerCase().includes("closing balance")) break;
        fullLine += " " + nextLine;
        if (extractAmounts(fullLine).length >= 1) { j++; break; }
        j++;
      }

      const amounts = extractAmounts(fullLine);
      if (amounts.length >= 1) {
        let descPart = fullLine;
        descPart = descPart.replace(DATE_ALPHA, "").replace(DATE_NUMERIC, "");
        descPart = descPart.replace(DATE_ALPHA, "").replace(DATE_NUMERIC, "");
        descPart = descPart.replace(AMOUNT_PATTERN, "").replace(/\s+/g, " ").trim();

        let type: "CREDIT" | "DEBIT" = "DEBIT";
        let amount = amounts[0];
        let balance: number | undefined;
        const fullLower = fullLine.toLowerCase();

        if (amounts.length >= 3) {
          if (amounts[0] > 0 && amounts[1] === 0) { type = "DEBIT"; amount = amounts[0]; balance = amounts[2]; }
          else if (amounts[0] === 0 && amounts[1] > 0) { type = "CREDIT"; amount = amounts[1]; balance = amounts[2]; }
          else { balance = amounts[amounts.length - 1]; if (fullLower.match(/\bcr\b|credit|deposit|received|salary/)) { type = "CREDIT"; amount = amounts[amounts.length - 2] || amounts[0]; } }
        } else if (amounts.length === 2) {
          amount = amounts[0]; balance = amounts[1];
          if (fullLower.match(/\bcr\b|credit|deposit|received|salary|neft|refund/)) type = "CREDIT";
        } else {
          if (fullLower.match(/\bcr\b|credit|deposit|received|refund/)) type = "CREDIT";
        }

        if (amount > 0 && amount < 100000000) {
          const refMatch = fullLine.match(/(?:ref|utr|txn|upi|rrn)[:\s#./]*([A-Za-z0-9]{6,})/i);
          transactions.push({ date: dateInfo.parsed, description: descPart.slice(0, 200) || "Transaction", amount, type, balance, referenceId: refMatch?.[1] });
        }
      }
      i = j;
      continue;
    }
    i++;
  }
  return transactions;
}

export async function parsePDFStatement(buffer: Buffer, password?: string): Promise<PDFParseResult> {
  const errors: string[] = [];

  try {
    const source = password
      ? { data: new Uint8Array(buffer), password }
      : buffer;
    const data = await pdfParse(source as Buffer);
    const text = data.text;

    if (!text || text.length < 50) {
      return { transactions: [], bank: "Unknown", errors: ["PDF appears to be empty or image-based (scanned). Please use a digitally generated PDF from net banking."] };
    }

    const bank = detectBank(text);

    // Try SBI email format first (concatenated double dates)
    let transactions: PDFTransaction[] = [];
    if (isSBIEmailFormat(text)) {
      transactions = parseSBIEmail(text);
    }

    // Fallback to generic parser
    if (transactions.length === 0) {
      transactions = parseGenericPDFLines(text);
    }

    if (transactions.length === 0) {
      errors.push("Could not extract transactions. The statement format may not be recognized. Try downloading CSV from net banking instead.");
    }

    return { transactions, bank, errors, rawTextSample: text.slice(0, 8000) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("password") || msg.includes("encrypted") || msg.includes("incorrect")) {
      return {
        transactions: [],
        bank: "Unknown",
        errors: ["This PDF is password-protected. Enter the PDF password (usually your date of birth in DDMMYYYY format or customer ID)."],
      };
    }
    return {
      transactions: [],
      bank: "Unknown",
      errors: [`Failed to read PDF: ${msg}`],
    };
  }
}
