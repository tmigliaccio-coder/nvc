"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { decodeTrackerToken } from "@/lib/payment-tracker-public";
import { FMT } from "@/lib/storage";
import { NVC_COMPANY, NVC_EMAIL } from "@/lib/nvc-brand";

function TrackerPublicBody() {
  const sp = useSearchParams();
  const raw = sp.get("t");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snap = useMemo(() => (raw ? decodeTrackerToken(raw) : null), [raw]);

  const onPay = async () => {
    if (!snap) return;
    setError(null);
    setPaying(true);
    try {
      const amountCents = Math.round(snap.amountDueNow * 100);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          invoiceNumber: `TRACK-${snap.id.slice(-6).toUpperCase()}`,
          customerName: "Client payment",
          itemName: snap.description,
          note: `${snap.category} receivable with late fees`,
        }),
      });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        setError(payload.error || "Could not open Stripe Checkout.");
        return;
      }
      window.location.href = payload.url;
    } catch (e) {
      setError(String(e));
    } finally {
      setPaying(false);
    }
  };

  if (!snap) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-white text-xl font-semibold">Payment link unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">Missing or invalid tracker token.</p>
          <Link href="/" className="mt-5 inline-block text-xs uppercase tracking-[0.2em] text-zinc-500">
            {NVC_COMPANY}
          </Link>
        </div>
      </div>
    );
  }

  const pastDue = snap.lateFeeAmount > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="max-w-3xl mx-auto px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/nvc-logo.png" alt={NVC_COMPANY} width={34} height={34} />
          <div>
            <p className="text-xs font-medium text-white/85">{NVC_COMPANY}</p>
            <p className="text-[10px] text-zinc-500">{NVC_EMAIL}</p>
          </div>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Payment portal</span>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-zinc-900/35 p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                {snap.category} work
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{snap.description}</h1>
            </div>
            <span
              className={`rounded px-3 py-1 text-xs font-semibold ${
                pastDue ? "bg-red-500/25 text-red-200" : "bg-emerald-500/15 text-emerald-200"
              }`}
            >
              {pastDue ? "PAST DUE" : "Current"}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-zinc-500 text-xs">Date issued</p>
              <p className="mt-1">{snap.dateIssued || "—"}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-zinc-500 text-xs">Due date</p>
              <p className="mt-1">{snap.dueDate || "—"}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-zinc-500 text-xs">Current balance</p>
              <p className="mt-1">{FMT.format(snap.currentBalance)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-200">Late fee</span>
              <span className="font-semibold text-red-200">{FMT.format(snap.lateFeeAmount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 mt-2 pt-2">
              <span className="text-white font-semibold">Amount due now</span>
              <span className="text-2xl font-bold">{FMT.format(snap.amountDueNow)}</span>
            </div>
          </div>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          <button
            type="button"
            onClick={onPay}
            disabled={paying || snap.amountDueNow < 0.5}
            className="w-full rounded-xl bg-[#635BFF] py-3.5 text-sm font-semibold text-white hover:bg-[#5851e6] disabled:opacity-40"
          >
            {paying ? "Opening checkout…" : `Pay ${FMT.format(snap.amountDueNow)}`}
          </button>
          <p className="text-center text-xs text-zinc-500">
            Secure checkout by Stripe. Card, Apple Pay, or Google Pay may appear based on device/browser.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function TrackerPublicPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-400">Loading…</div>}>
      <TrackerPublicBody />
    </Suspense>
  );
}
