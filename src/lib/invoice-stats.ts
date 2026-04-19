import { calcInvoiceTotal, type Invoice } from "@/lib/storage";

export function summarizeInvoices(invoices: Invoice[]) {
  const open = invoices.filter((i) => i.status === "pending" || i.status === "draft");
  const paid = invoices.filter((i) => i.status === "paid");
  const openTotal = open.reduce((s, i) => s + calcInvoiceTotal(i).total, 0);
  const paidTotal = paid.reduce((s, i) => s + calcInvoiceTotal(i).total, 0);
  return {
    totalCount: invoices.length,
    openCount: open.length,
    paidCount: paid.length,
    openTotal,
    paidTotal,
  };
}
