"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AuthCard, Field, useFormError } from "@/components/auth-shared";

export default function SignupPage() {
  const { signup } = useAuth();
  const { error, setError } = useFormError();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(email, password, name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <form onSubmit={submit}>
        <h1 style={{ fontSize: 18, margin: "0 0 12px" }}>Create your account</h1>
        {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
        </Field>
        <Field label="Email">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Password">
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </Field>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 4 }} disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </form>
    </AuthCard>
  );
}