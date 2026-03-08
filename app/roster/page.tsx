"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

interface Athlete {
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

export default function RosterPage() {
  const { user, loading } = useAuth();
  const isCoach = user?.role === "coach" || user?.role === "admin";

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>("all");

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

  const filtered = filterTeam === "all"
    ? athletes
    : filterTeam === "unassigned"
    ? athletes.filter((a) => !a.comp_team)
    : athletes.filter((a) => String(a.comp_team) === filterTeam);

  // Stats per team
  const teamCounts = [1, 2, 3, 4].reduce((acc, t) => {
    acc[t] = athletes.filter((a) => a.comp_team === t).length;
    return acc;
  }, {} as Record<number, number>);
  const unassigned = athletes.filter((a) => !a.comp_team).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Roster</h1>
          <p className="mt-1 text-sm text-white/40">{athletes.length} athletes · Assign to comp teams</p>
        </div>
        <Link href="/schedule" className="btn-ghost text-sm shrink-0">← Calendar</Link>
      </div>

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
          { value: "all", label: `All (${athletes.length})` },
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
            <p className="text-white/40">No athletes in this group</p>
          </div>
        ) : (
          filtered.map((athlete) => (
            <div key={athlete.id} className="card">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-sm font-bold">
                  {(athlete.display_name || athlete.username)[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/profile/${athlete.username}`}
                      className="text-sm font-semibold text-white hover:text-brand-400 transition">
                      {athlete.display_name || athlete.username}
                    </Link>
                    <span className="text-xs text-white/30">@{athlete.username}</span>
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

                {/* Team assign buttons */}
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
    </div>
  );
}
