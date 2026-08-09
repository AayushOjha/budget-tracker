"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { VarianceBadge } from "./VarianceBadge";
import { formatMonth, ReportResponse } from "@tracker/utils";

function money(v: number | null): string {
  if (v === null) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReportTable({ report }: { report: ReportResponse }) {
  const [expanded, setExpanded] = useState<{ month: string; categoryId: string } | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ReportResponse["rows"]>();
    for (const row of report.rows) {
      const key = row.month;
      const arr = map.get(key) ?? [];
      arr.push(row);
      map.set(key, arr);
    }
    return [...map.entries()].map(([month, rows]) => ({
      month,
      rows,
      total: report.totals.find((t) => t.month === month),
    }));
  }, [report]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="grid" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th>Month</th>
            <th>Category</th>
            <th>Plan</th>
            <th>Actual</th>
            <th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ month, rows, total }) => (
            <MonthGroup
              key={month}
              monthLabel={formatMonth(month)}
              rows={rows}
              total={total}
              onDrill={(categoryId) => setExpanded((cur) => (cur?.month === month && cur.categoryId === categoryId ? null : { month, categoryId }))}
              expanded={expanded}
            />
          ))}
        </tbody>
      </table>
      <DrillDown expanded={expanded} onClose={() => setExpanded(null)} />
    </div>
  );
}

function MonthGroup({
  monthLabel,
  rows,
  total,
  onDrill,
  expanded,
}: {
  monthLabel: string;
  rows: ReportResponse["rows"];
  total?: ReportResponse["totals"][number];
  onDrill: (categoryId: string) => void;
  expanded: { month: string; categoryId: string } | null;
}) {
  const month = rows[0]?.month ?? "";
  return (
    <>
      {rows.map((row) => (
        <tr
          key={`${row.month}-${row.categoryId}`}
          style={{ cursor: "pointer", background: expanded?.month === month && expanded.categoryId === row.categoryId ? "var(--primary-soft)" : undefined }}
          onClick={() => onDrill(row.categoryId)}
        >
          <td>{monthLabel}</td>
          <td style={{ fontWeight: 550 }}>
            {row.categoryName}
            <span
              className="muted"
              style={{ fontSize: 11, marginLeft: 8 }}
              title="Click to see logged entries"
            >
              drill-down
            </span>
          </td>
          <td className="mono">{money(row.plan)}</td>
          <td className="mono">
            {money(row.actual)}
            {!row.hasActual && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>(no entry)</span>}
          </td>
          <td>
            <VarianceBadge variance={row.variance} variancePct={row.variancePct} />
          </td>
        </tr>
      ))}
      {total && (
        <tr className="total-row">
          <td>{monthLabel}</td>
          <td colSpan={2}>{rows.length} categories</td>
          <td className="mono">{money(total.actual)}</td>
          <td>{money(total.variance)}</td>
        </tr>
      )}
    </>
  );
}

function DrillDown({ expanded, onClose }: { expanded: { month: string; categoryId: string } | null; onClose: () => void }) {
  const month = expanded?.month;
  const categoryId = expanded?.categoryId;

  const { data, isLoading } = useQuery({
    queryKey: ["actuals", month, categoryId],
    queryFn: () => api.actuals(month, categoryId),
    enabled: Boolean(month && categoryId),
  });

  if (!expanded) return null;

  return (
    <div style={{ marginTop: 12 }} className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong>
          Entries for {formatMonth(expanded.month)}
        </strong>
        <button className="btn btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {isLoading && <p className="muted">Loading…</p>}
      {!isLoading && data && data.actuals.length === 0 && (
        <p className="muted">No actual entries logged for this category and month.</p>
      )}
      {data && data.actuals.length > 0 && (
        <table className="grid">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Note</th>
              <th>Logged</th>
            </tr>
          </thead>
          <tbody>
            {data.actuals.map((a) => (
              <tr key={a.id}>
                <td className="mono">${a.amount.toLocaleString()}</td>
                <td>{a.note || "—"}</td>
                <td className="muted">{new Date(a.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}