import type { TrackerRow } from "@/lib/payment-tracker";

export type PublicTrackerSnapshot = {
  v: 1;
  id: string;
  description: string;
  category: "video" | "marketing";
  dateIssued: string;
  dueDate: string;
  currentBalance: number;
  lateFeeAmount: number;
  amountDueNow: number;
};

function utf8ToBase64(s: string): string {
  if (typeof window !== "undefined") {
    return btoa(unescape(encodeURIComponent(s)));
  }
  return Buffer.from(s, "utf-8").toString("base64");
}

function base64ToUtf8(b64: string): string {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const standard = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof window !== "undefined") {
    return decodeURIComponent(escape(atob(standard)));
  }
  return Buffer.from(standard, "base64").toString("utf-8");
}

export function trackerToSnapshot(
  row: TrackerRow,
  amountDueNow: number,
  lateFeeAmount: number,
): PublicTrackerSnapshot {
  return {
    v: 1,
    id: row.id,
    description: row.description,
    category: row.category,
    dateIssued: row.dateIssued,
    dueDate: row.dueDate,
    currentBalance: row.currentBalance,
    lateFeeAmount,
    amountDueNow,
  };
}

export function encodeTrackerToken(snapshot: PublicTrackerSnapshot): string {
  return utf8ToBase64(JSON.stringify(snapshot))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeTrackerToken(token: string): PublicTrackerSnapshot | null {
  try {
    const raw = base64ToUtf8(token.trim());
    const parsed = JSON.parse(raw) as PublicTrackerSnapshot;
    if (parsed?.v !== 1 || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function publicTrackerUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/tracker?t=${encodeURIComponent(token)}`;
}
