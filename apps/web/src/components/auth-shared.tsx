"use client";

import { useState } from "react";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 400, margin: "10vh auto 0", padding: "0 20px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 750 }}>Plan vs Actual Tracker</div>
        <div className="muted">Monthly spending targets, actuals, and variance.</div>
      </div>
      <div className="card">{children}</div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>
        Demo account: demo@example.com / demo1234
      </p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function useFormError() {
  const [error, setError] = useState<string | null>(null);
  return { error, setError };
}