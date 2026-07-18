"use client";

import { useMemo, useState } from "react";
import { RETENTION_DAYS, toISODate } from "@/lib/dates";
import { EtlRun } from "@/lib/types";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface CalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  etlRuns: EtlRun[];
}

export function Calendar({ selectedDate, onSelect, etlRuns }: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
  );

  const runByDate = useMemo(() => {
    const map = new Map<string, EtlRun>();
    for (const run of etlRuns) map.set(run.run_date, run);
    return map;
  }, [etlRuns]);

  const windowStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  windowStart.setUTCDate(windowStart.getUTCDate() - (RETENTION_DAYS - 1));

  const startWeekday = viewMonth.getUTCDay();
  const totalDays = new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from(
      { length: totalDays },
      (_, i) => new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth(), i + 1)),
    ),
  ];

  function changeMonth(delta: number) {
    setViewMonth(new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + delta, 1)));
  }

  function isDisabled(d: Date): boolean {
    return d > today || d < windowStart;
  }

  return (
    <div className="rounded-md border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="px-1 text-white/50 hover:text-white" aria-label="Previous month">
          ‹
        </button>
        <div className="flex items-center gap-1.5 text-sm">
          <span>{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
          <span
            className="cursor-help text-white/30"
            title={`Archive available for the last ${RETENTION_DAYS} days`}
          >
            ⓘ
          </span>
        </div>
        <button onClick={() => changeMonth(1)} className="px-1 text-white/50 hover:text-white" aria-label="Next month">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-white/40">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISODate(d);
          const disabled = isDisabled(d);
          const run = runByDate.get(iso);
          const isRedditOnly = !disabled && run?.twitter_ok === false;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              title={isRedditOnly ? "Reddit-Only Mode -- Twitter scraping was unavailable" : undefined}
              className={`relative rounded py-1.5 text-xs transition-colors ${
                disabled ? "cursor-not-allowed text-white/15" : "text-white/80 hover:bg-white/10"
              } ${isSelected ? "bg-white text-black hover:bg-white" : ""}`}
            >
              {d.getUTCDate()}
              {isRedditOnly && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
