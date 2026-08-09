export function VarianceBadge({ variance, variancePct }: { variance: number | null; variancePct: number | null }) {
  if (variance === null) return <span className="muted">—</span>;

  const cls =
    Math.abs(variance) < 0.005 ? "variance-neutral" : variance < 0 ? "variance-negative" : "variance-positive";
  const sign = variance > 0 ? "+" : "";

  return (
    <span className={`mono ${cls}`}>
      {sign}
      {variance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {variancePct !== null && (
        <span className="muted" style={{ fontSize: 12 }}>
          {" "}
          ({sign}
          {variancePct.toFixed(2)}%)
        </span>
      )}
    </span>
  );
}