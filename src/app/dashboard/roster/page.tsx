"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getArtists, type Artist } from "@/lib/storage";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400/80",
  prospect: "bg-blue-500/10 text-blue-400/80",
  onboarding: "bg-amber-500/10 text-amber-400/80",
};

const stepLabels: Record<string, string> = {
  contact: "First Contact",
  call_scheduled: "Call Scheduled",
  proposal_sent: "Proposal Sent",
  signed: "Signed",
};

export default function RosterPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selected, setSelected] = useState<Artist | null>(null);

  useEffect(() => {
    const a = getArtists();
    setArtists(a);
    if (a.length > 0) setSelected(a[0]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/tru-logo.png" alt="Tru" width={32} height={32} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-medium text-white/90">Artist Roster</h1>
            <p className="text-white/30 text-sm mt-1">{artists.length} artists managed by Tru Management</p>
          </div>
        </div>
        <Link href="/dashboard/roster/onboard" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white/80 text-xs uppercase tracking-[0.15em] transition-all duration-300">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Onboard Artist
        </Link>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Artist List */}
        <div className="md:col-span-2 space-y-2">
          {artists.map((artist, i) => (
            <motion.button
              key={artist.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(artist)}
              className={`w-full text-left glass rounded-2xl p-4 transition-all duration-300 cursor-pointer ${selected?.id === artist.id ? "border-white/20 bg-white/[0.06]" : "glass-hover"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                  <span className="text-white/50 text-sm font-bold">{artist.stageName[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-sm font-medium truncate">{artist.stageName}</p>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[artist.status] || "bg-white/[0.04] text-white/25"}`}>
                      {artist.status}
                    </span>
                  </div>
                  <p className="text-white/25 text-xs mt-0.5">{artist.genre}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Artist Detail */}
        <div className="md:col-span-3">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                    <span className="text-white/40 text-2xl font-bold">{selected.stageName[0]}</span>
                  </div>
                  <div>
                    <h2 className="text-white/90 text-xl font-medium">{selected.stageName}</h2>
                    <p className="text-white/30 text-sm">{selected.genre}</p>
                    {selected.onboardingStep && (
                      <p className="text-amber-400/60 text-xs mt-1">{stepLabels[selected.onboardingStep]}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/epk?artist=${selected.id}`} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 text-xs transition-colors">
                    Generate EPK
                  </Link>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-2">Bio</p>
                <p className="text-white/60 text-sm leading-relaxed">{selected.bio}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.2em]">Monthly Listeners</p>
                  <p className="text-white/80 text-lg font-semibold mt-1">{selected.monthlyListeners || "—"}</p>
                  <p className="text-white/20 text-[10px] mt-0.5">Connect Spotify for live data</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.2em]">Status</p>
                  <p className="text-white/80 text-lg font-semibold mt-1 capitalize">{selected.status}</p>
                  <p className="text-white/20 text-[10px] mt-0.5">Managed by Tru</p>
                </div>
              </div>

              {/* Top Tracks */}
              {selected.topTracks && selected.topTracks.length > 0 && (
                <div>
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-3">Top Tracks</p>
                  <div className="space-y-1">
                    {selected.topTracks.map((track, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                        <span className="text-white/15 text-xs font-mono w-5">{i + 1}</span>
                        <span className="text-white/60 text-sm">{track}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div>
                <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-3">Links</p>
                <div className="flex flex-wrap gap-2">
                  {selected.instagram && (
                    <a href={selected.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {selected.website && (
                    <a href={selected.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      Website
                    </a>
                  )}
                  {selected.spotify && (
                    <a href={selected.spotify} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs transition-colors">
                      Spotify
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <p className="text-white/30 text-sm">Select an artist to view profile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
