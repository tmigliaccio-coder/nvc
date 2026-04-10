"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { getInvoices, getArtists, saveArtist, calcInvoiceTotal, FMT, type Invoice, type Artist } from "@/lib/storage";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function DashboardOverview() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const syncAllArtists = useCallback(async () => {
    setSyncing(true);
    const current = getArtists();
    for (const artist of current) {
      try {
        const res = await fetch(`/api/spotify?q=${encodeURIComponent(artist.stageName)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            saveArtist({
              ...artist,
              followers: data.followers,
              popularity: data.popularity,
              spotifyImageUrl: data.imageUrl || artist.spotifyImageUrl,
              spotifyId: data.id,
              spotify: data.spotifyUrl || artist.spotify,
              topTracks: data.topTracks?.length > 0
                ? data.topTracks.map((t: { name: string }) => t.name)
                : artist.topTracks,
            });
          }
        }
      } catch { /* silent */ }
    }
    setArtists(getArtists());
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  }, []);

  useEffect(() => {
    setInvoices(getInvoices());
    setArtists(getArtists());
    syncAllArtists();
  }, [syncAllArtists]);

  const openInvoices = invoices.filter((i) => i.status === "pending" || i.status === "draft");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const openTotal = openInvoices.reduce((s, i) => s + calcInvoiceTotal(i).total, 0);
  const paidTotal = paidInvoices.reduce((s, i) => s + calcInvoiceTotal(i).total, 0);
  const totalFollowers = artists.reduce((s, a) => s + (a.followers || 0), 0);
  const avgPopularity = artists.filter(a => a.popularity).length > 0
    ? Math.round(artists.reduce((s, a) => s + (a.popularity || 0), 0) / artists.filter(a => a.popularity).length)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/tru-logo.png" alt="Tru Management" width={48} height={48} className="rounded-xl" />
          <div>
            <h1 className="text-xl font-medium text-white/90">Welcome back, Joe</h1>
            <p className="text-white/30 text-sm mt-1">Tru Management Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && <span className="text-white/15 text-[10px]">Synced {lastSync}</span>}
          <button onClick={syncAllArtists} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400/70 text-xs transition-colors cursor-pointer disabled:opacity-50">
            {syncing ? (
              <><span className="inline-block w-3 h-3 border border-emerald-400/30 border-t-emerald-400/80 rounded-full animate-spin" /> Syncing...</>
            ) : (
              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh</>
            )}
          </button>
        </div>
      </motion.div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Followers", value: totalFollowers > 0 ? fmtNum(totalFollowers) : "—", sub: `Across ${artists.length} artists`, color: "text-emerald-400/80" },
          { label: "Avg Popularity", value: avgPopularity > 0 ? `${avgPopularity}/100` : "—", sub: "Spotify popularity index", color: "text-blue-400/80" },
          { label: "Open Invoices", value: String(openInvoices.length), sub: FMT.format(openTotal) + " outstanding", color: "text-amber-400/80" },
          { label: "Revenue Collected", value: FMT.format(paidTotal), sub: `${paidInvoices.length} paid invoices`, color: "text-white/80" },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i + 1} variants={fadeUp} initial="hidden" animate="visible" className="glass rounded-2xl p-4">
            <p className="text-white/25 text-[10px] uppercase tracking-[0.2em]">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-2 ${stat.color}`}>{stat.value}</p>
            <p className="text-white/20 text-xs mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Artist Spotify Cards */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white/25 text-[10px] uppercase tracking-[0.3em]">Artist Roster — Spotify Data</h2>
          <Link href="/dashboard/roster" className="text-white/25 hover:text-white/50 text-[10px] uppercase tracking-[0.2em] transition-colors">View All</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {artists.map((a) => {
            const img = a.spotifyImageUrl || a.imageUrl;
            return (
              <Link key={a.id} href="/dashboard/roster" className="glass glass-hover rounded-2xl p-5 transition-all duration-500 group">
                <div className="flex items-center gap-3 mb-4">
                  {img ? (
                    <img src={img} alt={a.stageName} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <span className="text-white/40 font-bold">{a.stageName[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate group-hover:text-white transition-colors">{a.stageName}</p>
                    <p className="text-white/25 text-xs">{a.genre}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider">Followers</p>
                    <p className="text-white/80 text-sm font-semibold mt-0.5">{a.followers ? fmtNum(a.followers) : "—"}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-2.5">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider">Popularity</p>
                    <p className="text-white/80 text-sm font-semibold mt-0.5">{a.popularity ? `${a.popularity}/100` : "—"}</p>
                  </div>
                </div>

                {a.topTracks && a.topTracks.length > 0 && (
                  <div>
                    <p className="text-white/15 text-[9px] uppercase tracking-wider mb-1.5">Top Tracks</p>
                    {a.topTracks.slice(0, 3).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-white/10 text-[10px] font-mono w-3">{i + 1}</span>
                        <span className="text-white/40 text-xs truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {a.spotify && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04]">
                    <span className="text-emerald-400/40 text-[10px] flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Connected
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-white/25 text-[10px] uppercase tracking-[0.3em] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { title: "New Invoice", href: "/dashboard/invoices/new", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg> },
            { title: "Artist Roster", href: "/dashboard/roster", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
            { title: "EPK Generator", href: "/dashboard/epk", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
            { title: "Transcripts", href: "/dashboard/transcripts", icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> },
          ].map((a) => (
            <Link key={a.title} href={a.href} className="glass glass-hover rounded-2xl p-5 flex flex-col gap-3 transition-all duration-500 group">
              <span className="text-white/30 group-hover:text-white/60 transition-colors">{a.icon}</span>
              <p className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">{a.title}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Invoices */}
      <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white/25 text-[10px] uppercase tracking-[0.3em]">Recent Invoices</h2>
          <Link href="/dashboard/invoices" className="text-white/25 hover:text-white/50 text-[10px] uppercase tracking-[0.2em] transition-colors">View All</Link>
        </div>
        <div className="glass rounded-2xl overflow-hidden">
          {invoices.slice(0, 5).map((inv, i) => (
            <div key={inv.id} className={`flex items-center justify-between px-5 py-4 ${i < Math.min(invoices.length, 5) - 1 ? "border-b border-white/[0.04]" : ""}`}>
              <div><p className="text-white/70 text-sm font-medium">{inv.billToName}</p><p className="text-white/25 text-xs">#{inv.invoiceNumber} &middot; {new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p></div>
              <div className="flex items-center gap-4">
                <span className="text-white/70 text-sm font-medium">{FMT.format(calcInvoiceTotal(inv).total)}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${inv.status === "paid" ? "bg-emerald-500/10 text-emerald-400/80" : inv.status === "pending" ? "bg-amber-500/10 text-amber-400/80" : "bg-white/[0.04] text-white/30"}`}>{inv.status}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
