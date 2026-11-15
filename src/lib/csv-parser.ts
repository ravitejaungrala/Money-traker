interface CSVTransaction {
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  balance?: number;
  referenceId?: string;
}

interface ParseResult {
  transactions: CSVTransaction[];
  bank: string;
  format: string;
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/[₹,\s"]/g, "")) || 0;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/['"]/g, "").trim();

  const formats = [
    /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/,
    /^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/,
    /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/,
    /^(\d{2})[\/\-](\w{3})[\/\-](\d{4})$/,
    /^(\d{2})[\/\-](\w{3})[\/\-](\d{2})$/,
  ];

  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  for (const fmt of formats) {
    const match = cleaned.match(fmt);
    if (!match) continue;

    if (fmt === formats[0]) {
      return `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`;
    }
    if (fmt === formats[1]) {
      const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
      return `${year}-${match[2]}-${match[1]}T00:00:00.000Z`;
    }
    if (fmt === formats[2]) {
      return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
    }
    if (fmt === formats[3]) {
      const month = monthNames[match[2].toLowerCase()];
      if (month) return `${match[3]}-${month}-${match[1]}T00:00:00.000Z`;
    }
    if (fmt === formats[4]) {
      const month = monthNames[match[2].toLowerCase()];
      const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
      if (month) return `${year}-${month}-${match[1]}T00:00:00.000Z`;
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function detectBankFormat(headers: string[]): { bank: string; format: string; map: Record<string, number> } | null {
  const lower = headers.map((h) => h.toLowerCase().replace(/['"]/g, "").trim());

  if (lower.includes("txn date") || lower.includes("transaction date")) {
    if (lower.includes("withdrawal amt") || lower.includes("withdrawal")) {
      return {
        bank: "SBI",
        format: "SBI Statement",
        map: {
          date: lower.indexOf("txn date") >= 0 ? lower.indexOf("txn date") : lower.indexOf("transaction date"),
          description: lower.findIndex((h) => h.includes("description") || h.includes("particulars")),
          debit: lower.findIndex((h) => h.includes("withdrawal") || h.includes("debit")),
          credit: lower.findIndex((h) => h.includes("deposit") || h.includes("credit")),
          balance: lower.findIndex((h) => h.includes("balance")),
          ref: lower.findIndex((h) => h.includes("ref") || h.includes("chq")),
        },
      };
    }
  }

  if (lower.some((h) => h.includes("narration")) || lower.some((h) => h.includes("chq/ref"))) {
    return {
      bank: "HDFC",
      format: "HDFC Statement",
      map: {
        date: lower.findIndex((h) => h.includes("date")),
        description: lower.findIndex((h) => h.includes("narration") || h.includes("description")),
        debit: lower.findIndex((h) => h.includes("withdrawal") || h.includes("debit")),
        credit: lower.findIndex((h) => h.includes("deposit") || h.includes("credit")),
        balance: lower.findIndex((h) => h.includes("closing") || h.includes("balance")),
        ref: lower.findIndex((h) => h.includes("chq") || h.includes("ref")),
      },
    };
  }

  if (lower.some((h) => h.includes("value date")) || lower.some((h) => h.includes("transaction remarks"))) {
    return {
      bank: "ICICI",
      format: "ICICI Statement",
      map: {
        date: lower.findIndex((h) => h.includes("transaction date") || h.includes("date")),
        description: lower.findIndex((h) => h.includes("remarks") || h.includes("description") || h.includes("particulars")),
        debit: lower.findIndex((h) => h.includes("withdrawal") || h.includes("debit")),
        credit: lower.findIndex((h) => h.includes("deposit") || h.includes("credit")),
        balance: lower.findIndex((h) => h.includes("balance")),
        ref: lower.findIndex((h) => h.includes("chq") || h.includes("ref")),
      },
    };
  }

  const dateIdx = lower.findIndex((h) => h.includes("date"));
  const descIdx = lower.findIndex((h) => h.includes("description") || h.includes("narration") || h.includes("particular") || h.includes("remark"));
  const debitIdx = lower.findIndex((h) => h.includes("debit") || h.includes("withdrawal") || h.includes("dr"));
  const creditIdx = lower.findIndex((h) => h.includes("credit") || h.includes("deposit") || h.includes("cr"));
  const balIdx = lower.findIndex((h) => h.includes("balance"));
  const amtIdx = lower.findIndex((h) => h.includes("amount"));

  if (dateIdx >= 0 && (descIdx >= 0 || amtIdx >= 0)) {
    return {
      bank: "Generic",
      format: "Auto-detected",
      map: {
        date: dateIdx,
        description: descIdx >= 0 ? descIdx : -1,
        debit: debitIdx,
        credit: creditIdx,
        amount: amtIdx,
        balance: balIdx,
        ref: -1,
      },
    };
  }

  return null;
}

export function parseCSVStatement(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];

  if (lines.length < 2) {
    return { transactions: [], bank: "Unknown", format: "Unknown", errors: ["File has too few lines"] };
  }

  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("date") && (lower.includes("amount") || lower.includes("debit") || lower.includes("credit") || lower.includes("withdrawal"))) {
      headerIdx = i;
      break;
    }
  }

  const headers = parseCSVLine(lines[headerIdx]);
  const detected = detectBankFormat(headers);

  if (!detected) {
    return { transactions: [], bank: "Unknown", format: "Unknown", errors: ["Could not detect bank statement format. Ensure CSV has columns: Date, Description, Debit/Credit or Amount"] };
  }

  const transactions: CSVTransaction[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const dateRaw = detected.map.date >= 0 ? fields[detected.map.date] : null;
    const date = dateRaw ? parseDate(dateRaw) : null;
    if (!date) {
      if (dateRaw && dateRaw.trim()) errors.push(`Row ${i + 1}: Could not parse date "${dateRaw}"`);
      continue;
    }

    const description = detected.map.description >= 0 ? fields[detected.map.description] || "" : "";

    let amount = 0;
    let type: "CREDIT" | "DEBIT" = "DEBIT";

    if (detected.map.debit !== undefined && detected.map.debit >= 0 && detected.map.credit !== undefined && detected.map.credit >= 0) {
      const debit = parseAmount(fields[detected.map.debit]);
      const credit = parseAmount(fields[detected.map.credit]);
      if (debit > 0) {
        amount = debit;
        type = "DEBIT";
      } else if (credit > 0) {
        amount = credit;
        type = "CREDIT";
      } else {
        continue;
      }
    } else if ((detected.map as Record<string, number>).amount !== undefined && (detected.map as Record<string, number>).amount >= 0) {
      amount = parseAmount(fields[(detected.map as Record<string, number>).amount]);
      if (amount < 0) {
        amount = Math.abs(amount);
        type = "DEBIT";
      } else {
        type = "CREDIT";
      }
    } else {
      continue;
    }

    if (amount <= 0) continue;

    const balance = detected.map.balance >= 0 ? parseAmount(fields[detected.map.balance]) : undefined;
    const referenceId = detected.map.ref >= 0 ? fields[detected.map.ref] || undefined : undefined;

    transactions.push({ date, description, amount, type, balance, referenceId });
  }

  return {
    transactions,
    bank: detected.bank,
    format: detected.format,
    errors,
  };
}
