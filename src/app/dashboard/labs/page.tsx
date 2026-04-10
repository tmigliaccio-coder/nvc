"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { calcInvoiceTotal, FMT, getArtists, getInvoices, type Artist } from "@/lib/storage";

type LabAppId = "messages" | "campaigns" | "planner" | "finance";
type MessageTab = "artist" | "weekly" | "general";

interface LabApp {
  id: LabAppId;
  title: string;
  subtitle: string;
}

interface CampaignTask {
  id: string;
  owner: string;
  task: string;
  due: string;
  status: "todo" | "in_progress" | "review" | "done";
}

interface WeeklyDraft {
  weekOf: string;
  headline: string;
  wins: string;
  priorities: string;
  blockers: string;
  followers: string;
  streams: string;
}

interface PlannerEvent {
  id: string;
  artist: string;
  title: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  time: string;
  channel: "Spotify" | "Instagram" | "TikTok" | "YouTube" | "Internal";
}

const LAB_APPS: LabApp[] = [
  { id: "messages", title: "Message Desk", subtitle: "Artist comms templates and quick follow-ups" },
  { id: "campaigns", title: "Campaign Ops", subtitle: "Structured marketing execution board" },
  { id: "planner", title: "Content Planner", subtitle: "Weekly agenda and publish calendar" },
  { id: "finance", title: "Finance Tools", subtitle: "Splits, royalty and show estimators" },
];

const campaignTasks: CampaignTask[] = [
  { id: "t1", owner: "Management", task: "Approve final ad creative set", due: "Apr 12", status: "review" },
  { id: "t2", owner: "Artist", task: "Submit Marquee targeting sheet", due: "Apr 11", status: "in_progress" },
  { id: "t3", owner: "Management", task: "Finalize release assets package", due: "Apr 14", status: "todo" },
  { id: "t4", owner: "Both", task: "Upload DSP pitch form", due: "Apr 13", status: "in_progress" },
  { id: "t5", owner: "Artist", task: "Deliver teaser clip set", due: "Apr 10", status: "done" },
  { id: "t6", owner: "Management", task: "QA scheduled posts", due: "Apr 11", status: "review" },
  { id: "t7", owner: "Both", task: "Campaign recap PDF", due: "Apr 18", status: "todo" },
];

const plannerEvents: PlannerEvent[] = [
  { id: "e1", artist: "Kid Trunks", title: "Single teaser post", day: "Mon", time: "10:00", channel: "Instagram" },
  { id: "e2", artist: "Saego", title: "Studio recap clip", day: "Mon", time: "15:00", channel: "TikTok" },
  { id: "e3", artist: "Shöckface", title: "Visualizer upload", day: "Tue", time: "13:00", channel: "YouTube" },
  { id: "e4", artist: "Kid Trunks", title: "Spotify Canvas update", day: "Wed", time: "11:00", channel: "Spotify" },
  { id: "e5", artist: "Saego", title: "Behind the scenes story", day: "Thu", time: "14:30", channel: "Instagram" },
  { id: "e6", artist: "Team", title: "Weekly alignment call", day: "Fri", time: "16:00", channel: "Internal" },
];

const generalOutreachTemplates = [
  {
    id: "promoter",
    title: "Promoter Follow-up",
    text: "Hi [PROMOTER], following up on [ARTIST] for [DATE/CITY]. We can hold the date while finalizing logistics and guarantee terms.",
  },
  {
    id: "venue",
    title: "Venue Hold Request",
    text: "Hi [VENUE], we want to place a hold for [ARTIST] on [DATE]. Please share room details, settlement terms, and technical specs.",
  },
  {
    id: "sponsor",
    title: "Sponsor Outreach",
    text: "Hi [BRAND], we want to discuss a partnership with [ARTIST] around [CAMPAIGN]. Happy to share deliverables and timeline.",
  },
  {
    id: "vendor",
    title: "Production Coordination",
    text: "Hi [VENDOR], confirming scope for [PROJECT] on [DATE]. Please send quote, timeline, and delivery checkpoints.",
  },
];

