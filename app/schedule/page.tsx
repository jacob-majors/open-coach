"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS } from "@/lib/protocols";
import type { ProtocolType } from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TEAMS = [
  { value: "all", label: "All Teams" },
  { value: "1", label: "Team 1" },
  { value: "2", label: "Team 2" },
  { value: "3", label: "Team 3" },
  { value: "4", label: "Team 4" },
];

const TEAM_COLORS: Record<string, string> = {
  "1": "bg-red-500/10 text-red-400 border-red-500/20",
  "2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "3": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "4": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

interface Practice {
  id: number;
  title: string;
  comp_team: number | null;
  practice_date: string;
  start_time: string | null;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  is_recurring: number;
  recurrence_rule: string | null;
  plan_id: number | null;
  coach_name: string | null;
  coach_username: string | null;
  // Linked practice plan
  practice_plan_id: number | null;
  session_name: string | null;
  day_type: string | null;
  warmup_id: string | null;
  blocks: string | null;
  cooldown: string | null;
  plan_coach_notes: string | null;
  plan_total_minutes: number | null;
}

interface Coach {
  id: number;
  username: string;
  display_name: string | null;
}

interface WorkoutRow {
  id: number;
  name: string;
  protocol_type: ProtocolType;
  hang_time_s: number | null;
  rest_time_s: number | null;
  reps: number | null;
  sets: number | null;
  intensity_percent: number | null;
  completed: boolean;
}

interface DayData { day: number; workouts: WorkoutRow[]; }
interface WeekData { week: number; days: DayData[]; isCurrent: boolean; }

interface ScheduleData {
  plan: { id: number; title: string; focus: string; duration_weeks: number; started_at: string; } | null;
  weeks: WeekData[];
  currentWeek: number;
  currentDayOfWeek: number;
}

const EMPTY_FORM = {
  title: "", compTeam: "all", practiceDate: "", startTime: "",
  durationMinutes: "90", location: "", notes: "",
  coachId: "", isRecurring: false, recurrenceRule: "weekly", recurrenceEndDate: "",
};

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(practices: Practice[]) {
  const map: Record<string, Practice[]> = {};
  for (const p of practices) {
    if (!map[p.practice_date]) map[p.practice_date] = [];
    map[p.practice_date].push(p);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const isCoach = user?.role === "coach" || user?.role === "admin";

  // Athlete state
  const [schedData, setSchedData] = useState<ScheduleData | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Coach state
  const [practices, setPractices] = useState<Practice[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filterTeam, setFilterTeam] = useState("all");
  const [fetching, setFetching] = useState(true);

  // Subscribe modal
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Import from iCal URL
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importTeam, setImportTeam] = useState("all");
  const [importLimit, setImportLimit] = useState(50);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // New practice modal
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Practice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFetching(false); return; }

    if (isCoach) {
      fetch(`/api/practices?team=${filterTeam}`)
        .then((r) => r.json())
        .then((d) => { setPractices(d.practices || []); setCoaches(d.coaches || []); })
        .finally(() => setFetching(false));
    } else {
      fetch("/api/schedule")
        .then((r) => r.json())
        .then((d) => { setSchedData(d); setExpandedWeek(d.currentWeek || 1); })
        .finally(() => setFetching(false));
    }
  }, [user, loading, isCoach, filterTeam]);

  if (loading || fetching) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-48 rounded animate-pulse bg-white/[0.05] mb-6" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-white/40 mb-4">Sign in to view your calendar</p>
        <Link href="/auth/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  const createPractice = async () => {
    setSaving(true);
    await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        compTeam: form.compTeam !== "all" ? parseInt(form.compTeam) : null,
        practiceDate: form.practiceDate,
        startTime: form.startTime || null,
        durationMinutes: parseInt(form.durationMinutes) || 90,
        location: form.location || null,
        notes: form.notes || null,
        coachId: form.coachId ? parseInt(form.coachId) : null,
        isRecurring: form.isRecurring,
        recurrenceRule: form.isRecurring ? form.recurrenceRule : null,
        recurrenceEndDate: form.isRecurring ? form.recurrenceEndDate : null,
      }),
    });
    const d = await fetch(`/api/practices?team=${filterTeam}`).then((r) => r.json());
    setPractices(d.practices || []);
    setShowNew(false);
    setForm(EMPTY_FORM);
    setSaving(false);
  };

  const deletePractice = async (p: Practice, all = false) => {
    setDeleting(true);
    await fetch(`/api/practices/${p.id}${all ? "?deleteAll=true" : ""}`, { method: "DELETE" });
    const d = await fetch(`/api/practices?team=${filterTeam}`).then((r) => r.json());
    setPractices(d.practices || []);
    setDeleteTarget(null);
    setDeleting(false);
  };

  // ── Coach view ──────────────────────────────────────────────────────────────
  if (isCoach) {
    const grouped = groupByDate(practices);

    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="mt-1 text-sm text-white/40">Upcoming practices</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setShowImport(true); setImportResult(null); setImportUrl(""); setImportTeam(filterTeam !== "all" ? filterTeam : "2"); setImportLimit(50); }}
              className="btn-ghost text-sm flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Import
            </button>
            <button onClick={() => setShowSubscribe(true)}
              className="btn-ghost text-sm flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12a1 1 0 11-2 0 1 1 0 012 0zM0 5c3.866 0 7 3.134 7 7H5.5C5.5 9.015 3.985 7.5 2 7.5V5zM0 1C6.627 1 11 6.373 11 13H9.5C9.5 7.201 5.799 3.5 0 3.5V1z" fill="currentColor"/>
              </svg>
              Subscribe
            </button>
            <button onClick={() => { setShowNew(true); setForm({ ...EMPTY_FORM, practiceDate: today }); }}
              className="btn-primary text-sm">+ Practice</button>
          </div>
        </div>

        {/* Team filter */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 overflow-x-auto">
          {TEAMS.map((t) => (
            <button key={t.value} onClick={() => setFilterTeam(t.value)}
              className={`flex-1 shrink-0 rounded-lg py-2 text-xs font-medium transition ${
                filterTeam === t.value ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-white/40 mb-3">No upcoming practices</p>
            <button onClick={() => setShowNew(true)} className="btn-secondary text-sm">Schedule a Practice</button>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, pracs]) => {
              const isToday = date === today;
              const isPast = date < today;
              return (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className={`text-xs font-semibold uppercase tracking-wider ${isToday ? "text-brand-400" : isPast ? "text-white/20" : "text-white/50"}`}>
                      {isToday ? "Today — " : ""}{formatDate(date)}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.05]" />
                  </div>
                  <div className="space-y-2">
                    {pracs.map((p) => (
                      <PracticeCard key={p.id} practice={p} onDelete={() => setDeleteTarget(p)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
            onClick={(e) => { if (e.target === e.currentTarget && !importing) setShowImport(false); }}>
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Import from iCal</h2>
                <button onClick={() => setShowImport(false)} disabled={importing} className="text-white/40 hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">iCal URL</label>
                  <input type="url" className="input font-mono text-xs" placeholder="https://calendar.google.com/calendar/ical/..."
                    value={importUrl} onChange={(e) => setImportUrl(e.target.value)} disabled={importing} />
                  <p className="mt-1 text-xs text-white/30">Paste a public .ics / iCal link. Practices up to 1 year out will be imported.</p>
                </div>
                <div>
                  <label className="label">Assign to Team</label>
                  <select className="input" value={importTeam} onChange={(e) => setImportTeam(e.target.value)} disabled={importing}>
                    <option value="all">No specific team</option>
                    {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Comp Team {t}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label">Max events to import</label>
                    <span className="text-xs font-semibold text-brand-400">{importLimit === 200 ? "All" : importLimit}</span>
                  </div>
                  <input type="range" min={5} max={200} step={5} value={importLimit}
                    onChange={(e) => setImportLimit(Number(e.target.value))} disabled={importing}
                    className="w-full accent-brand-500" />
                  <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
                    <span>5</span><span>All</span>
                  </div>
                </div>
                {importResult && (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                    ✓ Imported {importResult.imported} practice{importResult.imported !== 1 ? "s" : ""}
                    {importResult.skipped > 0 && <span className="text-white/40"> · {importResult.skipped} skipped (already exist or out of range)</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  disabled={importing || !importUrl.trim()}
                  onClick={async () => {
                    setImporting(true);
                    setImportResult(null);
                    try {
                      const res = await fetch("/api/calendar/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          url: importUrl.trim(),
                          compTeam: importTeam !== "all" ? parseInt(importTeam) : null,
                          limit: importLimit < 200 ? importLimit : null,
                        }),
                      });
                      const d = await res.json();
                      if (d.success) {
                        setImportResult({ imported: d.imported, skipped: d.skipped });
                        const updated = await fetch(`/api/practices?team=${filterTeam}`).then((r) => r.json());
                        setPractices(updated.practices || []);
                      }
                    } finally {
                      setImporting(false);
                    }
                  }}
                  className="btn-primary flex-1">
                  {importing ? "Importing..." : "Import Practices"}
                </button>
                <button onClick={() => setShowImport(false)} disabled={importing} className="btn-ghost px-4">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Subscribe Modal */}
        {showSubscribe && (
          <SubscribeModal
            filterTeam={filterTeam}
            onClose={() => { setShowSubscribe(false); setCopiedUrl(null); }}
            copiedUrl={copiedUrl}
            setCopiedUrl={setCopiedUrl}
          />
        )}

        {/* New Practice Modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">New Practice</h2>
                <button onClick={() => setShowNew(false)} className="text-white/40 hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="label">Title</label>
                  <input type="text" className="input" placeholder="e.g. Comp Team Practice"
                    value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" className="input"
                      value={form.practiceDate} onChange={(e) => setForm((f) => ({ ...f, practiceDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Start Time</label>
                    <input type="time" className="input"
                      value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Duration (min)</label>
                    <input type="number" className="input" placeholder="90"
                      value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Team</label>
                    <select className="input" value={form.compTeam}
                      onChange={(e) => setForm((f) => ({ ...f, compTeam: e.target.value }))}>
                      <option value="all">All Teams</option>
                      {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Comp Team {t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input type="text" className="input" placeholder="Gym name or address"
                    value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Assign Coach</label>
                  <select className="input" value={form.coachId}
                    onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))}>
                    <option value="">No coach assigned</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name || c.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input resize-none min-h-[60px]" placeholder="Drill focus, equipment needed..."
                    value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>

                {/* Repeat toggle */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))}>
                    <div className={`relative h-5 w-9 rounded-full transition ${form.isRecurring ? "bg-brand-500" : "bg-white/10"}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.isRecurring ? "left-4" : "left-0.5"}`} />
                    </div>
                    <span className="text-sm text-white/70">Repeat this practice</span>
                  </div>
                  {form.isRecurring && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Frequency</label>
                        <select className="input" value={form.recurrenceRule}
                          onChange={(e) => setForm((f) => ({ ...f, recurrenceRule: e.target.value }))}>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Every 2 weeks</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Until</label>
                        <input type="date" className="input"
                          value={form.recurrenceEndDate} onChange={(e) => setForm((f) => ({ ...f, recurrenceEndDate: e.target.value }))} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={createPractice}
                  disabled={saving || !form.title || !form.practiceDate || (form.isRecurring && !form.recurrenceEndDate)}
                  className="btn-primary flex-1">
                  {saving ? "Saving..." : form.isRecurring ? "Create Recurring" : "Create Practice"}
                </button>
                <button onClick={() => setShowNew(false)} className="btn-ghost px-4">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl">
              <h2 className="text-base font-semibold text-white mb-2">Delete Practice</h2>
              <p className="text-sm text-white/60 mb-4">
                Delete <span className="text-white">{deleteTarget.title}</span> on {formatDate(deleteTarget.practice_date)}?
              </p>
              <div className="flex gap-2">
                {deleteTarget.is_recurring ? (
                  <>
                    <button onClick={() => deletePractice(deleteTarget, false)} disabled={deleting}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2.5 text-xs text-white hover:bg-white/10 transition">
                      This one only
                    </button>
                    <button onClick={() => deletePractice(deleteTarget, true)} disabled={deleting}
                      className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition">
                      All in series
                    </button>
                  </>
                ) : (
                  <button onClick={() => deletePractice(deleteTarget, false)} disabled={deleting}
                    className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition">
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Athlete view ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="mt-1 text-sm text-white/40">Your training schedule</p>
        </div>
        <Link href="/plans" className="btn-ghost text-sm shrink-0">Change plan</Link>
      </div>
      {!schedData?.plan ? (
        <div className="card flex flex-col items-center py-16 text-center gap-4">
          <div className="text-4xl opacity-30">📅</div>
          <p className="text-white font-semibold">No active plan</p>
          <p className="text-sm text-white/40">Browse training plans and activate one to see your schedule</p>
          <Link href="/plans" className="btn-primary mt-2">Browse Plans</Link>
        </div>
      ) : (
        <MySchedule data={schedData} expandedWeek={expandedWeek} setExpandedWeek={setExpandedWeek} />
      )}
    </div>
  );
}

// ── Subscribe Modal ───────────────────────────────────────────────────────────

function SubscribeModal({ filterTeam, onClose, copiedUrl, setCopiedUrl }: {
  filterTeam: string;
  onClose: () => void;
  copiedUrl: string | null;
  setCopiedUrl: (url: string | null) => void;
}) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const teamParam = filterTeam !== "all" ? `?team=${filterTeam}` : "";
  const icalUrl = `${base}/api/calendar/ical${teamParam}`;
  const rssUrl = `${base}/api/calendar/rss${teamParam}`;

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Subscribe to Calendar</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {filterTeam !== "all" && (
          <p className="text-xs text-white/40 mb-4">
            Showing feed for <span className="text-brand-400">Comp Team {filterTeam}</span>. Switch the team filter to get a different team&apos;s feed.
          </p>
        )}

        <div className="space-y-3">
          {/* iCal */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-semibold text-white">iCal / ICS Feed</p>
                <p className="text-xs text-white/40 mt-0.5">Works with Google Calendar, Apple Calendar, Outlook</p>
              </div>
              <span className="shrink-0 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 text-[10px] font-semibold">
                Recommended
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <input readOnly value={icalUrl}
                className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-xs text-white/50 font-mono truncate" />
              <button onClick={() => copy(icalUrl)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  copiedUrl === icalUrl ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}>
                {copiedUrl === icalUrl ? "Copied!" : "Copy"}
              </button>
            </div>
            <a href={icalUrl} className="mt-2 inline-block text-xs text-brand-400 hover:underline">
              Download .ics file →
            </a>
          </div>

          {/* RSS */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2">
              <p className="text-sm font-semibold text-white">RSS Feed</p>
              <p className="text-xs text-white/40 mt-0.5">For RSS readers (Feedly, Reeder, etc.)</p>
            </div>
            <div className="flex gap-2 mt-3">
              <input readOnly value={rssUrl}
                className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-xs text-white/50 font-mono truncate" />
              <button onClick={() => copy(rssUrl)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  copiedUrl === rssUrl ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}>
                {copiedUrl === rssUrl ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/30 text-center">
            In Google Calendar: click + → &ldquo;From URL&rdquo; and paste the iCal link
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Practice Card ─────────────────────────────────────────────────────────────

const WARMUP_LABELS: Record<string, string> = {
  open: "Open Warm-up", traversing: "Traversing", easy_circuits: "Easy Circuits",
  dynamic_stretching: "Dynamic Stretching", games_warmup: "Tag / Warm-up Games", yoga_flow: "Yoga Flow",
};
const COOLDOWN_LABELS: Record<string, string> = {
  none: "No Cool-down", easy_movement: "Easy Movement", static_stretch: "Static Stretching", antagonist: "Antagonist + Stretch",
};
const ALL_ACTIVITIES: Record<string, string> = {
  limit_bouldering: "Limit Bouldering", campus_ladders: "Campus Board — Ladders", system_board: "System Board Sets",
  deadhangs: "Dead Hangs", weighted_pullups: "Weighted Pull-ups", lock_offs: "Lock-offs", one_arm_rows: "One-Arm Rows",
  flash_challenge: "Flash Challenge", kingpin: "King/Queen Pin",
  "4x4": "4×4 Bouldering", linked_problems: "Linked Problems", circuit_climbing: "Circuits",
  repeaters: "Hangboard Repeaters", density_hangs: "Density Hangs", horse: "HORSE", "10_in_10": "10 in 10 Challenge", add_on: "Add-On",
  arc_training: "ARC Training", long_routes: "Long Routes / Laps", wall_traversing: "Wall Traversing",
  board_laps: "Board Laps", contact_game: "Contact Game", downclimb: "Downclimb Game",
  blind_sequence: "Blind Sequence", circuit_race: "Circuit Race",
};
const DAY_TYPE_LABELS: Record<string, string> = {
  power: "Power Day", power_endurance: "Power Endurance", endurance: "Endurance Day",
};

function PracticeCard({ practice, onDelete }: { practice: Practice; onDelete: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const teamColor = practice.comp_team ? TEAM_COLORS[String(practice.comp_team)] : "bg-white/5 text-white/40 border-white/10";
  const displayNotes = practice.notes?.replace(/\[uid:[^\]]+\]/g, "").trim() || null;
  const hasPlan = !!practice.practice_plan_id;

  let parsedBlocks: Array<{ activityId: string; duration: number; notes?: string }> = [];
  if (practice.blocks) {
    try { parsedBlocks = JSON.parse(practice.blocks); } catch { /* ignore */ }
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-white">{practice.title}</p>
            {practice.comp_team && (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${teamColor}`}>
                Team {practice.comp_team}
              </span>
            )}
            {!!practice.is_recurring && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] text-white/30 border border-white/10">
                {practice.recurrence_rule === "biweekly" ? "bi-weekly" : "weekly"}
              </span>
            )}
            {hasPlan && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-brand-400 border border-brand-500/20 bg-brand-500/10">
                Plan linked
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/40">
            {practice.start_time && <span>{formatTime(practice.start_time)}</span>}
            {practice.duration_minutes && <span>{practice.duration_minutes} min</span>}
            {practice.location && <span>{practice.location}</span>}
            {practice.coach_name && <span className="text-white/60">Coach: {practice.coach_name}</span>}
          </div>
          {displayNotes && <p className="mt-1.5 text-xs text-white/30 line-clamp-2">{displayNotes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasPlan && (
            <button onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg text-white/30 hover:text-brand-400 hover:bg-brand-500/10 transition">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2h3v1.5M5.5 6v4M8.5 6v4M3 3.5l.5 8.5h7l.5-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded practice plan */}
      {expanded && hasPlan && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-white">
              {practice.session_name || DAY_TYPE_LABELS[practice.day_type || ""] || "Practice Plan"}
            </span>
            {practice.day_type && (
              <span className="text-[10px] text-white/40">{DAY_TYPE_LABELS[practice.day_type]}</span>
            )}
            {practice.plan_total_minutes && (
              <span className="ml-auto text-[10px] text-white/30">~{practice.plan_total_minutes} min total</span>
            )}
          </div>
          {practice.warmup_id && (
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Warm-up</p>
              <p className="text-xs text-white/70">{WARMUP_LABELS[practice.warmup_id] || practice.warmup_id}</p>
            </div>
          )}
          {parsedBlocks.length > 0 && (
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">Activities</p>
              <ol className="space-y-1">
                {parsedBlocks.map((b, i) => (
                  <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                    <span className="text-white/30 shrink-0">{i + 1}.</span>
                    <span>{ALL_ACTIVITIES[b.activityId] || b.activityId} <span className="text-white/30">({b.duration} min)</span></span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {practice.cooldown && practice.cooldown !== "none" && (
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Cool-down</p>
              <p className="text-xs text-white/70">{COOLDOWN_LABELS[practice.cooldown] || practice.cooldown}</p>
            </div>
          )}
          {practice.plan_coach_notes && (
            <div className="rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Coach Notes</p>
              <p className="text-xs text-white/60 leading-relaxed">{practice.plan_coach_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Athlete Schedule ──────────────────────────────────────────────────────────

function MySchedule({ data, expandedWeek, setExpandedWeek }: {
  data: ScheduleData; expandedWeek: number | null; setExpandedWeek: (w: number) => void;
}) {
  const { plan, weeks, currentWeek, currentDayOfWeek } = data;
  if (!plan) return null;
  return (
    <>
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <p className="text-xs text-white/40">Active: <span className="text-white/70 font-medium">{plan.title}</span></p>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {weeks.map((wk) => (
          <button key={wk.week} onClick={() => setExpandedWeek(wk.week)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              expandedWeek === wk.week ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30"
              : wk.isCurrent ? "bg-white/[0.06] text-white"
              : "text-white/40 hover:text-white hover:bg-white/[0.04]"
            }`}>
            Wk {wk.week}
            {wk.isCurrent && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {weeks.filter((wk) => wk.week === expandedWeek).map((wk) =>
          wk.days.map(({ day, workouts }) => {
            const isToday = wk.isCurrent && day === currentDayOfWeek;
            const isPast = wk.isCurrent ? day < currentDayOfWeek : wk.week < currentWeek;
            return (
              <div key={day} className={`rounded-xl border transition-all ${isToday ? "border-brand-500/30 bg-brand-500/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 shrink-0 text-center ${isToday ? "text-brand-400 font-semibold" : "text-white/30"}`}>
                    <div className="text-[10px] uppercase tracking-widest">{DAY_LABELS[day - 1]}</div>
                    {isToday && <div className="mt-0.5 text-[9px] text-brand-400/70 uppercase">Today</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    {!workouts.length ? <p className="text-sm text-white/20">Rest day</p> : (
                      <div className="flex flex-col gap-2">
                        {workouts.map((w) => <WorkoutItem key={w.id} workout={w} isPast={isPast} isToday={isToday} />)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 card">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.min((currentWeek / plan.duration_weeks) * 100, 100)}%` }} />
          </div>
          <span className="text-xs text-white/40 shrink-0">Week {currentWeek} of {plan.duration_weeks}</span>
        </div>
      </div>
    </>
  );
}

function WorkoutItem({ workout, isPast, isToday }: { workout: WorkoutRow; isPast: boolean; isToday: boolean }) {
  const proto = PROTOCOLS[workout.protocol_type];
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full shrink-0 ${workout.completed ? "bg-green-400" : isPast ? "bg-white/10" : isToday ? "bg-brand-400 animate-pulse" : "bg-white/20"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${workout.completed ? "text-white/40 line-through" : "text-white"}`}>{workout.name}</span>
          {proto && <span className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{proto.name}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/30">
          {workout.sets && workout.reps && <span>{workout.sets}×{workout.reps}</span>}
          {workout.hang_time_s && <span>{workout.hang_time_s}s/{workout.rest_time_s}s</span>}
          {workout.intensity_percent && <span>{workout.intensity_percent}%</span>}
        </div>
      </div>
      {isToday && !workout.completed && (
        <Link href={`/timer?protocol=${workout.protocol_type}&hangTime=${workout.hang_time_s || 10}&restTime=${workout.rest_time_s || 180}&reps=${workout.reps || 6}&sets=${workout.sets || 3}&name=${encodeURIComponent(workout.name)}`}
          className="shrink-0 text-xs text-brand-400 hover:text-brand-300 transition font-medium">
          Start →
        </Link>
      )}
    </div>
  );
}
