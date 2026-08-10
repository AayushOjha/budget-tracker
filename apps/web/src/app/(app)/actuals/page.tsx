"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { currentMonth, formatMonth, CsvImportResult, ActualDto, CategoryDto } from "@tracker/utils";

export default function ActualsPage() {
  const queryClient = useQueryClient();
  const now = currentMonth();

  const categories = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const locks = useQuery({ queryKey: ["locks"], queryFn: api.locks });
  const actuals = useQuery({ queryKey: ["actuals"], queryFn: () => api.actuals() });

  const lockedMonths = useMemo(() => new Set((locks.data?.locks ?? []).map((l) => l.month)), [locks.data]);

  // ── Add form state ────────────────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState(now);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["actuals"] });
    queryClient.invalidateQueries({ queryKey: ["report"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      api.createActual({ categoryId, month, amount: Number(amount), note }),
    onSuccess: () => {
      invalidate();
      setAmount("");
      setNote("");
      setFormError(null);
    },
    onError: (err) =>
      setFormError(err instanceof ApiError ? err.message : "Failed to add entry."),
  });

  // ── CSV import state ──────────────────────────────────────────────────────
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: () => api.importCsv(csvText),
    onSuccess: (result) => {
      setImportResult(result);
      invalidate();
    },
    onError: (err) =>
      setCsvError(err instanceof ApiError ? err.message : "Import failed."),
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, ActualDto[]>();
    for (const a of actuals.data?.actuals ?? []) {
      const arr = map.get(a.month) ?? [];
      arr.push(a);
      map.set(a.month, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [actuals.data]);

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Actual spend</h1>

      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>Log an entry</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div className="field">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Select…</option>
              {(categories.data?.categories ?? []).map((c: CategoryDto) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Month</label>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Amount</label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label>Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ad campaign" />
          </div>
        </div>
        {formError && <div className="error-box" style={{ marginTop: 12 }}>{formError}</div>}
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-primary"
            disabled={!categoryId || !month || !amount || Number(amount) <= 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? "Adding…" : "Add entry"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>CSV import</h2>
        <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
          A header row is required with columns <code>month</code>, <code>category</code>, <code>amount</code> (any
          order; extra columns ignored). Category must exist; month must be YYYY-MM. Locked months are rejected.{" "}
          <strong>All rows must be valid</strong> — any error aborts the entire import.
        </p>
        <textarea
          rows={5}
          style={{ width: "100%" }}
          placeholder={"2026-01,Marketing,4800\n2026-01,Payroll,20500"}
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setImportResult(null); setCsvError(null); }}
        />
        <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => document.getElementById("csv-file")?.click()}>Upload .csv file</button>
          <input id="csv-file" type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button className="btn btn-primary" disabled={!csvText.trim() || importMutation.isPending} onClick={() => importMutation.mutate()}>
            {importMutation.isPending ? "Importing…" : "Import CSV"}
          </button>
          {csvText && <button className="btn" onClick={() => { setCsvText(""); setImportResult(null); setCsvError(null); }}>Clear</button>}
        </div>
        {csvError && <div className="error-box" style={{ marginTop: 12 }}>{csvError}</div>}
        {importResult && (
          <div style={{ marginTop: 12 }}>
            <div className="success-box">
              Imported {importResult.imported} entries, skipped {importResult.skipped}.
            </div>
            {importResult.errors.length > 0 && (
              <table className="grid" style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>Line</th><th>Raw</th><th>Error</th></tr>
                </thead>
                <tbody>
                  {importResult.errors.map((e) => (
                    <tr key={e.line}>
                      <td className="mono">{e.line}</td>
                      <td><code>{e.raw}</code></td>
                      <td>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>Logged entries</h2>
        {actuals.isLoading && <p className="muted">Loading…</p>}
        {!actuals.isLoading && groupedByMonth.length === 0 && <p className="muted">Nothing logged yet.</p>}
        {groupedByMonth.map(([monthStr, entries]) => (
          <div key={monthStr} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <strong>{formatMonth(monthStr)}</strong>
              {lockedMonths.has(monthStr) ? (
                <span className="badge badge-locked">locked</span>
              ) : (
                <span className="badge badge-open">open</span>
              )}
            </div>
            <table className="grid" style={{ minWidth: 480 }}>
              <thead>
                <tr><th>Category</th><th>Amount</th><th>Note</th><th>Logged at</th><th style={{ textAlign: "right" }}></th></tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ActualRow key={entry.id} entry={entry} locked={lockedMonths.has(entry.month)} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActualRow({ entry, locked }: { entry: ActualDto; locked: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["actuals"] });
    queryClient.invalidateQueries({ queryKey: ["report"] });
  };

  const save = useMutation({
    mutationFn: () => api.updateActual(entry.id, { amount: Number(amount), note }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Update failed."),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteActual(entry.id),
    onSuccess: () => invalidate(),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Delete failed."),
  });

  if (editing) {
    return (
      <tr>
        <td>{entry.categoryName}</td>
        <td>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 100 }} />
        </td>
        <td><input value={note} onChange={(e) => setNote(e.target.value)} style={{ minWidth: 160 }} /></td>
        <td className="muted">{new Date(entry.createdAt).toLocaleDateString()}</td>
        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <button className="btn btn-sm btn-primary" disabled={Number(amount) <= 0 || save.isPending} onClick={() => save.mutate()}>Save</button>{" "}
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{entry.categoryName}</td>
      <td className="mono">${amount.toLocaleString()}</td>
      <td>{entry.note || <span className="muted">—</span>}</td>
      <td className="muted">{new Date(entry.createdAt).toLocaleDateString()}</td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        {!locked && (
          <>
            <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>{" "}
            <button className="btn btn-sm btn-danger" disabled={remove.isPending} onClick={() => remove.mutate()}>Delete</button>
          </>
        )}
        {error && <span className="error-box" style={{ display: "inline-block", marginLeft: 8, padding: "2px 8px", fontSize: 12 }}>{error}</span>}
      </td>
    </tr>
  );
}