function makeMessages(artists: Artist[]) {
  return artists.flatMap((artist) => {
    const n = artist.stageName;
    const followers = artist.followers ? artist.followers.toLocaleString() : "latest";
    return [
      { id: `${artist.id}-stats`, artistId: artist.id, title: "Stats update", text: `Hey ${n}, your new song stats are ready below. You're currently at ${followers} Spotify followers and building steady momentum this week.` },
      { id: `${artist.id}-invoice`, artistId: artist.id, title: "Invoice follow-up", text: `Hey ${n}, your invoice is ready to be processed. Just following up to confirm this has been completed on your side.` },
      { id: `${artist.id}-release`, artistId: artist.id, title: "Release check-in", text: `Hey ${n}, quick check-in on the upcoming release. If masters and cover are locked today, we can keep your timeline on track.` },
      { id: `${artist.id}-touring`, artistId: artist.id, title: "Touring update", text: `Hey ${n}, we have new live opportunities coming in. Sending hold options shortly so we can prioritize by guarantee and city.` },
    ];
  });
}

function statusClasses(status: CampaignTask["status"]) {
  if (status === "todo") return "bg-zinc-800 text-zinc-300";
  if (status === "in_progress") return "bg-blue-500/20 text-blue-300";
  if (status === "review") return "bg-amber-500/20 text-amber-300";
  return "bg-emerald-500/20 text-emerald-300";
}

