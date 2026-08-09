"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: api.categories });

  const create = useMutation({
    mutationFn: () => api.createCategory(name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create category."),
  });

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Categories</h1>

      <div className="card">
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Create a category</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
          Categories are per-user and used by plans, actuals, and the report. Deleting a category is intentionally not
          offered because it would delete its plans and spend entries.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) create.mutate();
              }}
            />
          </div>
          <button className="btn btn-primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Add category"}
          </button>
        </div>
        {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Your categories</h2>
        {categories.isLoading && <p className="muted">Loading…</p>}
        {(categories.data?.categories ?? []).length === 0 && !categories.isLoading && (
          <p className="muted">No categories yet. Create e.g. Marketing, Payroll, Tools.</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(categories.data?.categories ?? []).map((c) => (
            <span key={c.id} className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary)", fontSize: 13, padding: "6px 14px" }}>
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}