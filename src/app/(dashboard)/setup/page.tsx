"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, MessageSquare, FileSpreadsheet, Cloud, Shield,
  CheckCircle2, ChevronDown, ChevronUp, Zap, Globe, Copy, Check,
} from "lucide-react";

export default function SetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Setup & Connect</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Free ways to get your real transactions into FinTrack
        </p>
      </div>

      {/* Cost Summary */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
              <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">100% Free Setup</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                All integration methods below are completely free. No API keys, no paid services, no hidden charges.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Method 1: CSV Import */}
      <MethodCard
        number={1}
        title="CSV Bank Statement Import"
        subtitle="Upload past transactions from any Indian bank"
        icon={<FileSpreadsheet className="h-6 w-6" />}
        color="blue"
        effort="Easy"
        time="2 min"
        best="Best for importing past transactions"
        defaultOpen
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download your bank statement as CSV from your net banking portal and upload it to FinTrack.
            Works with SBI, HDFC, ICICI, and any bank that exports CSV.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Feature text="SBI, HDFC, ICICI auto-detected" />
            <Feature text="Any bank CSV supported" />
            <Feature text="Auto-categorization" />
            <Feature text="Duplicate detection" />
          </div>
          <a
            href="/import"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Go to CSV Import
          </a>
        </div>
      </MethodCard>

      {/* Method 2: SMS Test Console */}
      <MethodCard
        number={2}
        title="SMS Copy & Paste"
        subtitle="Manually paste bank SMS to record transactions"
        icon={<MessageSquare className="h-6 w-6" />}
        color="green"
        effort="Easy"
        time="30 sec per transaction"
        best="Best for recording individual transactions quickly"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Copy any bank transaction SMS from your phone and paste it in the test console.
            Our parser automatically extracts amount, merchant, UPI app, and category.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Feature text="PhonePe, GPay, Paytm detected" />
            <Feature text="Merchant auto-detection" />
            <Feature text="Smart categorization" />
            <Feature text="Balance tracking" />
          </div>
          <a
            href="/integrations"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Open SMS Console
          </a>
        </div>
      </MethodCard>

      {/* Method 3: MacroDroid Automation */}
      <MethodCard
        number={3}
        title="MacroDroid SMS Automation"
        subtitle="Auto-forward bank SMS from your Android phone (free)"
        icon={<Smartphone className="h-6 w-6" />}
        color="purple"
        effort="Medium"
        time="10 min setup"
        best="Best for real-time automatic tracking"
      >
        <MacroDroidGuide />
      </MethodCard>

      {/* Method 4: Deployment */}
      <MethodCard
        number={4}
        title="Deploy Online (Optional)"
        subtitle="Host on Vercel for free to access from anywhere"
        icon={<Globe className="h-6 w-6" />}
        color="gray"
        effort="Medium"
        time="15 min"
        best="Required for MacroDroid SMS automation to work from your phone"
      >
        <DeployGuide />
      </MethodCard>

      {/* Privacy Notice */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">Your Data Stays Yours</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                FinTrack never accesses your bank account directly. All data comes from CSV files you upload
                or SMS messages you send. No bank credentials, UPI PINs, or passwords are ever stored.
                Self-hosted means you own your data completely.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MethodCard({
  number, title, subtitle, icon, color, effort, time, best, children, defaultOpen,
}: {
  number: number; title: string; subtitle: string; icon: React.ReactNode;
  color: string; effort: string; time: string; best: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || false);
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${colorMap[color]}`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Badge variant="secondary" className="text-xs">Free</Badge>
              </div>
              <CardDescription className="mt-0.5">{subtitle}</CardDescription>
              <div className="flex gap-3 mt-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">Effort: <strong>{effort}</strong></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Time: <strong>{time}</strong></span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">{best}</p>
            </div>
            <div className="shrink-0 mt-1">
              {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </div>
          </div>
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0 border-t border-gray-100 dark:border-gray-800">
          <div className="pt-4">{children}</div>
        </CardContent>
      )}
    </Card>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
      {text}
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-lg bg-gray-900 dark:bg-gray-950 p-3 font-mono text-xs text-green-400 overflow-x-auto">
      <pre className="whitespace-pre-wrap">{text}</pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
      </button>
    </div>
  );
}

function MacroDroidGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        MacroDroid is a free Android automation app. Set it up once and every bank SMS gets automatically
        forwarded to FinTrack — PhonePe, GPay, Paytm, NEFT, all of them.
      </p>

      <div className="space-y-3">
        <Step number={1} title="Install MacroDroid">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Download <strong>MacroDroid</strong> from Google Play Store (free, 5M+ downloads).
            Grant SMS permissions when prompted.
          </p>
        </Step>

        <Step number={2} title="Create New Macro">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Open MacroDroid → tap &quot;+&quot; to add a macro → name it &quot;FinTrack SMS&quot;.
          </p>
        </Step>

        <Step number={3} title="Set Trigger: SMS Received">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Tap &quot;Triggers&quot; → &quot;SMS/MMS&quot; → &quot;SMS Received&quot;. Set content contains to:
          </p>
          <CopyBlock text="debited|credited|spent|received|transferred" />
          <p className="text-xs text-gray-500 mt-1">This captures all bank transaction SMS</p>
        </Step>

        <Step number={4} title="Set Action: HTTP Request">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Tap &quot;Actions&quot; → &quot;Connectivity&quot; → &quot;HTTP Request&quot;. Configure:
          </p>
          <div className="space-y-2">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm space-y-1">
              <p><strong>Method:</strong> POST</p>
              <p><strong>URL:</strong> https://your-app.vercel.app/api/webhook/sms</p>
              <p><strong>Content Type:</strong> application/json</p>
              <p><strong>Body:</strong></p>
            </div>
            <CopyBlock text={`{"sms": "{sms_text}"}`} />
            <p className="text-xs text-gray-500">
              Replace <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">your-app.vercel.app</code> with
              your actual deployed URL. The <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{"{sms_text}"}</code> is
              a MacroDroid variable that gets replaced with the actual SMS content.
            </p>
          </div>
        </Step>

        <Step number={5} title="Add Auth Cookie (Important)">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            In the HTTP Request headers, add your session cookie:
          </p>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm space-y-1">
            <p><strong>Header Name:</strong> Cookie</p>
            <p><strong>Header Value:</strong> next-auth.session-token=YOUR_TOKEN</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Get your session token: login to your deployed app → browser DevTools → Application → Cookies → copy the next-auth.session-token value.
            This token expires periodically — you may need to update it.
          </p>
        </Step>

        <Step number={6} title="Save & Test">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Save the macro and enable it. Test by asking someone to send you a small amount via UPI — the transaction should appear in your dashboard within seconds.
          </p>
        </Step>
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-3">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Alternative apps:</strong> Tasker (free with more control) or Automate (visual macro builder) also work.
          The HTTP POST setup is similar in all three.
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        {children}
      </div>
    </div>
  );
}

function DeployGuide() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Deploy FinTrack for free on Vercel with Neon PostgreSQL. This gives you a public URL
        that MacroDroid can reach from your phone.
      </p>

      <div className="space-y-3">
        <Step number={1} title="Push to GitHub">
          <CopyBlock text={`git remote add origin https://github.com/YOUR_USERNAME/fintrack.git\ngit push -u origin master`} />
        </Step>

        <Step number={2} title="Deploy on Vercel (Free)">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Go to vercel.com → Import your GitHub repo → Deploy. The free tier gives you unlimited deployments
            and custom domains.
          </p>
        </Step>

        <Step number={3} title="Add Neon Database (Free)">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            For production, switch from SQLite to Neon PostgreSQL (free tier: 512MB storage).
          </p>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm space-y-1">
            <p>1. Sign up at <strong>neon.tech</strong> (free)</p>
            <p>2. Create a project → copy the connection string</p>
            <p>3. Add to Vercel Environment Variables:</p>
          </div>
          <CopyBlock text="DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb" />
        </Step>

        <Step number={4} title="Set Environment Variables">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            In Vercel Settings → Environment Variables, add:
          </p>
          <CopyBlock text={`NEXTAUTH_SECRET=your-random-secret-key\nNEXTAUTH_URL=https://your-app.vercel.app\nDATABASE_URL=your-neon-connection-string`} />
        </Step>
      </div>

      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>Cost breakdown:</strong> Vercel free tier (100GB bandwidth/month) + Neon free tier (512MB DB, 190 compute hours/month) = completely free for personal use.
        </p>
      </div>
    </div>
  );
}
