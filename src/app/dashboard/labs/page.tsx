"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { getArtists, getInvoices, calcInvoiceTotal, FMT, type Artist } from "@/lib/storage";

/* ─── Types ─── */
interface QuickMsg { id: string; label: string; body: string; category: string }
interface Campaign { id: string; artist: string; title: string; platform: string; status: "live" | "scheduled" | "completed"; budget: number; reach: string; startDate: string; endDate: string }
interface Release { id: string; artist: string; title: string; type: "single" | "ep" | "album" | "deluxe"; status: "writing" | "recording" | "mixing" | "mastering" | "scheduled" | "released"; releaseDate: string; distributor: string }

/* ─── Static data ─── */
const TOOLS: { id: string; label: string; desc: string; icon: string; color: string }[] = [
  { id: "messages", label: "Quick Messages", desc: "Pre-built comms for every artist", icon: "💬", color: "text-blue-400/80" },
  { id: "campaigns", label: "Campaign Tracker", desc: "Active marketing & promo campaigns", icon: "📈", color: "text-emerald-400/80" },
  { id: "releases", label: "Release Planner", desc: "Pipeline for upcoming drops", icon: "🎵", color: "text-purple-400/80" },
  { id: "splits", label: "Revenue Splits", desc: "Calculate deal splits instantly", icon: "💰", color: "text-amber-400/80" },
  { id: "shows", label: "Show Calculator", desc: "Estimate live event revenue", icon: "🎤", color: "text-pink-400/80" },
  { id: "pitch", label: "Pitch Generator", desc: "Playlist & press pitch templates", icon: "📝", color: "text-cyan-400/80" },
  { id: "calendar", label: "Content Calendar", desc: "Plan posts & rollout strategy", icon: "📅", color: "text-orange-400/80" },
  { id: "royalties", label: "Royalty Estimator", desc: "Estimate streaming royalties", icon: "🏦", color: "text-lime-400/80" },
];

function buildMessages(artists: Artist[]): QuickMsg[] {
  const msgs: QuickMsg[] = [];
  for (const a of artists) {
    const n = a.stageName;
    const f = a.followers ? `${(a.followers / 1000).toFixed(1)}K` : "growing";
    msgs.push(
      { id: `${a.id}-stats`, label: `${n} — Stats Update`, category: "stats", body: `Hey ${n}! Your latest Spotify numbers are in — you're at ${f} followers and climbing. Popularity index is sitting at ${a.popularity || "—"}/100. Keep pushing content, the momentum is real.` },
      { id: `${a.id}-invoice`, label: `${n} — Invoice Ready`, category: "billing", body: `Hey ${n}, just a heads up — your latest invoice has been generated and is ready for review in the portal. Let me know if anything needs adjusting before we send it over.` },
      { id: `${a.id}-followup`, label: `${n} — Follow Up`, category: "followup", body: `Hey ${n}, just following up on our last conversation. Wanted to check if everything has been taken care of on your end. Let me know if you need anything from us.` },
      { id: `${a.id}-release`, label: `${n} — Release Check-in`, category: "release", body: `Hey ${n}! Quick check-in on the upcoming release. Where are we at with the final mix? We need to lock in the distribution timeline and get assets ready for the rollout campaign.` },
      { id: `${a.id}-social`, label: `${n} — Content Reminder`, category: "content", body: `Hey ${n}, quick reminder — we've got content scheduled for this week. Make sure to post the story we discussed and engage with fans in the comments for at least 30 mins after. Algorithm loves that.` },
      { id: `${a.id}-congrats`, label: `${n} — Milestone`, category: "milestone", body: `${n}!! Big congrats — you just crossed a major milestone. The numbers are looking incredible and the team is hyped. Let's set up a call to talk about how we capitalize on this momentum.` },
      { id: `${a.id}-meeting`, label: `${n} — Meeting Recap`, category: "meeting", body: `Hey ${n}, great call today. Here's a quick recap of what we discussed and next steps. Let me know if I missed anything or if priorities have shifted.` },
      { id: `${a.id}-collab`, label: `${n} — Collab Opportunity`, category: "collab", body: `Hey ${n}, we've got a potential collab opportunity that I think could be huge for you. Let me know when you're free to hop on a call and I'll walk you through the details.` },
      { id: `${a.id}-touring`, label: `${n} — Show/Touring`, category: "touring", body: `Hey ${n}, we've been getting some show inquiries. I'm putting together some options — venues, dates, and estimated guarantees. Let's connect this week to go over everything.` },
      { id: `${a.id}-press`, label: `${n} — Press Feature`, category: "press", body: `Hey ${n}, we landed a press opportunity. They want to run a feature and need some quotes and photos. I'll send over the brief — turnaround is about a week. Let me know if you're down.` },
    );
  }
  return msgs;
}

