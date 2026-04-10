"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import { getArtists, saveArtist, type Artist } from "@/lib/storage";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400/80",
  prospect: "bg-blue-500/10 text-blue-400/80",
  onboarding: "bg-amber-500/10 text-amber-400/80",
};

const stepLabels: Record<string, string> = {
  contact: "First Contact", call_scheduled: "Call Scheduled", proposal_sent: "Proposal Sent", signed: "Signed",
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function PopularityRing({ value }: { value: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value > 70 ? "#34d399" : value > 40 ? "#fbbf24" : "#ef4444";
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white/90 text-xl font-bold">{value}</span>
        <span className="text-white/20 text-[8px] uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

export default function RosterPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const hasSynced = useRef(false);

  const syncAll = useCallback(async () => {
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
              genres: data.genres || artist.genres,
              topTracks: data.topTracks?.length > 0
                ? data.topTracks.map((t: { name: string }) => t.name)
                : artist.topTracks,
            });
          }
        }
      } catch { /* silent */ }
    }
    const updated = getArtists();
    setArtists(updated);
    if (updated.length > 0 && !selected) setSelected(updated[0]);
    else if (selected) {
      const refreshed = updated.find(a => a.id === selected.id);
      if (refreshed) setSelected(refreshed);
    }
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  }, [selected]);

  useEffect(() => {
    const a = getArtists();
    setArtists(a);
    if (a.length > 0) setSelected(a[0]);
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncAll();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncOne = useCallback(async (artist: Artist) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/spotify?q=${encodeURIComponent(artist.stageName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id) {
          const updated: Artist = {
            ...artist,
            followers: data.followers,
            popularity: data.popularity,
            spotifyImageUrl: data.imageUrl || artist.spotifyImageUrl,
            spotifyId: data.id,
            spotify: data.spotifyUrl || artist.spotify,
            genres: data.genres || artist.genres,
            topTracks: data.topTracks?.length > 0
              ? data.topTracks.map((t: { name: string }) => t.name)
              : artist.topTracks,
          };
          saveArtist(updated);
          setArtists(getArtists());
          setSelected(updated);
        }
      }
    } catch { /* silent */ }
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  }, []);

  const totalFollowers = artists.reduce((s, a) => s + (a.followers || 0), 0);
  const avgPop = artists.filter(a => a.popularity).length > 0
    ? Math.round(artists.reduce((s, a) => s + (a.popularity || 0), 0) / artists.filter(a => a.popularity).length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/tru-logo.png" alt="Tru" width={32} height={32} className="rounded-lg" />
          <div>
            <h1 className="text-xl font-medium text-white/90">Artist Roster</h1>
            <p className="text-white/30 text-sm mt-1">{artists.length} artists &middot; {totalFollowers > 0 ? fmtNum(totalFollowers) + " total followers" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSync && <span className="text-white/15 text-[10px]">{lastSync}</span>}
          <button onClick={syncAll} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400/70 text-xs transition-colors cursor-pointer disabled:opacity-50">
            {syncing ? <><span className="inline-block w-3 h-3 border border-emerald-400/30 border-t-emerald-400/80 rounded-full animate-spin" /> Syncing...</> : "Sync All"}
          </button>
          <Link href="/dashboard/roster/onboard" className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white/80 text-xs transition-colors">
            + Onboard
          </Link>
        </div>
      </div>

      {/* Roster Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Total Followers</p>
          <p className="text-emerald-400/80 text-xl font-bold mt-1">{totalFollowers > 0 ? fmtNum(totalFollowers) : "—"}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Avg Popularity</p>
          <p className="text-blue-400/80 text-xl font-bold mt-1">{avgPop > 0 ? `${avgPop}/100` : "—"}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-white/20 text-[9px] uppercase tracking-wider">Active Artists</p>
          <p className="text-white/80 text-xl font-bold mt-1">{artists.filter(a => a.status === "active").length}</p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Left: Artist List */}
        <div className="md:col-span-2 space-y-2">
          {artists.map((artist, i) => (
            <motion.button key={artist.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(artist)}
              className={`w-full text-left glass rounded-2xl p-4 transition-all duration-300 cursor-pointer ${selected?.id === artist.id ? "border-white/20 bg-white/[0.06]" : "glass-hover"}`}
            >
              <div className="flex items-center gap-3">
                {(artist.spotifyImageUrl || artist.imageUrl) ? (
                  <img src={artist.spotifyImageUrl || artist.imageUrl} alt={artist.stageName} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-white/50 text-sm font-bold">{artist.stageName[0]}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-sm font-medium truncate">{artist.stageName}</p>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[artist.status] || "bg-white/[0.04] text-white/25"}`}>{artist.status}</span>
                  </div>
                  <p className="text-white/25 text-xs mt-0.5">{artist.genre}</p>
                  <div className="flex gap-3 mt-1">
                    {artist.followers != null && artist.followers > 0 && <span className="text-white/15 text-[10px]">{fmtNum(artist.followers)} followers</span>}
                    {artist.popularity != null && artist.popularity > 0 && <span className="text-white/15 text-[10px]">Pop: {artist.popularity}</span>}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Right: Artist Detail */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass rounded-2xl p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {(selected.spotifyImageUrl || selected.imageUrl) ? (
                      <img src={selected.spotifyImageUrl || selected.imageUrl} alt={selected.stageName} className="w-20 h-20 rounded-2xl object-cover shadow-xl" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                        <span className="text-white/40 text-3xl font-bold">{selected.stageName[0]}</span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-white/90 text-xl font-semibold">{selected.stageName}</h2>
                      <p className="text-white/30 text-sm">{selected.genre}</p>
                      {selected.genres && selected.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selected.genres.slice(0, 4).map(g => (
                            <span key={g} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/30">{g}</span>
                          ))}
                        </div>
                      )}
                      {selected.onboardingStep && <p className="text-amber-400/60 text-xs mt-1">{stepLabels[selected.onboardingStep]}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => syncOne(selected)} disabled={syncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400/80 text-xs transition-colors cursor-pointer disabled:opacity-50">
                      {syncing ? <><span className="inline-block w-3 h-3 border border-emerald-400/30 border-t-emerald-400/80 rounded-full animate-spin" /> Syncing</> : (
                        <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg> Sync</>
                      )}
                    </button>
                    <Link href={`/dashboard/epk?artist=${selected.id}`} className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/60 text-xs transition-colors">
                      EPK
                    </Link>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-2">Bio</p>
                  <p className="text-white/60 text-sm leading-relaxed">{selected.bio}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-4 flex flex-col items-center text-center">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider mb-1">Popularity</p>
                    {selected.popularity ? <PopularityRing value={selected.popularity} /> : <p className="text-white/30 text-lg mt-2">—</p>}
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider">Followers</p>
                    <p className="text-emerald-400/80 text-2xl font-bold mt-2">{selected.followers ? fmtNum(selected.followers) : "—"}</p>
                    <p className="text-white/15 text-[10px] mt-1">Spotify followers</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider">Status</p>
                    <p className="text-white/80 text-lg font-semibold mt-2 capitalize">{selected.status}</p>
                    <p className="text-white/15 text-[10px] mt-1">Management status</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-white/20 text-[9px] uppercase tracking-wider">Managed Since</p>
                    <p className="text-white/70 text-lg font-semibold mt-2">{new Date(selected.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                    <p className="text-white/15 text-[10px] mt-1">On roster</p>
                  </div>
                </div>

                {/* Top Tracks */}
                {selected.topTracks && selected.topTracks.length > 0 && (
                  <div>
                    <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-3">Top Tracks</p>
                    <div className="space-y-1">
                      {selected.topTracks.map((track, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors group">
                          <span className="text-white/10 text-xs font-mono w-5 text-right">{i + 1}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/30 group-hover:bg-emerald-400/60 transition-colors" />
                          <span className="text-white/60 text-sm group-hover:text-white/80 transition-colors">{track}</span>
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
                      <a href={selected.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-pink-400/70 text-xs transition-all">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        Instagram
                      </a>
                    )}
                    {selected.website && (
                      <a href={selected.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 text-xs transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        Website
                      </a>
                    )}
                    {selected.spotify && (
                      <a href={selected.spotify} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400/70 text-xs transition-all">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                        Open Spotify
                      </a>
                    )}
                  </div>
                </div>

                {/* Spotify Data Source */}
                {selected.spotifyId && (
                  <div className="pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
                      <span className="text-white/15 text-[10px]">Spotify ID: {selected.spotifyId}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                <p className="text-white/30 text-sm">Select an artist to view profile</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
