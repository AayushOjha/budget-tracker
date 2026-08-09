"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMonth, ReportTotals } from "@tracker/utils";

export function NetVarianceChart({ totals }: { totals: ReportTotals[] }) {
  const data = totals.map((t) => ({
    name: formatMonth(t.month),
    Plan: Math.round(t.plan * 100) / 100,
    Actual: Math.round(t.actual * 100) / 100,
    "Net variance": t.variance === null ? 0 : Math.round(t.variance * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
        <Tooltip formatter={(value: number | string) => `$${Number(value).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="Plan" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Net variance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}