const defaultCampaigns: Campaign[] = [
  { id: "c1", artist: "Kid Trunks", title: "TNT Push — Spotify + TikTok", platform: "Spotify / TikTok", status: "live", budget: 5000, reach: "450K", startDate: "2026-04-01", endDate: "2026-04-30" },
  { id: "c2", artist: "Saego", title: "Debut Single Promo", platform: "Instagram / Spotify", status: "scheduled", budget: 2500, reach: "—", startDate: "2026-04-15", endDate: "2026-05-15" },
  { id: "c3", artist: "Shöckface", title: "HYPERWAVE Brand Launch", platform: "YouTube / TikTok", status: "live", budget: 3500, reach: "120K", startDate: "2026-03-20", endDate: "2026-04-20" },
  { id: "c4", artist: "Kid Trunks", title: "Members Only Anniversary", platform: "All Platforms", status: "completed", budget: 8000, reach: "1.2M", startDate: "2026-02-01", endDate: "2026-03-01" },
];

const defaultReleases: Release[] = [
  { id: "r1", artist: "Kid Trunks", title: "FACES (Deluxe)", type: "deluxe", status: "mastering", releaseDate: "2026-05-02", distributor: "DistroKid" },
  { id: "r2", artist: "Saego", title: "First Light", type: "single", status: "mixing", releaseDate: "2026-04-25", distributor: "TuneCore" },
  { id: "r3", artist: "Shöckface", title: "SPLITTING EP", type: "ep", status: "released", releaseDate: "2026-03-15", distributor: "DistroKid" },
  { id: "r4", artist: "Kid Trunks", title: "Southside Story", type: "album", status: "writing", releaseDate: "2026-Q3", distributor: "TBD" },
  { id: "r5", artist: "Shöckface", title: "HEADSHÖT (Remix)", type: "single", status: "recording", releaseDate: "2026-05-10", distributor: "DistroKid" },
];

const calendarEvents = [
  { day: "Mon", items: [{ time: "10a", label: "Trunks — IG Reel", color: "bg-pink-500/20 text-pink-400/80" }, { time: "2p", label: "Saego — Studio Session", color: "bg-blue-500/20 text-blue-400/80" }] },
  { day: "Tue", items: [{ time: "11a", label: "Shöckface — YT Upload", color: "bg-purple-500/20 text-purple-400/80" }, { time: "4p", label: "Team Sync Call", color: "bg-white/[0.06] text-white/40" }] },
  { day: "Wed", items: [{ time: "9a", label: "Trunks — TikTok Post", color: "bg-pink-500/20 text-pink-400/80" }, { time: "1p", label: "Press Interviews", color: "bg-emerald-500/20 text-emerald-400/80" }] },
  { day: "Thu", items: [{ time: "12p", label: "Saego — Spotify Pitch", color: "bg-blue-500/20 text-blue-400/80" }, { time: "3p", label: "Campaign Review", color: "bg-white/[0.06] text-white/40" }] },
  { day: "Fri", items: [{ time: "10a", label: "New Music Friday", color: "bg-emerald-500/20 text-emerald-400/80" }, { time: "5p", label: "Week Recap + Plan", color: "bg-white/[0.06] text-white/40" }] },
];

