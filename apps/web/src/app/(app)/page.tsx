"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { MonthRangePicker } from "@/components/MonthRangePicker";
import { NetVarianceChart } from "@/components/NetVarianceChart";
import { ReportTable } from "@/components/ReportTable";
import { currentMonth } from "@tracker/utils";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export default function ReportPage() {
  const now = currentMonth();
  const [range, setRange] = useState(() => ({ start: shiftMonth(now, -5), end: now }));

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", range.start, range.end],
    queryFn: () => api.report(range.start, range.end),
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const plan = data.totals.reduce((s, t) => s + t.plan, 0);
    const actual = data.totals.reduce((s, t) => s + t.actual, 0);
    const variance = data.totals.reduce((s, t) => s + (t.variance ?? 0), 0);
    return { plan, actual, variance };
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const lines = ["month,category,plan,actual,variance,variance_pct"];
    for (const row of data.rows) {
      lines.push(
        [row.month, row.categoryName, row.plan, row.actual, row.variance ?? "", row.variancePct ?? ""].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-vs-actual-${range.start}-${range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Report</h1>
        <button className="btn" onClick={exportCsv} disabled={!data}>
          Export CSV
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <MonthRangePicker start={range.start} end={range.end} onChange={(start, end) => setRange({ start, end })} />
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div className="card">
            <div className="muted" style={{ fontSize: 13 }}>Total plan</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
              ${summary.plan.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 13 }}>Total actual</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
              ${summary.actual.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 13 }}>Net variance</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
              ${summary.variance.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Monthly net variance</h2>
        {isLoading && <p className="muted">Loading…</p>}
        {error && <div className="error-box">{(error as Error).message}</div>}
        {data && <NetVarianceChart totals={data.totals} />}
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
          Plan vs actual by category × month
        </h2>
        {isLoading && <p className="muted">Loading…</p>}
        {error && <div className="error-box">{(error as Error).message}</div>}
        {data && (
          <>
            <ReportTable report={data} />
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Missing actuals are treated as $0 for variance math. Rows show “(no entry)” and variance is still
              computed (e.g. −100%). Variance % is “—” when there is no target (plan = 0). Click a category row for
              drill-down.
            </p>
          </>
        )}
      </div>
    </div>
  );
}