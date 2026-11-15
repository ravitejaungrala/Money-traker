import pdf from "pdf-parse";

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
}

const DATE_PATTERN = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\b/;
const AMOUNT_PATTERN = /[\d,]+\.\d{2}/g;

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  const cleaned = raw.trim();

  let match = cleaned.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`;

  match = cleaned.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (match) {
    const year = parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`;
    return `${year}-${match[2]}-${match[1]}T00:00:00.000Z`;
  }

  match = cleaned.match(/^(\d{2})[\/\-](\w{3})[\/\-](\d{2,4})$/);
  if (match) {
    const month = MONTH_MAP[match[2].toLowerCase()];
    if (!month) return null;
    const year = match[3].length === 2
      ? (parseInt(match[3]) > 50 ? `19${match[3]}` : `20${match[3]}`)
      : match[3];
    return `${year}-${month}-${match[1]}T00:00:00.000Z`;
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function extractAmounts(text: string): number[] {
  const matches = text.match(AMOUNT_PATTERN) || [];
  return matches.map((m) => parseFloat(m.replace(/,/g, ""))).filter((n) => n > 0);
}

function detectBank(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("state bank of india") || lower.includes("onlinesbi")) return "SBI";
  if (lower.includes("hdfc bank")) return "HDFC";
  if (lower.includes("icici bank")) return "ICICI";
  if (lower.includes("axis bank")) return "Axis";
  if (lower.includes("kotak")) return "Kotak";
  if (lower.includes("punjab national") || lower.includes("pnb")) return "PNB";
  if (lower.includes("bank of baroda") || lower.includes("bob")) return "BOB";
  if (lower.includes("canara bank")) return "Canara";
  if (lower.includes("union bank")) return "Union";
  if (lower.includes("indian bank")) return "Indian Bank";
  return "Unknown";
}

function parsePDFLines(text: string): PDFTransaction[] {
  const transactions: PDFTransaction[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(DATE_PATTERN);

    if (dateMatch) {
      const date = parseDate(dateMatch[1]);
      if (date) {
        let fullLine = line;
        let j = i + 1;
        while (j < lines.length && j <= i + 3) {
          const nextLine = lines[j];
          if (nextLine.match(DATE_PATTERN) && nextLine !== line) break;
          if (nextLine.match(AMOUNT_PATTERN)) {
            fullLine += " " + nextLine;
            break;
          }
          fullLine += " " + nextLine;
          j++;
        }

        const amounts = extractAmounts(fullLine);

        if (amounts.length >= 1) {
          const descPart = fullLine
            .replace(DATE_PATTERN, "")
            .replace(AMOUNT_PATTERN, "")
            .replace(/\s+/g, " ")
            .trim();

          let type: "CREDIT" | "DEBIT" = "DEBIT";
          let amount = amounts[0];
          let balance: number | undefined;

          if (amounts.length >= 3) {
            if (amounts[0] > 0 && amounts[1] === 0) {
              type = "DEBIT";
              amount = amounts[0];
              balance = amounts[2];
            } else if (amounts[0] === 0 && amounts[1] > 0) {
              type = "CREDIT";
              amount = amounts[1];
              balance = amounts[2];
            } else {
              type = "DEBIT";
              amount = amounts[0];
              balance = amounts[amounts.length - 1];
            }
          } else if (amounts.length === 2) {
            amount = amounts[0];
            balance = amounts[1];
            const lower = fullLine.toLowerCase();
            if (lower.includes("credit") || lower.includes("cr") || lower.includes("deposit") || lower.includes("received") || lower.includes("salary") || lower.includes("neft")) {
              type = "CREDIT";
            }
          } else {
            const lower = fullLine.toLowerCase();
            if (lower.includes("credit") || lower.includes("cr") || lower.includes("deposit") || lower.includes("received")) {
              type = "CREDIT";
            }
          }

          if (amount > 0 && amount < 100000000) {
            const refMatch = fullLine.match(/(?:ref|utr|txn|upi)[:\s#]*(\w{6,})/i);
            transactions.push({
              date,
              description: descPart.slice(0, 200) || "Transaction",
              amount,
              type,
              balance,
              referenceId: refMatch?.[1],
            });
          }
        }

        i = j + 1;
        continue;
      }
    }
    i++;
  }

  return transactions;
}

export async function parsePDFStatement(buffer: Buffer): Promise<PDFParseResult> {
  const errors: string[] = [];

  try {
    const data = await pdf(buffer);
    const text = data.text;

    if (!text || text.length < 50) {
      return { transactions: [], bank: "Unknown", errors: ["PDF appears to be empty or image-based (scanned). Please use a digitally generated PDF from net banking."] };
    }

    const bank = detectBank(text);
    const transactions = parsePDFLines(text);

    if (transactions.length === 0) {
      errors.push("Could not extract transactions. This may be a scanned/image PDF. Use the digitally downloaded statement from net banking.");
    }

    return { transactions, bank, errors };
  } catch (e) {
    return {
      transactions: [],
      bank: "Unknown",
      errors: [`Failed to read PDF: ${e instanceof Error ? e.message : "Unknown error"}`],
    };
  }
}
