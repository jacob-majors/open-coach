"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

interface RosterUser {
  id: number;
  username: string;
  display_name: string | null;
  email: string;
  bio: string | null;
  max_boulder_grade: string | null;
  comp_team: number | null;
  role: string | null;
}

const TEAM_LABELS: Record<string, string> = {
  "1": "Comp Team 1",
  "2": "Comp Team 2",
  "3": "Comp Team 3",
  "4": "Comp Team 4",
};

const TEAM_COLORS: Record<string, string> = {
  "1": "bg-red-500/10 text-red-400 border-red-500/20",
  "2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "3": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "4": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function parseTeamNumber(val: string): number | null {
  const lower = val.toLowerCase().trim();
  if (lower.includes("1")) return 1;
  if (lower.includes("2")) return 2;
  if (lower.includes("3")) return 3;
  if (lower.includes("4")) return 4;
  return null;
}

function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").filter(Boolean);
  const athletes: Array<{ name: string; email: string; bio?: string; compTeam?: number | null }> = [];
  const coaches: Array<{ name: string; email: string; bio?: string }> = [];

  const firstLine = lines[0] || "";
  const delim = firstLine.includes("\t") ? "\t" : ",";

  // Parse header to detect column layout
  const header = firstLine.split(delim).map((s) => s.trim().toLowerCase().replace(/^"|"$/g, ""));
  const hasLastName = header.some((h) => h === "last name" || h === "lastname");

  let idx = 0;
  for (const line of lines) {
    const cols = line.split(delim).map((s) => s.trim().replace(/^"|"$/g, ""));
    const first = cols[0];
    if (!first) continue;
    if (first.toLowerCase() === "first name" || first.toLowerCase() === "firstname") continue;

    let firstName: string, lastName: string, bio: string, role: string, team: string;
    if (hasLastName) {
      [firstName, lastName, bio, role, team] = cols;
    } else {
      [firstName, bio, role, team] = cols;
      lastName = "";
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const nameSlug = `${firstName.toLowerCase()}${lastName ? lastName.toLowerCase() : ""}`.replace(/[^a-z0-9]/g, "");
    const email = `${nameSlug || "user"}${idx}@session.placeholder`;
    idx++;

    const isCoachRole = role?.toLowerCase().trim().includes("coach");
    const teamNum = team ? parseTeamNumber(team) : null;

    if (isCoachRole) {
      coaches.push({ name: fullName, email, bio: bio || undefined });
    } else {
      athletes.push({ name: fullName, email, bio: bio || undefined, compTeam: teamNum });
    }
  }
  return { athletes, coaches };
}

