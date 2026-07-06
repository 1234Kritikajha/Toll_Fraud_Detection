import type { CaseRecord } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Progress } from "../ui/Progress";

export function HighRiskCasesTable({ cases }: { cases: CaseRecord[] }) {
  const rows = cases.map((item) => {
    const score = item.score ?? Number.parseFloat(String(item.risk ?? item.risk_score ?? 0));
    return {
      ...item,
      score: Number.isFinite(score) ? score : 0,
      category: item.category ?? item.type ?? "None",
      updated: item.updated ?? item.time ?? "",
    };
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>High-Risk Cases</CardTitle>
          <CardDescription>Prioritized for investigation</CardDescription>
        </div>
        <Button variant="outline" size="sm">Export</Button>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted">
            <tr className="border-b border-border/80 dark:border-border/20">
              <th className="py-3 font-semibold">Vehicle</th>
              <th className="py-3 font-semibold">Risk</th>
              <th className="py-3 font-semibold">Category</th>
              <th className="py-3 font-semibold">Plaza</th>
              <th className="py-3 text-right font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  No cases saved in your database yet.
                </td>
              </tr>
            )}
            {rows.map((item) => (
              <tr key={item.case_id ?? item.vehicle} className="border-b border-border/60 last:border-0 dark:border-border/10">
                <td className="py-3 font-bold">{item.vehicle}</td>
                <td className="py-3">
                  <div className="flex min-w-[130px] items-center gap-3">
                    <Progress value={item.score} className="w-20" />
                    <Badge tone={item.score > 94 ? "red" : "amber"}>{item.score}%</Badge>
                  </div>
                </td>
                <td className="py-3 text-muted">{item.category}</td>
                <td className="py-3 text-muted">{item.plaza}</td>
                <td className="py-3 text-right text-muted">{item.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