const pitchTemplates = [
  { id: "playlist", label: "Playlist Pitch", body: `Hi [Curator],\n\nI'm reaching out on behalf of [ARTIST] — currently at [FOLLOWERS] Spotify followers with a popularity index of [POP]/100. Their latest track "[TRACK]" is generating strong organic momentum and we believe it would be a perfect fit for [PLAYLIST NAME].\n\nThe track has [DESCRIPTION — e.g., "a dark, melodic hook over hard-hitting 808s that's resonating with the SoundCloud-to-Spotify crossover audience"].\n\nHappy to send over any additional assets. Thanks for your time.\n\nBest,\nTru Management / NVC` },
  { id: "press", label: "Press / Blog Pitch", body: `Hi [Editor],\n\nWanted to introduce you to [ARTIST], a [GENRE] artist managed by Tru Management. With [FOLLOWERS] followers and tracks like "[TRACK]", they're building serious momentum in the [SCENE] space.\n\n[1-2 SENTENCE STORY — origin, unique angle, viral moment, notable cosigns]\n\nWe'd love to set up an interview or feature. Available for phone, video, or written Q&A. Press kit attached.\n\nThanks,\nTru Management / NVC` },
  { id: "sync", label: "Sync / Licensing Pitch", body: `Hi [Supervisor],\n\nI'm submitting "[TRACK]" by [ARTIST] for sync consideration. The track is [TEMPO] BPM, [MOOD — e.g., "dark and atmospheric with building intensity"], and is fully cleared for sync.\n\nMaster: Controlled\nPublishing: [PUBLISHER / Self-published]\nPRO: [ASCAP/BMI]\nISRC: [CODE]\n\nHappy to provide stems, alternate versions, or instrumentals.\n\nBest,\nTru Management / NVC` },
  { id: "booking", label: "Booking / Show Pitch", body: `Hi [Promoter/Venue],\n\n[ARTIST] is currently booking for [SEASON/YEAR]. With [FOLLOWERS] Spotify followers and strong regional pull in [MARKETS], we're looking to build out [TOUR TYPE — club run, festival circuit, support slot].\n\nAvailability: [DATES]\nGuarantee range: $[MIN] – $[MAX]\nTechnical rider and promo assets available upon request.\n\nLet me know if there's interest.\n\nBest,\nTru Management / NVC` },
];

const statusColors: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400/80",
  scheduled: "bg-blue-500/15 text-blue-400/80",
  completed: "bg-white/[0.06] text-white/30",
  writing: "bg-amber-500/15 text-amber-400/80",
  recording: "bg-orange-500/15 text-orange-400/80",
  mixing: "bg-purple-500/15 text-purple-400/80",
  mastering: "bg-pink-500/15 text-pink-400/80",
  released: "bg-emerald-500/15 text-emerald-400/80",
};

const msgCategoryColors: Record<string, string> = {
  stats: "bg-emerald-500/10 text-emerald-400/60",
  billing: "bg-amber-500/10 text-amber-400/60",
  followup: "bg-blue-500/10 text-blue-400/60",
  release: "bg-purple-500/10 text-purple-400/60",
  content: "bg-pink-500/10 text-pink-400/60",
  milestone: "bg-yellow-500/10 text-yellow-400/60",
  meeting: "bg-white/[0.06] text-white/30",
  collab: "bg-cyan-500/10 text-cyan-400/60",
  touring: "bg-orange-500/10 text-orange-400/60",
  press: "bg-lime-500/10 text-lime-400/60",
};