export default function RosterPage() {
  const { user, loading } = useAuth();
  const isCoach = user?.role === "coach" || user?.role === "admin";

  const [athletes, setAthletes] = useState<RosterUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");
  const [addType, setAddType] = useState<"athlete" | "coach">("athlete");
  const [addForm, setAddForm] = useState({ name: "", email: "", compTeam: "", bio: "" });
  const [csvText, setCsvText] = useState("");
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<{ created: string[]; skipped: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Coach bio modal
  const [selectedCoach, setSelectedCoach] = useState<RosterUser | null>(null);

  // Clear roster
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => setAthletes(d.athletes || []))
      .finally(() => setFetching(false));
  }, [user, loading]);

  const assignTeam = async (athleteId: number, team: number | null) => {
    setUpdating(athleteId);
    await fetch("/api/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: athleteId, compTeam: team }),
    });
    setAthletes((prev) =>
      prev.map((a) => (a.id === athleteId ? { ...a, comp_team: team } : a))
    );
    setUpdating(null);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  };

  const submitAddAthletes = async () => {
    setAdding(true);
    setAddResult(null);

    let payload: object;
    if (addMode === "manual") {
      payload = {
        athletes: [{
          name: addForm.name,
          email: addForm.email,
          bio: addForm.bio || undefined,
          compTeam: addForm.compTeam ? parseInt(addForm.compTeam) : null,
          role: addType,
        }],
      };
    } else {
      const parsed = parseCsv(csvText);
      const all = [
        ...parsed.athletes.map((a) => ({ ...a, role: "athlete" })),
        ...parsed.coaches.map((c) => ({ ...c, role: "coach" })),
      ];
      if (!all.length) { setAdding(false); return; }
      payload = { athletes: all };
    }

    const r = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    setAddResult({ created: data.created || [], skipped: data.skipped || [] });
    setAdding(false);

    if (data.created?.length) {
      fetch("/api/roster")
        .then((r) => r.json())
        .then((d) => setAthletes(d.athletes || []));
    }
  };

  if (loading || fetching) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-48 rounded animate-pulse bg-white/[0.05] mb-6" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-white/40 mb-4">Sign in to view roster</p>
        <Link href="/auth/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <p className="text-white/40 mb-4">Roster management is for coaches only.</p>
        <Link href="/community" className="btn-secondary text-sm">Back to Community</Link>
      </div>
    );
  }

  const coachList = athletes.filter((a) => a.role === "coach" || a.role === "admin");
  const athleteList = athletes.filter((a) => a.role !== "coach" && a.role !== "admin");

  const filtered = filterTeam === "all"
    ? athleteList
    : filterTeam === "unassigned"
    ? athleteList.filter((a) => !a.comp_team)
    : athleteList.filter((a) => String(a.comp_team) === filterTeam);

  const teamCounts = [1, 2, 3, 4].reduce((acc, t) => {
    acc[t] = athleteList.filter((a) => a.comp_team === t).length;
    return acc;
  }, {} as Record<number, number>);
  const unassigned = athleteList.filter((a) => !a.comp_team).length;

  const csvPreview = csvText ? parseCsv(csvText) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Roster</h1>
          <p className="mt-1 text-sm text-white/40">{athleteList.length} athletes · {coachList.length} coaches</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowClear(true)}
            className="btn-ghost text-sm text-red-400/70 hover:text-red-400">
            Clear All
          </button>
          <button
            onClick={() => { setShowAdd(true); setAddResult(null); setAddForm({ name: "", email: "", compTeam: "", bio: "" }); setCsvText(""); }}
            className="btn-primary text-sm">
            + Add
          </button>
        </div>
      </div>

      {/* Coaches section */}
      {coachList.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">Coaches</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coachList.map((coach) => (
              <button key={coach.id} onClick={() => setSelectedCoach(coach)}
                className="card text-left hover:border-brand-500/20 transition group">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-400 text-sm font-bold">
                    {(coach.display_name || coach.username)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition truncate">
                      {coach.display_name || coach.username}
                    </p>
                  </div>
                  <span className="text-[10px] text-brand-400/60 shrink-0">Coach</span>
                </div>
                {coach.bio && (
                  <p className="mt-2 text-xs text-white/30 line-clamp-2">{coach.bio}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((t) => (
          <button key={t} onClick={() => setFilterTeam(filterTeam === String(t) ? "all" : String(t))}
            className={`card text-left hover:border-brand-500/20 transition ${filterTeam === String(t) ? "border-brand-500/30 bg-brand-500/5" : ""}`}>
            <p className="text-xs text-white/40 mb-1">Comp Team {t}</p>
            <p className="text-2xl font-bold text-white">{teamCounts[t]}</p>
            <p className="text-[10px] text-white/30 mt-0.5">athletes</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 overflow-x-auto">
        {[
          { value: "all", label: `All (${athleteList.length})` },
          { value: "1", label: `Team 1 (${teamCounts[1]})` },
          { value: "2", label: `Team 2 (${teamCounts[2]})` },
          { value: "3", label: `Team 3 (${teamCounts[3]})` },
          { value: "4", label: `Team 4 (${teamCounts[4]})` },
          { value: "unassigned", label: `Unassigned (${unassigned})` },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => setFilterTeam(value)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filterTeam === value ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Athlete list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-white/40 mb-3">No athletes in this group</p>
            <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm">+ Add Athlete</button>
          </div>
        ) : (
          filtered.map((athlete) => (
            <div key={athlete.id} className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-sm font-bold">
                  {(athlete.display_name || athlete.username)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/profile/${athlete.username}`}
                      className="text-sm font-semibold text-white hover:text-brand-400 transition">
                      {athlete.display_name || athlete.username}
                    </Link>
                    {athlete.max_boulder_grade && (
                      <span className="text-xs font-bold text-brand-400">{athlete.max_boulder_grade}</span>
                    )}
                    {athlete.comp_team && (
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${TEAM_COLORS[String(athlete.comp_team)]}`}>
                        {TEAM_LABELS[String(athlete.comp_team)]}
                      </span>
                    )}
                  </div>
                  {athlete.bio && <p className="text-xs text-white/30 mt-0.5 truncate">{athlete.bio}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4].map((t) => (
                    <button key={t} onClick={() => assignTeam(athlete.id, athlete.comp_team === t ? null : t)}
                      disabled={updating === athlete.id}
                      title={`${athlete.comp_team === t ? "Remove from" : "Assign to"} Team ${t}`}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                        athlete.comp_team === t
                          ? "bg-brand-500 text-black"
                          : "border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Coach bio modal */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCoach(null); }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-brand-400 text-lg font-bold">
                  {(selectedCoach.display_name || selectedCoach.username)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{selectedCoach.display_name || selectedCoach.username}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCoach(null)} className="text-white/40 hover:text-white transition">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Coach
              </span>
            </div>
            {selectedCoach.bio ? (
              <p className="text-sm text-white/70 leading-relaxed">{selectedCoach.bio}</p>
            ) : (
              <p className="text-sm text-white/30 italic">No bio added yet.</p>
            )}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <Link href={`/profile/${selectedCoach.username}`}
                className="btn-secondary text-xs py-2 block text-center"
                onClick={() => setSelectedCoach(null)}>
                View Full Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Clear Roster Confirm */}
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-2">Clear Entire Roster?</h2>
            <p className="text-sm text-white/50 mb-5">
              This will permanently delete all athletes and coaches. Your own account will be kept. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  await fetch("/api/roster", { method: "DELETE" });
                  const d = await fetch("/api/roster").then((r) => r.json());
                  setAthletes(d.athletes || []);
                  setShowClear(false);
                  setClearing(false);
                }}
                className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition">
                {clearing ? "Clearing..." : "Clear All"}
              </button>
              <button onClick={() => setShowClear(false)} className="btn-ghost px-4 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111] p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Add to Roster</h2>
              <button onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white transition">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Manual vs CSV */}
            <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1 mb-4">
              {(["manual", "csv"] as const).map((m) => (
                <button key={m} onClick={() => { setAddMode(m); setAddResult(null); }}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition capitalize ${
                    addMode === m ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"
                  }`}>
                  {m === "csv" ? "Upload CSV" : "Add Manually"}
                </button>
              ))}
            </div>

            {addMode === "manual" ? (
              <div className="space-y-3">
                {/* Athlete vs Coach */}
                <div className="flex gap-2">
                  {(["athlete", "coach"] as const).map((type) => (
                    <button key={type} onClick={() => setAddType(type)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${
                        addType === type ? "bg-brand-500/15 text-brand-400 border border-brand-500/30" : "border border-white/10 bg-white/5 text-white/40 hover:text-white"
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" className="input" placeholder="Alex Johnson"
                    value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="athlete@email.com"
                    value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Bio (optional)</label>
                  <textarea className="input resize-none min-h-[60px]" placeholder="Short bio..."
                    value={addForm.bio} onChange={(e) => setAddForm((f) => ({ ...f, bio: e.target.value }))} />
                </div>
                {addType === "athlete" && (
                  <div>
                    <label className="label">Comp Team (optional)</label>
                    <select className="input" value={addForm.compTeam}
                      onChange={(e) => setAddForm((f) => ({ ...f, compTeam: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Team {t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-white/[0.03] p-3 text-xs text-white/40 space-y-1">
                  <p className="font-medium text-white/60">Expected columns (tab-separated):</p>
                  <p className="font-mono">First Name · Last Name · Bio · Role · Team</p>
                  <p className="mt-1">Role: <span className="text-white/60">athlete</span> or <span className="text-white/60">coach</span></p>
                  <p>Team: <span className="text-white/60">Comp Team 1</span>, <span className="text-white/60">Comp Team 2</span>, etc.</p>
                </div>
                <div onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 py-8 cursor-pointer hover:border-brand-500/30 transition">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30 mb-2">
                    <path d="M12 16V8M8 12l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                  </svg>
                  {csvText ? (
                    <p className="text-sm text-brand-400">
                      {(csvPreview?.athletes.length ?? 0)} athletes · {(csvPreview?.coaches.length ?? 0)} coaches
                    </p>
                  ) : (
                    <p className="text-sm text-white/40">Click to upload CSV / TSV</p>
                  )}
                  <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleCsvFile} />
                </div>
                {csvText && csvPreview && (
                  <div className="rounded-lg bg-white/[0.03] p-3 max-h-40 overflow-y-auto space-y-1">
                    {csvPreview.coaches.length > 0 && (
                      <p className="text-[10px] uppercase tracking-wider text-brand-400 mb-1">Coaches ({csvPreview.coaches.length})</p>
                    )}
                    {csvPreview.coaches.map((c, i) => (
                      <p key={i} className="text-xs text-white/60">{c.name}</p>
                    ))}
                    {csvPreview.athletes.length > 0 && (
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mt-2 mb-1">Athletes ({csvPreview.athletes.length})</p>
                    )}
                    {csvPreview.athletes.map((a, i) => (
                      <p key={i} className="text-xs text-white/60">{a.name}{a.compTeam ? ` · Team ${a.compTeam}` : ""}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {addResult && (
              <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs space-y-1">
                {addResult.created.length > 0 && (
                  <p className="text-green-400">Added {addResult.created.length}: {addResult.created.slice(0, 3).join(", ")}{addResult.created.length > 3 ? ` +${addResult.created.length - 3} more` : ""}</p>
                )}
                {addResult.skipped.length > 0 && (
                  <p className="text-yellow-400">Skipped (already exists): {addResult.skipped.length}</p>
                )}
                {addResult.created.length === 0 && addResult.skipped.length === 0 && (
                  <p className="text-white/40">Nothing to add — check the CSV format.</p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={submitAddAthletes}
                disabled={adding || (addMode === "manual" ? !addForm.name || !addForm.email : !csvText)}
                className="btn-primary flex-1">
                {adding ? "Adding..." : addMode === "manual"
                  ? `Add ${addType}`
                  : `Add ${(csvPreview?.athletes.length ?? 0) + (csvPreview?.coaches.length ?? 0)} People`}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
