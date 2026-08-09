"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthCard, Field, useFormError } from "@/components/auth-shared";

export default function LoginPage() {
  const { login } = useAuth();
  const { error, setError } = useFormError();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <form onSubmit={submit}>
        <h1 style={{ fontSize: 18, margin: "0 0 12px" }}>Log in</h1>
        {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          No account? <Link href="/signup">Sign up</Link>
        </p>
      </form>
    </AuthCard>
  );
}