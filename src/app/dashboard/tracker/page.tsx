"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  amountDueNow,
  clearTrackerRows,
  deleteTrackerRow,
  getLateWeeks,
  getTrackerRows,
  importRowsFromSheetPaste,
  lateFeeFromWeeks,
  manualLateFeeTotal,
  saveManyTrackerRows,
  type TrackerRow,
  weekKey,
} from "@/lib/payment-tracker";
import { encodeTrackerToken, publicTrackerUrl, trackerToSnapshot } from "@/lib/payment-tracker-public";
import { FMT } from "@/lib/storage";

function lateBadge(row: TrackerRow) {
  const weeks = getLateWeeks(row.dueDate);
  if (weeks <= 0) return { label: "On time", cls: "bg-emerald-500/10 text-emerald-300" };
  if (weeks <= 2) return { label: `Late ${weeks}w`, cls: "bg-amber-500/20 text-amber-200" };
  return { label: `VERY LATE ${weeks}w`, cls: "bg-red-500/25 text-red-200" };
}

export default function PaymentTrackerPage() {
  const [rows, setRows] = useState<TrackerRow[]>(() => getTrackerRows());
  const [sheetPaste, setSheetPaste] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<string>("ALL");
  const [importMsg, setImportMsg] = useState<string>("");

  const thisYear = new Date().getFullYear();
  const thisYearRows = useMemo(
    () =>
      rows.filter((r) => {
        if (!r.dateIssued) return true;
        return new Date(`${r.dateIssued}T12:00:00`).getFullYear() === thisYear;
      }),
    [rows, thisYear],
  );

  const weeks = useMemo(
    () =>
      Array.from(
        new Set(
          thisYearRows
            .map((r) => weekKey(r.dateIssued))
            .filter(Boolean),
        ),
      ).sort(),
    [thisYearRows],
  );

  const visibleRows = useMemo(() => {
    if (activeWeek === "ALL") return thisYearRows;
    return thisYearRows.filter((r) => weekKey(r.dateIssued) === activeWeek);
  }, [activeWeek, thisYearRows]);

  const totals = useMemo(() => {
    const open = visibleRows.reduce((s, r) => s + r.currentBalance, 0);
    const late = visibleRows.reduce((s, r) => {
      const auto = lateFeeFromWeeks(r.currentBalance, getLateWeeks(r.dueDate));
      const manual = manualLateFeeTotal(r);
      return s + Math.max(auto, manual);
    }, 0);
    const due = visibleRows.reduce((s, r) => s + amountDueNow(r), 0);
    return { open, late, due };
  }, [visibleRows]);

  const importRows = () => {
    const parsed = importRowsFromSheetPaste(sheetPaste);
    if (!parsed.length) {
      setImportMsg("No rows parsed. Paste directly from Google Sheets (with headers).");
      return;
    }
    saveManyTrackerRows(parsed);
    const next = getTrackerRows();
    setRows(next);
    setImportMsg(`Imported ${parsed.length} rows.`);
  };

  const copyPublic = async (row: TrackerRow) => {
    const late = Math.max(
      lateFeeFromWeeks(row.currentBalance, getLateWeeks(row.dueDate)),
      manualLateFeeTotal(row),
    );
    const due = row.currentBalance + late;
    const token = encodeTrackerToken(trackerToSnapshot(row, due, late));
    const url = publicTrackerUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedId(row.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#100b16] via-[#1b1224] to-[#120d19] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f97316]">
          Invoice payment tracker
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Weekly receivables dashboard</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Built for your Google Sheets format. Includes separate video and marketing rows,
          automatic 5% weekly late fee after day 30, and client-ready public pay links.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Open balance</p>
          <p className="mt-2 text-2xl font-semibold text-white">{FMT.format(totals.open)}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-red-200/70">Late fees</p>
          <p className="mt-2 text-2xl font-semibold text-red-200">{FMT.format(totals.late)}</p>
        </div>
        <div className="rounded-xl border border-[#635BFF]/30 bg-[#635BFF]/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d8d4ff]">Due now</p>
          <p className="mt-2 text-2xl font-semibold text-white">{FMT.format(totals.due)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveWeek("ALL")}
            className={`rounded px-3 py-1 text-xs ${
              activeWeek === "ALL" ? "bg-white/20 text-white" : "bg-white/5 text-zinc-400"
            }`}
          >
            All weeks ({thisYearRows.length})
          </button>
          {weeks.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setActiveWeek(w)}
              className={`rounded px-3 py-1 text-xs ${
                activeWeek === w ? "bg-white/20 text-white" : "bg-white/5 text-zinc-400"
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Original</th>
                <th className="py-2 pr-3">Issued</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Paid Total</th>
                <th className="py-2 pr-3">Paid Week</th>
                <th className="py-2 pr-3">Prev Bal</th>
                <th className="py-2 pr-3">Current Bal</th>
                <th className="py-2 pr-3">Late Fee</th>
                <th className="py-2 pr-3">Due Now</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const late = Math.max(
                  lateFeeFromWeeks(r.currentBalance, getLateWeeks(r.dueDate)),
                  manualLateFeeTotal(r),
                );
                const due = r.currentBalance + late;
                const b = lateBadge(r);
                return (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">
                      <span className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-white">{r.description}</td>
                    <td className="py-2 pr-3">{FMT.format(r.originalAmount)}</td>
                    <td className="py-2 pr-3">{r.dateIssued || "—"}</td>
                    <td className="py-2 pr-3">{r.dueDate || "—"}</td>
                    <td className="py-2 pr-3">{FMT.format(r.paymentsMadeTotal)}</td>
                    <td className="py-2 pr-3">{FMT.format(r.paymentsMadeThisWeek)}</td>
                    <td className="py-2 pr-3">{FMT.format(r.previousBalance)}</td>
                    <td className="py-2 pr-3">{FMT.format(r.currentBalance)}</td>
                    <td className="py-2 pr-3 text-red-200">{FMT.format(late)}</td>
                    <td className="py-2 pr-3 font-semibold text-white">{FMT.format(due)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-1 text-[10px] font-semibold ${b.cls}`}>
                          {b.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPublic(r)}
                          className="rounded bg-[#635BFF]/20 px-2 py-1 text-[10px] text-[#d8d4ff] hover:bg-[#635BFF]/35"
                        >
                          {copiedId === r.id ? "Copied" : "Copy pay link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteTrackerRow(r.id);
                            setRows(getTrackerRows());
                          }}
                          className="rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Import from Google Sheets</h2>
          <p className="text-xs text-zinc-500">
            Copy rows from your sheet and paste here. Supports your headers:
            Description, Original Amount, Date Issued, Due Date, Payments Made Total,
            Payments Made this week, Previous Balance, Current Balance, and optional
            Late Fees Week 1–4.
          </p>
          <textarea
            value={sheetPaste}
            onChange={(e) => setSheetPaste(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-zinc-200"
            placeholder="Paste tabular data from Google Sheets..."
          />
          {importMsg ? <p className="text-xs text-zinc-400">{importMsg}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={importRows}
              className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ea580c]"
            >
              Import rows
            </button>
            <button
              type="button"
              onClick={() => {
                clearTrackerRows();
                setRows(getTrackerRows());
              }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              Reset tracker
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Client payment experience</h2>
          <p className="text-sm text-zinc-400">
            Every row has a public pay link. Client sees current balance, late-fee
            breakdown, and a clear Stripe checkout CTA.
          </p>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li>• Late items are highlighted in amber/red.</li>
            <li>• Due now includes 5% weekly late fee after day 30.</li>
            <li>• Stripe CTA uses the exact amount shown on the public page.</li>
          </ul>
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center gap-2 text-sm text-[#d8d4ff] hover:text-white"
          >
            Open payments hub
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
