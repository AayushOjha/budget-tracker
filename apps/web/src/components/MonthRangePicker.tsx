"use client";

import { currentMonth, shiftMonth } from "@tracker/utils";



export function MonthRangePicker({
  start,
  end,
  onChange,
  maxMonths = 24,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  maxMonths?: number;
}) {
  const now = currentMonth();

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="field">
        <label>From</label>
        <input
          type="month"
          value={start}
          max={end}
          onChange={(e) => {
            if (!e.target.value) return;
            if (e.target.value > end) onChange(e.target.value, e.target.value);
            else onChange(e.target.value, end);
          }}
        />
      </div>
      <div className="field">
        <label>To</label>
        <input
          type="month"
          value={end}
          min={start}
          onChange={(e) => {
            if (!e.target.value) return;
            if (e.target.value < start) onChange(start, start);
            else onChange(start, e.target.value);
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-sm" onClick={() => onChange(shiftMonth(now, -1), now)}>
          Last 2 months
        </button>
        <button className="btn btn-sm" onClick={() => onChange(shiftMonth(now, -5), now)}>
          Last 6 months
        </button>
        <button className="btn btn-sm" onClick={() => onChange(`${now.slice(0, 4)}-01`, now)}>
          Year to date
        </button>
        <button className="btn btn-sm" onClick={() => onChange(shiftMonth(now, -maxMonths), now)}>
          Last {maxMonths} months
        </button>
      </div>
    </div>
  );
}