export default function LabsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [openApp, setOpenApp] = useState<LabAppId | null>(null);
  const [messageTab, setMessageTab] = useState<MessageTab>("artist");
  const [selectedArtist, setSelectedArtist] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [taskRows, setTaskRows] = useState<CampaignTask[]>(campaignTasks);
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>({
    weekOf: new Date().toISOString().slice(0, 10),
    headline: "",
    wins: "",
    priorities: "",
    blockers: "",
    followers: "",
    streams: "",
  });
  const [splitGross, setSplitGross] = useState("10000");
  const [splitMgmt, setSplitMgmt] = useState("20");
  const [splitLabel, setSplitLabel] = useState("0");
  const [splitDist, setSplitDist] = useState("15");
  const [showGuarantee, setShowGuarantee] = useState("6000");
  const [showMerch, setShowMerch] = useState("1500");
  const [showExpenses, setShowExpenses] = useState("2500");
  const [showMgmt, setShowMgmt] = useState("20");
  const [streams, setStreams] = useState("1000000");
  const [rate, setRate] = useState("0.004");

  useEffect(() => {
    setArtists(getArtists());
  }, []);

  const invoices = useMemo(() => getInvoices(), []);
  const paidRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + calcInvoiceTotal(i).total, 0);
  const messages = useMemo(() => makeMessages(artists), [artists]);
  const filteredMessages = selectedArtist === "all" ? messages : messages.filter((m) => m.artistId === selectedArtist);
  const activeArtist = artists.find((a) => a.id === selectedArtist) || artists[0];
  const weeklyPreview = `Hey ${activeArtist?.stageName || "team"}, weekly update (${weeklyDraft.weekOf}): ${weeklyDraft.headline || "No headline yet"}. Wins: ${weeklyDraft.wins || "-"}. Priorities: ${weeklyDraft.priorities || "-"}. Blockers: ${weeklyDraft.blockers || "-"}. Followers: ${weeklyDraft.followers || "-"}. Streams: ${weeklyDraft.streams || "-"}.`;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };
  const updateTask = (id: string, patch: Partial<CampaignTask>) => {
    setTaskRows((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const gross = Number(splitGross) || 0;
  const mgmtPct = Number(splitMgmt) || 0;
  const labelPct = Number(splitLabel) || 0;
  const distPct = Number(splitDist) || 0;
  const mgmtCut = gross * (mgmtPct / 100);
  const labelCut = gross * (labelPct / 100);
  const distCut = gross * (distPct / 100);
  const artistNet = Math.max(0, gross - mgmtCut - labelCut - distCut);

  const showGross = (Number(showGuarantee) || 0) + (Number(showMerch) || 0);
  const showNet = showGross - (Number(showExpenses) || 0);
  const showMgmtCut = showNet * ((Number(showMgmt) || 0) / 100);
  const showArtist = showNet - showMgmtCut;

  const royaltyGross = (Number(streams) || 0) * (Number(rate) || 0);
  const royaltyMgmt = royaltyGross * (mgmtPct / 100);
  const royaltyArtist = royaltyGross - royaltyMgmt;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-medium text-white/90">Labs</h1>
          <p className="text-white/35 text-sm mt-1">Operational tools modeled after management agency workflows</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-white/30">Paid revenue</p>
            <p className="text-white/80 font-semibold">{FMT.format(paidRevenue)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <p className="text-white/30">Open tasks</p>
            <p className="text-white/80 font-semibold">{taskRows.filter((t) => t.status !== "done").length}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {LAB_APPS.map((app) => (
          <button
            key={app.id}
            onClick={() => setOpenApp(app.id)}
            className="text-left rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5"
          >
            <p className="text-white/85 text-sm font-medium">{app.title}</p>
            <p className="text-white/35 text-xs mt-1">{app.subtitle}</p>
            <p className="text-white/20 text-[10px] uppercase tracking-[0.15em] mt-4">Open App</p>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {openApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-10"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="h-full rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden"
            >
              <div className="h-14 border-b border-white/10 px-5 flex items-center justify-between">
                <p className="text-white/85 text-sm font-medium">{LAB_APPS.find((a) => a.id === openApp)?.title}</p>
                <button onClick={() => setOpenApp(null)} className="text-white/40 hover:text-white/70 text-xs uppercase tracking-[0.15em]">
                  Close
                </button>
              </div>
              <div className="h-[calc(100%-56px)] overflow-y-auto p-5">
                {openApp === "messages" && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button onClick={() => setMessageTab("artist")} className={`px-3 py-1.5 rounded-lg text-xs ${messageTab === "artist" ? "bg-white/10 text-white/90" : "bg-white/[0.03] text-white/40"}`}>Artist Messages</button>
                      <button onClick={() => setMessageTab("weekly")} className={`px-3 py-1.5 rounded-lg text-xs ${messageTab === "weekly" ? "bg-white/10 text-white/90" : "bg-white/[0.03] text-white/40"}`}>Weekly Updates</button>
                      <button onClick={() => setMessageTab("general")} className={`px-3 py-1.5 rounded-lg text-xs ${messageTab === "general" ? "bg-white/10 text-white/90" : "bg-white/[0.03] text-white/40"}`}>General Outreach</button>
                    </div>

                    {messageTab === "artist" && (
                      <>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => setSelectedArtist("all")} className={`px-3 py-1.5 rounded-lg text-xs ${selectedArtist === "all" ? "bg-white/10 text-white/90" : "bg-white/[0.03] text-white/40"}`}>All Artists</button>
                          {artists.map((a) => (
                            <button key={a.id} onClick={() => setSelectedArtist(a.id)} className={`px-3 py-1.5 rounded-lg text-xs ${selectedArtist === a.id ? "bg-white/10 text-white/90" : "bg-white/[0.03] text-white/40"}`}>{a.stageName}</button>
                          ))}
                        </div>
                        <div className="grid lg:grid-cols-2 gap-3">
                          {filteredMessages.map((msg) => (
                            <div key={msg.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white/80 text-sm">{msg.title}</p>
                                <button onClick={() => copy(msg.text, msg.id)} className="text-[11px] text-white/45 hover:text-white/80 uppercase tracking-[0.12em]">
                                  {copied === msg.id ? "Copied" : "Copy"}
                                </button>
                              </div>
                              <p className="text-white/45 text-sm leading-relaxed">{msg.text}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {messageTab === "weekly" && (
                      <div className="grid lg:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                          <input value={weeklyDraft.headline} onChange={(e) => setWeeklyDraft((p) => ({ ...p, headline: e.target.value }))} placeholder="Weekly headline" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80" />
                          <textarea value={weeklyDraft.wins} onChange={(e) => setWeeklyDraft((p) => ({ ...p, wins: e.target.value }))} placeholder="Key wins" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80" />
                          <textarea value={weeklyDraft.priorities} onChange={(e) => setWeeklyDraft((p) => ({ ...p, priorities: e.target.value }))} placeholder="Priorities" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80" />
                          <div className="grid grid-cols-2 gap-2">
                            <input value={weeklyDraft.followers} onChange={(e) => setWeeklyDraft((p) => ({ ...p, followers: e.target.value }))} placeholder="Followers delta" className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80" />
                            <input value={weeklyDraft.streams} onChange={(e) => setWeeklyDraft((p) => ({ ...p, streams: e.target.value }))} placeholder="Streams delta" className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80" />
                          </div>
                          <button onClick={() => copy(weeklyPreview, "weekly-preview")} className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-xs uppercase tracking-[0.12em]">{copied === "weekly-preview" ? "Copied" : "Copy Weekly Update"}</button>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                          <p className="text-white/70 text-xs mb-2 uppercase tracking-[0.12em]">Preview</p>
                          <p className="text-white/45 text-sm leading-relaxed">{weeklyPreview}</p>
                        </div>
                      </div>
                    )}

                    {messageTab === "general" && (
                      <div className="grid lg:grid-cols-2 gap-3">
                        {generalOutreachTemplates.map((tpl) => (
                          <div key={tpl.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white/80 text-sm">{tpl.title}</p>
                              <button onClick={() => copy(tpl.text, tpl.id)} className="text-[11px] text-white/45 hover:text-white/80 uppercase tracking-[0.12em]">
                                {copied === tpl.id ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <p className="text-white/45 text-sm leading-relaxed">{tpl.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {openApp === "campaigns" && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-white/35 text-[10px] uppercase tracking-[0.15em]">To Do</p>
                        <p className="text-white/80 text-lg font-semibold mt-1">{taskRows.filter((t) => t.status === "todo").length}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-white/35 text-[10px] uppercase tracking-[0.15em]">In Progress</p>
                        <p className="text-white/80 text-lg font-semibold mt-1">{taskRows.filter((t) => t.status === "in_progress").length}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-white/35 text-[10px] uppercase tracking-[0.15em]">Review</p>
                        <p className="text-white/80 text-lg font-semibold mt-1">{taskRows.filter((t) => t.status === "review").length}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-white/35 text-[10px] uppercase tracking-[0.15em]">Done</p>
                        <p className="text-white/80 text-lg font-semibold mt-1">{taskRows.filter((t) => t.status === "done").length}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-12 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white/35">
                        <div className="col-span-5">Task</div>
                        <div className="col-span-3">Artist</div>
                        <div className="col-span-2">Due</div>
                        <div className="col-span-2">Status</div>
                      </div>
                      {taskRows.map((task) => (
                        <div key={task.id} className="grid grid-cols-12 px-4 py-3 border-t border-white/5 text-sm items-center">
                          <div className="col-span-5 text-white/75">{task.task}</div>
                          <div className="col-span-3 text-white/55">
                            <select value={task.owner} onChange={(e) => updateTask(task.id, { owner: e.target.value })} className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/70">
                              <option>Management</option>
                              <option>Artist</option>
                              <option>Both</option>
                            </select>
                          </div>
                          <div className="col-span-2 text-white/45">
                            <input value={task.due} onChange={(e) => updateTask(task.id, { due: e.target.value })} className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white/70" />
                          </div>
                          <div className="col-span-2">
                            <select value={task.status} onChange={(e) => updateTask(task.id, { status: e.target.value as CampaignTask["status"] })} className={`w-full px-2 py-1 rounded-md text-[11px] uppercase tracking-[0.12em] ${statusClasses(task.status)}`}>
                              <option value="todo">todo</option>
                              <option value="in_progress">in progress</option>
                              <option value="review">review</option>
                              <option value="done">done</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {openApp === "planner" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <div className="grid grid-cols-6 bg-white/[0.03]">
                        <div className="p-3 text-[11px] uppercase tracking-[0.12em] text-white/35">Time</div>
                        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                          <div key={day} className="p-3 text-[11px] uppercase tracking-[0.12em] text-white/35 border-l border-white/10">{day}</div>
                        ))}
                      </div>
                      {["10:00", "11:00", "13:00", "15:00", "16:00"].map((slot) => (
                        <div key={slot} className="grid grid-cols-6 border-t border-white/5 min-h-16">
                          <div className="p-3 text-xs text-white/40">{slot}</div>
                          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => {
                            const match = plannerEvents.find((e) => e.day === day && e.time === slot);
                            return (
                              <div key={`${day}-${slot}`} className="border-l border-white/5 p-2">
                                {match && (
                                  <div className="rounded-md bg-white/[0.06] border border-white/10 p-2">
                                    <p className="text-xs text-white/85">{match.title}</p>
                                    <p className="text-[11px] text-white/45 mt-1">{match.artist} · {match.channel}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-white/70 text-sm font-medium">Upcoming Agenda</p>
                      <div className="mt-2 space-y-2">
                        {plannerEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between text-sm border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
                            <span className="text-white/70">{event.day} {event.time} · {event.title}</span>
                            <span className="text-white/40">{event.artist}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {openApp === "finance" && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-white/80 text-sm font-medium mb-3">Revenue Split Calculator</p>
                      <div className="grid md:grid-cols-4 gap-3 mb-3">
                        <input value={splitGross} onChange={(e) => setSplitGross(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Gross" />
                        <input value={splitMgmt} onChange={(e) => setSplitMgmt(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Mgmt %" />
                        <input value={splitLabel} onChange={(e) => setSplitLabel(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Label %" />
                        <input value={splitDist} onChange={(e) => setSplitDist(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Distribution %" />
                      </div>
                      <div className="grid md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Management</p><p className="text-white/80">{FMT.format(mgmtCut)}</p></div>
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Label</p><p className="text-white/80">{FMT.format(labelCut)}</p></div>
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Distribution</p><p className="text-white/80">{FMT.format(distCut)}</p></div>
                        <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20"><p className="text-emerald-300/70">Artist Net</p><p className="text-emerald-200">{FMT.format(artistNet)}</p></div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-white/80 text-sm font-medium mb-3">Show Profit Estimator</p>
                      <div className="grid md:grid-cols-4 gap-3 mb-3">
                        <input value={showGuarantee} onChange={(e) => setShowGuarantee(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Guarantee" />
                        <input value={showMerch} onChange={(e) => setShowMerch(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Merch" />
                        <input value={showExpenses} onChange={(e) => setShowExpenses(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Expenses" />
                        <input value={showMgmt} onChange={(e) => setShowMgmt(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Mgmt %" />
                      </div>
                      <div className="grid md:grid-cols-4 gap-3 text-sm">
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Show Gross</p><p className="text-white/80">{FMT.format(showGross)}</p></div>
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Show Net</p><p className="text-white/80">{FMT.format(showNet)}</p></div>
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Mgmt Cut</p><p className="text-white/80">{FMT.format(showMgmtCut)}</p></div>
                        <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20"><p className="text-emerald-300/70">Artist Take</p><p className="text-emerald-200">{FMT.format(showArtist)}</p></div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-white/80 text-sm font-medium mb-3">Royalty Estimator</p>
                      <div className="grid md:grid-cols-3 gap-3 mb-3">
                        <input value={streams} onChange={(e) => setStreams(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Streams" />
                        <input value={rate} onChange={(e) => setRate(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Rate" />
                        <input value={splitMgmt} onChange={(e) => setSplitMgmt(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80" placeholder="Mgmt %" />
                      </div>
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Gross Royalties</p><p className="text-white/80">{FMT.format(royaltyGross)}</p></div>
                        <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-white/35">Mgmt Share</p><p className="text-white/80">{FMT.format(royaltyMgmt)}</p></div>
                        <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/20"><p className="text-emerald-300/70">Artist Net</p><p className="text-emerald-200">{FMT.format(royaltyArtist)}</p></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