export default function LabsPage() {
  const [activeTool, setActiveTool] = useState("messages");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [splitGross, setSplitGross] = useState("10000");
  const [splitMgmt, setSplitMgmt] = useState("20");
  const [splitLabel, setSplitLabel] = useState("0");
  const [splitDist, setSplitDist] = useState("15");
  const [showGuarantee, setShowGuarantee] = useState("5000");
  const [showMerch, setShowMerch] = useState("1500");
  const [showExpenses, setShowExpenses] = useState("2000");
  const [showMgmtCut, setShowMgmtCut] = useState("20");
  const [streams, setStreams] = useState("1000000");
  const [streamRate, setStreamRate] = useState("0.004");

  useEffect(() => { setArtists(getArtists()); }, []);

  const messages = useMemo(() => buildMessages(artists), [artists]);
  const invoices = useMemo(() => getInvoices(), []);

  const filteredMsgs = selectedArtist === "all" ? messages : messages.filter(m => m.id.startsWith(selectedArtist));

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Split calculator
  const gross = parseFloat(splitGross) || 0;
  const mgmtPct = parseFloat(splitMgmt) || 0;
  const labelPct = parseFloat(splitLabel) || 0;
  const distPct = parseFloat(splitDist) || 0;
  const mgmtAmt = gross * (mgmtPct / 100);
  const labelAmt = gross * (labelPct / 100);
  const distAmt = gross * (distPct / 100);
  const artistNet = gross - mgmtAmt - labelAmt - distAmt;

  // Show calculator
  const sGuarantee = parseFloat(showGuarantee) || 0;
  const sMerch = parseFloat(showMerch) || 0;
  const sExpenses = parseFloat(showExpenses) || 0;
  const sMgmtPct = parseFloat(showMgmtCut) || 0;
  const sGross = sGuarantee + sMerch;
  const sNet = sGross - sExpenses;
  const sMgmt = sNet * (sMgmtPct / 100);
  const sArtist = sNet - sMgmt;

  // Royalty estimator
  const estStreams = parseFloat(streams) || 0;
  const estRate = parseFloat(streamRate) || 0;
  const estGross = estStreams * estRate;
  const estMgmt = estGross * (mgmtPct / 100);
  const estArtist = estGross - estMgmt;

  // Summary stats
  const totalCampaignBudget = defaultCampaigns.filter(c => c.status !== "completed").reduce((s, c) => s + c.budget, 0);
  const paidRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + calcInvoiceTotal(i).total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-white/90 flex items-center gap-2">
            <span className="text-lg">⚡</span> Labs
          </h1>
          <p className="text-white/30 text-sm mt-1">Internal tools & management workflows</p>
        </div>
        <div className="flex gap-2">
          <div className="glass rounded-lg px-3 py-1.5">
            <p className="text-white/20 text-[9px] uppercase tracking-wider">Active Campaigns</p>
            <p className="text-emerald-400/80 text-sm font-semibold">{defaultCampaigns.filter(c => c.status === "live").length}</p>
          </div>
          <div className="glass rounded-lg px-3 py-1.5">
            <p className="text-white/20 text-[9px] uppercase tracking-wider">Campaign Budget</p>
            <p className="text-amber-400/80 text-sm font-semibold">{FMT.format(totalCampaignBudget)}</p>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 hidden md:block">
            <p className="text-white/20 text-[9px] uppercase tracking-wider">Revenue</p>
            <p className="text-white/80 text-sm font-semibold">{FMT.format(paidRevenue)}</p>
          </div>
        </div>
      </motion.div>

      {/* Tool Grid */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {TOOLS.map((tool) => (
          <button key={tool.id} onClick={() => setActiveTool(tool.id)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300 cursor-pointer ${activeTool === tool.id ? "bg-white/[0.08] ring-1 ring-white/10" : "bg-white/[0.02] hover:bg-white/[0.04]"}`}>
            <span className="text-lg">{tool.icon}</span>
            <span className={`text-[9px] uppercase tracking-wider text-center leading-tight ${activeTool === tool.id ? "text-white/70" : "text-white/25"}`}>{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool Content */}
      <AnimatePresence mode="wait">
        {/* ─── QUICK MESSAGES ─── */}
        {activeTool === "messages" && (
          <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedArtist("all")} className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${selectedArtist === "all" ? "bg-white/[0.08] text-white/70" : "bg-white/[0.02] text-white/25 hover:text-white/40"}`}>All Artists</button>
              {artists.map(a => (
                <button key={a.id} onClick={() => setSelectedArtist(a.id)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${selectedArtist === a.id ? "bg-white/[0.08] text-white/70" : "bg-white/[0.02] text-white/25 hover:text-white/40"}`}>
                  {(a.spotifyImageUrl || a.imageUrl) && <img src={a.spotifyImageUrl || a.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover" />}
                  {a.stageName}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {filteredMsgs.map((msg) => (
                <div key={msg.id} className="glass rounded-xl p-4 group hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${msgCategoryColors[msg.category] || "bg-white/[0.04] text-white/20"}`}>{msg.category}</span>
                      <p className="text-white/60 text-xs font-medium">{msg.label}</p>
                    </div>
                    <button onClick={() => copy(msg.body, msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-[10px] cursor-pointer">
                      {copiedId === msg.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white/30 text-xs leading-relaxed line-clamp-3">{msg.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── CAMPAIGN TRACKER ─── */}
        {activeTool === "campaigns" && (
          <motion.div key="campaigns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {defaultCampaigns.map((c) => (
              <div key={c.id} className="glass rounded-xl p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>{c.status}</span>
                    <span className="text-white/15 text-[10px]">{c.platform}</span>
                  </div>
                  <p className="text-white/80 text-sm font-medium">{c.title}</p>
                  <p className="text-white/25 text-xs mt-1">{c.artist} &middot; {c.startDate} → {c.endDate}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white/60 text-sm font-semibold">{FMT.format(c.budget)}</p>
                  <p className="text-white/20 text-[10px] mt-0.5">Reach: {c.reach}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ─── RELEASE PLANNER ─── */}
        {activeTool === "releases" && (
          <motion.div key="releases" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {defaultReleases.map((r) => (
              <div key={r.id} className="glass rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                      <span className="text-white/15 text-[10px] uppercase">{r.type}</span>
                    </div>
                    <p className="text-white/80 text-sm font-medium">{r.title}</p>
                    <p className="text-white/25 text-xs mt-1">{r.artist} &middot; {r.distributor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-sm">{r.releaseDate}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${r.status === "released" ? "bg-emerald-500/40 w-full" : r.status === "mastering" ? "bg-pink-500/40 w-[80%]" : r.status === "mixing" ? "bg-purple-500/40 w-[60%]" : r.status === "recording" ? "bg-orange-500/40 w-[40%]" : r.status === "writing" ? "bg-amber-500/40 w-[20%]" : "bg-blue-500/40 w-[90%]"}`} />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ─── REVENUE SPLITS ─── */}
        {activeTool === "splits" && (
          <motion.div key="splits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Gross Revenue</label>
                <input value={splitGross} onChange={e => setSplitGross(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Management %</label>
                <input value={splitMgmt} onChange={e => setSplitMgmt(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Label %</label>
                <input value={splitLabel} onChange={e => setSplitLabel(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Distribution %</label>
                <input value={splitDist} onChange={e => setSplitDist(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-white/20 text-[9px] uppercase tracking-wider">Management</p>
                <p className="text-amber-400/80 text-lg font-bold mt-1">{FMT.format(mgmtAmt)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{mgmtPct}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-white/20 text-[9px] uppercase tracking-wider">Label</p>
                <p className="text-purple-400/80 text-lg font-bold mt-1">{FMT.format(labelAmt)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{labelPct}%</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-white/20 text-[9px] uppercase tracking-wider">Distribution</p>
                <p className="text-blue-400/80 text-lg font-bold mt-1">{FMT.format(distAmt)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{distPct}%</p>
              </div>
              <div className="bg-emerald-500/5 rounded-xl p-4 ring-1 ring-emerald-500/10">
                <p className="text-emerald-400/40 text-[9px] uppercase tracking-wider">Artist Net</p>
                <p className="text-emerald-400/90 text-lg font-bold mt-1">{FMT.format(artistNet)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{(100 - mgmtPct - labelPct - distPct).toFixed(1)}%</p>
              </div>
            </div>
            {/* Visual bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-white/[0.04]">
              <div style={{ width: `${mgmtPct}%` }} className="bg-amber-500/40 transition-all" />
              <div style={{ width: `${labelPct}%` }} className="bg-purple-500/40 transition-all" />
              <div style={{ width: `${distPct}%` }} className="bg-blue-500/40 transition-all" />
              <div style={{ width: `${Math.max(0, 100 - mgmtPct - labelPct - distPct)}%` }} className="bg-emerald-500/30 transition-all" />
            </div>
          </motion.div>
        )}

        {/* ─── SHOW CALCULATOR ─── */}
        {activeTool === "shows" && (
          <motion.div key="shows" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Guarantee $</label>
                <input value={showGuarantee} onChange={e => setShowGuarantee(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Merch Sales $</label>
                <input value={showMerch} onChange={e => setShowMerch(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Expenses $</label>
                <input value={showExpenses} onChange={e => setShowExpenses(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Management %</label>
                <input value={showMgmtCut} onChange={e => setShowMgmtCut(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Gross", value: FMT.format(sGross), color: "text-white/70" },
                { label: "Expenses", value: `−${FMT.format(sExpenses)}`, color: "text-red-400/70" },
                { label: "Net", value: FMT.format(sNet), color: "text-white/80" },
                { label: "Mgmt Cut", value: FMT.format(sMgmt), color: "text-amber-400/80" },
                { label: "Artist Take", value: FMT.format(sArtist), color: "text-emerald-400/90" },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-white/20 text-[9px] uppercase tracking-wider">{s.label}</p>
                  <p className={`${s.color} text-lg font-bold mt-1`}>{s.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── PITCH GENERATOR ─── */}
        {activeTool === "pitch" && (
          <motion.div key="pitch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {pitchTemplates.map((p) => (
              <div key={p.id} className="glass rounded-xl p-5 group">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/70 text-sm font-medium">{p.label}</p>
                  <button onClick={() => copy(p.body, p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-white/40 text-xs cursor-pointer">
                    {copiedId === p.id ? "Copied!" : "Copy Template"}
                  </button>
                </div>
                <pre className="text-white/30 text-xs leading-relaxed whitespace-pre-wrap font-sans">{p.body}</pre>
              </div>
            ))}
          </motion.div>
        )}

        {/* ─── CONTENT CALENDAR ─── */}
        {activeTool === "calendar" && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass rounded-2xl p-5">
              <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] mb-4">This Week</p>
              <div className="grid grid-cols-5 gap-3">
                {calendarEvents.map((day) => (
                  <div key={day.day}>
                    <p className="text-white/40 text-xs font-medium mb-2 text-center">{day.day}</p>
                    <div className="space-y-2">
                      {day.items.map((item, i) => (
                        <div key={i} className={`${item.color} rounded-lg p-2.5 text-center`}>
                          <p className="text-[10px] opacity-60">{item.time}</p>
                          <p className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── ROYALTY ESTIMATOR ─── */}
        {activeTool === "royalties" && (
          <motion.div key="royalties" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Total Streams</label>
                <input value={streams} onChange={e => setStreams(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Per-Stream Rate $</label>
                <input value={streamRate} onChange={e => setStreamRate(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div>
                <label className="text-white/25 text-[10px] uppercase tracking-[0.15em] block mb-2">Mgmt % (from splits)</label>
                <input value={splitMgmt} onChange={e => setSplitMgmt(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-white/20 transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-white/20 text-[9px] uppercase tracking-wider">Gross Royalties</p>
                <p className="text-white/80 text-xl font-bold mt-1">{FMT.format(estGross)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{(estStreams / 1000).toFixed(0)}K streams × ${estRate}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4">
                <p className="text-white/20 text-[9px] uppercase tracking-wider">Management</p>
                <p className="text-amber-400/80 text-xl font-bold mt-1">{FMT.format(estMgmt)}</p>
                <p className="text-white/10 text-[10px] mt-0.5">{mgmtPct}% of gross</p>
              </div>
              <div className="bg-emerald-500/5 rounded-xl p-4 ring-1 ring-emerald-500/10">
                <p className="text-emerald-400/40 text-[9px] uppercase tracking-wider">Artist Payout</p>
                <p className="text-emerald-400/90 text-xl font-bold mt-1">{FMT.format(estArtist)}</p>
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-xl p-4">
              <p className="text-white/20 text-[9px] uppercase tracking-wider mb-3">Platform Rate Comparison</p>
              <div className="space-y-2">
                {[
                  { platform: "Spotify", rate: 0.004, color: "bg-emerald-500/30" },
                  { platform: "Apple Music", rate: 0.008, color: "bg-pink-500/30" },
                  { platform: "Amazon Music", rate: 0.004, color: "bg-blue-500/30" },
                  { platform: "YouTube Music", rate: 0.002, color: "bg-red-500/30" },
                  { platform: "Tidal", rate: 0.013, color: "bg-cyan-500/30" },
                ].map(p => (
                  <div key={p.platform} className="flex items-center gap-3">
                    <span className="text-white/30 text-xs w-28">{p.platform}</span>
                    <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full`} style={{ width: `${(p.rate / 0.015) * 100}%` }} />
                    </div>
                    <span className="text-white/30 text-xs w-16 text-right">${p.rate}</span>
                    <span className="text-white/15 text-[10px] w-20 text-right">{FMT.format(estStreams * p.rate)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
