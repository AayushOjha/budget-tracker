"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { currentMonth, formatMonth } from "@tracker/utils";

export default function LocksPage() {
  const queryClient = useQueryClient();
  const now = currentMonth();
  const [month, setMonth] = useState(now);
  const [error, setError] = useState<string | null>(null);

  const locks = useQuery({ queryKey: ["locks"], queryFn: api.locks });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["locks"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["actuals"] });
    queryClient.invalidateQueries({ queryKey: ["report"] });
  };

  const lock = useMutation({
    mutationFn: () => api.lockMonth(month),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to lock month."),
  });

  const unlock = useMutation({
    mutationFn: (m: string) => api.unlockMonth(m),
    onSuccess: () => invalidate(),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to unlock month."),
  });

  const lockedMonths = (locks.data?.locks ?? []).map((l) => l.month);

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Locking</h1>

      <div className="card">
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Lock a month</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
          Granularity is monthly: locking <code>2026-01</code> makes every plan and actual for that month read-only,
          enforced by the API (edits return <code>423 Locked</code>). A quarter is locked by locking its three months.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field">
            <label>Month</label>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
          <button
            className="btn btn-primary"
            disabled={lockedMonths.includes(month) || lock.isPending}
            onClick={() => lock.mutate()}
          >
            {lock.isPending ? "Locking…" : "Lock month"}
          </button>
          <span className="badge badge-locked" style={{ marginBottom: 8 }}>locked months are read-only</span>
        </div>
        {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Locked months</h2>
        {locks.isLoading && <p className="muted">Loading…</p>}
        {!locks.isLoading && lockedMonths.length === 0 && <p className="muted">No months are locked.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lockedMonths.map((m) => (
            <div key={m} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="badge badge-locked">{formatMonth(m)}</span>
              <span className="muted" style={{ fontSize: 13 }}>{m}</span>
              <button
                className="btn btn-sm"
                style={{ marginLeft: "auto" }}
                disabled={unlock.isPending}
                onClick={() => unlock.mutate(m)}
              >
                Unlock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}