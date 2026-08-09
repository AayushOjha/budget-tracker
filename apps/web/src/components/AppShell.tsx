"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "Report" },
  { href: "/plans", label: "Plans" },
  { href: "/actuals", label: "Actuals" },
  { href: "/locks", label: "Locking" },
  { href: "/categories", label: "Categories" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 48px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "16px 0",
          borderBottom: "1px solid var(--border)",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Plan vs Actual</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {user.email}
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontWeight: active ? 650 : 450,
                  color: active ? "var(--primary)" : "var(--text-muted)",
                  background: active ? "var(--primary-soft)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button className="btn btn-sm" onClick={logout} style={{ marginLeft: "auto" }}>
          Log out
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}