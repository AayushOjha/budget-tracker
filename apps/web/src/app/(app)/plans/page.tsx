"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { currentMonth, formatMoney, LockDto, PlanDto } from "@tracker/utils";

export default function PlansPage() {
  const queryClient = useQueryClient();
  const now = currentMonth();
  const [month, setMonth] = useState(now);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const plans = useQuery({ queryKey: ["plans", month], queryFn: () => api.plans(month) });
  const locks = useQuery({ queryKey: ["locks"], queryFn: api.locks });

  const locked = new Set((locks.data?.locks ?? []).map((l: LockDto) => l.month));
  const isLocked = locked.has(month);

  const planByCategory = new Map((plans.data?.plans ?? []).map((p: PlanDto) => [p.categoryId, p]));
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["report"] });
  };

  const save = useMutation({
    mutationFn: () => {
      const entries = [...(categories.data?.categories ?? [])].map((c) => {
        const amount = Number(drafts.get(c.id));
        return { categoryId: c.id, amount: Number.isFinite(amount) ? amount : null };
      });
      const operations = [];
      for (const e of entries) {
        if (e.amount !== null && e.amount >= 0) {
          operations.push(api.savePlan(e.categoryId, month, e.amount));
        }
      }
      return Promise.all(operations);
    },
    onSuccess: () => {
      setDrafts(new Map());
      invalidate();
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save plans."),
  });

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Monthly targets</h1>

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div className="field">
            <label>Month</label>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
          <span className={`badge ${isLocked ? "badge-locked" : "badge-open"}`}>
            {isLocked ? "Locked — read-only" : "Open — editable"}
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        <table className="grid" style={{ minWidth: 520 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Target ({formatMoney(0)} scale)</th>
              <th style={{ textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {categories.isLoading && (
              <tr><td colSpan={3} className="muted">Loading…</td></tr>
            )}
            {(categories.data?.categories ?? []).map((category) => {
              const existing = planByCategory.get(category.id);
              const draft = drafts.get(category.id) ?? (drafts.has(category.id) ? drafts.get(category.id)! : existing ? String(existing.amount) : "");
              return (
                <tr key={category.id}>
                  <td style={{ fontWeight: 550 }}>{category.name}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      style={{ width: 140 }}
                      disabled={isLocked}
                      value={draft}
                      onChange={(e) => setDrafts((d) => new Map(d).set(category.id, e.target.value))}
                    />
                    {existing && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>saved: {formatMoney(existing.amount)}</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isLocked || !drafts.has(category.id)}
                      onClick={() => save.mutate()}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
            {(categories.data?.categories ?? []).length === 0 && !categories.isLoading && (
              <tr><td colSpan={3} className="muted">No categories yet — create one on the Categories page first.</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={isLocked || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save all targets"}
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {isLocked
            ? `Targets for ${month} are locked and read-only.`
            : `Targets for ${month} can be set or edited. Locked months are enforced by the API (423 Locked).`}
        </p>
      </div>
    </div>
  );
}