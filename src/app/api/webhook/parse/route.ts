import { NextResponse } from "next/server";
import { parseBankSMS } from "@/lib/sms-parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sms } = body;

    if (!sms || typeof sms !== "string") {
      return NextResponse.json({ error: "SMS text is required" }, { status: 400 });
    }

    const parsed = parseBankSMS(sms);
    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: "Could not parse transaction from this SMS",
      });
    }

    return NextResponse.json({ success: true, parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse SMS" }, { status: 500 });
  }
}
