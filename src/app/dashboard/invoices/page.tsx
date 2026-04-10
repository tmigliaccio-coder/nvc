"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getInvoices, type Invoice } from "@/lib/storage";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function invoiceTotal(inv: Invoice) {
  return inv.lineItems.reduce((s, li) => s + (parseFloat(li.amount.replace(/[^0-9.]/g, "")) || 0), 0);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => setInvoices(getInvoices()), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/tru-logo.png" alt="Tru" width={32} height={32} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-medium text-white/90">Invoices</h1>
            <p className="text-white/30 text-sm mt-1">Create and manage client invoices</p>
          </div>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white/80 text-xs uppercase tracking-[0.15em] transition-all duration-300"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.04]">
          <span className="col-span-2 text-white/20 text-[10px] uppercase tracking-[0.2em]">Invoice</span>
          <span className="col-span-3 text-white/20 text-[10px] uppercase tracking-[0.2em]">Client</span>
          <span className="col-span-3 text-white/20 text-[10px] uppercase tracking-[0.2em]">Scope</span>
          <span className="col-span-2 text-white/20 text-[10px] uppercase tracking-[0.2em] text-right">Amount</span>
          <span className="col-span-2 text-white/20 text-[10px] uppercase tracking-[0.2em] text-right">Status</span>
        </div>

        {invoices.map((inv, i) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`grid grid-cols-12 gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors ${i < invoices.length - 1 ? "border-b border-white/[0.04]" : ""}`}
          >
            <div className="col-span-6 md:col-span-2">
              <p className="text-white/60 text-sm font-mono">#{inv.invoiceNumber}</p>
              <p className="text-white/25 text-xs">{new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="col-span-6 md:col-span-3 text-right md:text-left">
              <p className="text-white/70 text-sm">{inv.billToName}</p>
            </div>
            <div className="col-span-3 hidden md:block">
              <p className="text-white/40 text-sm truncate">{inv.campaignScope}</p>
            </div>
            <div className="col-span-6 md:col-span-2 md:text-right">
              <p className="text-white/80 text-sm font-medium">{formatCurrency(invoiceTotal(inv))}</p>
            </div>
            <div className="col-span-6 md:col-span-2 text-right">
              <span className={`inline-block text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400/80" : inv.status === "pending" ? "bg-amber-500/10 text-amber-400/80" : "bg-white/[0.04] text-white/30"}`}>{inv.status}</span>
            </div>
          </motion.div>
        ))}

        {invoices.length === 0 && (
          <div className="px-5 py-12 text-center text-white/20 text-sm">No invoices yet</div>
        )}
      </div>
    </div>
  );
}
