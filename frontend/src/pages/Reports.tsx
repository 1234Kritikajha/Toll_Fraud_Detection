import { CalendarClock, Download, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import {
  exportReportExcel,
  fetchReportSummary,
  generateDailyFraudPDF,
  generateExecutiveSummaryPDF,
} from "../services/api";

type ReportSummary = {
  total_transactions: number;
  total_revenue: number;
  success_count: number;
  failed_count: number;
  top_plaza: string;
  top_plaza_count: number;
  recent_transactions: Array<{ plate: string; status: string; plaza: string; amount: number; detected_at: string }>;
};

const reportCards = [
  {
    title: "Daily Fraud Report",
    body: "Generate a consolidated PDF of today's fraud alerts, suspicious vehicles, and AI findings.",
    action: "Generate PDF",
    icon: FileText,
    handler: generateDailyFraudPDF,
    filename: "daily_fraud_report.pdf",
  },
  {
    title: "Revenue Audit",
    body: "Export plaza-wise revenue reconciliation and leakage analysis in Excel format.",
    action: "Export Excel",
    icon: FileSpreadsheet,
    handler: exportReportExcel,
    filename: "revenue_audit.xlsx",
  },
  {
    title: "Executive Summary",
    body: "Create a board-ready summary with KPIs, trends, and risk hotspots for leadership.",
    action: "Create Summary",
    icon: Presentation,
    handler: generateExecutiveSummaryPDF,
    filename: "executive_summary.pdf",
  },
];

const generatedReports = [
  {
    title: "Daily Fraud Report",
    detail: "Generated today - PDF",
    handler: generateDailyFraudPDF,
    filename: "daily_fraud_report.pdf",
  },
  {
    title: "Revenue Audit - Q2",
    detail: "Yesterday - XLSX",
    handler: exportReportExcel,
    filename: "revenue_audit_q2.xlsx",
  },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function Reports() {
  const { data: summary, isLoading } = useQuery<ReportSummary>({ queryKey: ["reportSummary"], queryFn: fetchReportSummary });
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReportAction = async (handler: () => Promise<Blob>, filename: string) => {
    setLoading(filename);
    setMessage(null);
    try {
      const blob = await handler();
      downloadBlob(blob, filename);
      setMessage(`${filename} downloaded successfully.`);
    } catch (error) {
      setMessage("Failed to generate the report. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {message && (
        <Card className="border-l-4 border-teal-500 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-400 dark:bg-teal-900/10 dark:text-teal-200">
          {message}
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Live report summary</CardTitle>
            <CardDescription>Values are pulled from your backend database.</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 p-4">
          {isLoading ? (
            <p className="text-sm text-muted">Loading report data...</p>
          ) : summary ? (
            [
              { label: "Total transactions", value: summary.total_transactions.toString() },
              { label: "Total revenue", value: `₹${summary.total_revenue.toFixed(2)}` },
              { label: "Successful", value: summary.success_count.toString() },
              { label: "Flagged", value: summary.failed_count.toString() },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/80 bg-slate-50 p-4 text-sm dark:border-border/20 dark:bg-slate-950/60">
                <p className="text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No report summary available.</p>
          )}
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.title}>
            <report.icon className="text-primary" size={28} />
            <h2 className="mt-4 text-lg font-bold">{report.title}</h2>
            <p className="mt-2 min-h-[72px] text-sm text-muted">{report.body}</p>
            <Button
              className="mt-5 w-full"
              onClick={() => handleReportAction(report.handler, report.filename)}
              disabled={loading !== null}
            >
              {loading === report.filename ? "Working..." : report.action}
            </Button>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Latest records pulled from your backend.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMessage("Run a report to download the latest data.")}> <CalendarClock size={16} /> Refresh</Button>
        </CardHeader>
        <div className="space-y-3 p-4">
          {!summary?.recent_transactions.length ? (
            <p className="text-sm text-muted">No recent transaction data found.</p>
          ) : (
            summary.recent_transactions.map((transaction, index) => (
              <div key={`${transaction.plate}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 p-4 dark:border-border/20">
                <div>
                  <p className="font-bold">{transaction.plate || "Unknown vehicle"}</p>
                  <p className="text-sm text-muted">
                    {transaction.status} at {transaction.plaza}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{transaction.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted">{new Date(transaction.detected_at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
}
