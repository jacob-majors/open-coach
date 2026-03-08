"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS } from "@/lib/protocols";
import type { ProtocolType } from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TEAMS = [
  { value: "all", label: "All" },
  { value: "1", label: "Team 1" },
  { value: "2", label: "Team 2" },
  { value: "3", label: "Team 3" },
  { value: "4", label: "Team 4" },
];

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
  daysSinceStart: number;
}

interface TeamAthlete {
  id: number;
  username: string;
  display_name: string | null;
  comp_team: number | null;
  max_boulder_grade: string | null;
}

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const isCoach = user?.role === "coach" || user?.role === "admin";

  const [data, setData] = useState<ScheduleData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [teamAthletes, setTeamAthletes] = useState<TeamAthlete[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFetching(false); return; }
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => { setData(d); setExpandedWeek(d.currentWeek || 1); })
      .finally(() => setFetching(false));
  }, [user, loading]);

  useEffect(() => {
    if (!isCoach) return;
    setRosterLoading(true);
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => setTeamAthletes(d.athletes || []))
      .finally(() => setRosterLoading(false));
  }, [isCoach]);

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

  const filteredAthletes = selectedTeam === "all"
    ? teamAthletes
    : teamAthletes.filter((a) => String(a.comp_team) === selectedTeam);

  // ── Coach view ──────────────────────────────────────────────────────────────
  if (isCoach) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="mt-1 text-sm text-white/40">Team training schedules</p>
          </div>
          <Link href="/team" className="btn-primary text-sm shrink-0">+ Practice Plan</Link>
        </div>

        {/* Team tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {TEAMS.map((t) => (
            <button key={t.value} onClick={() => setSelectedTeam(t.value)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                selectedTeam === t.value ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {rosterLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-white/40 mb-2">
              {selectedTeam === "all" ? "No athletes on roster yet." : `No athletes on ${TEAMS.find(t => t.value === selectedTeam)?.label}.`}
            </p>
            <Link href="/roster" className="mt-3 inline-block btn-secondary text-sm">Manage Roster →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedTeam === "all" ? (
              [1, 2, 3, 4, null].map((team) => {
                const group = filteredAthletes.filter((a) => a.comp_team === team);
                if (!group.length) return null;
                return (
                  <div key={String(team)}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
                      {team ? `Comp Team ${team}` : "Unassigned"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.map((a) => <AthleteCard key={a.id} athlete={a} />)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAthletes.map((a) => <AthleteCard key={a.id} athlete={a} />)}
              </div>
            )}
          </div>
        )}

        {/* Coach's own schedule */}
        {data?.plan && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider text-xs">My Schedule</h2>
            <MySchedule data={data} expandedWeek={expandedWeek} setExpandedWeek={setExpandedWeek} />
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

      {!data?.plan ? (
        <div className="card flex flex-col items-center py-16 text-center gap-4">
          <div className="text-4xl opacity-30">📅</div>
          <p className="text-white font-semibold">No active plan</p>
          <p className="text-sm text-white/40">Browse training plans and activate one to see your schedule</p>
          <Link href="/plans" className="btn-primary mt-2">Browse Plans</Link>
        </div>
      ) : (
        <MySchedule data={data} expandedWeek={expandedWeek} setExpandedWeek={setExpandedWeek} />
      )}
    </div>
  );
}

function AthleteCard({ athlete }: { athlete: TeamAthlete }) {
  return (
    <Link href={`/profile/${athlete.username}`} className="card hover:border-brand-500/20 transition group">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-sm font-bold">
          {(athlete.display_name || athlete.username)[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition truncate">
            {athlete.display_name || athlete.username}
          </p>
          <p className="text-xs text-white/30">@{athlete.username}</p>
        </div>
        {athlete.max_boulder_grade && (
          <span className="text-sm font-bold text-brand-400 shrink-0">{athlete.max_boulder_grade}</span>
        )}
      </div>
    </Link>
  );
}

function MySchedule({ data, expandedWeek, setExpandedWeek }: {
  data: ScheduleData; expandedWeek: number | null; setExpandedWeek: (w: number) => void;
}) {
  const { plan, weeks, currentWeek, currentDayOfWeek } = data;
  if (!plan) return null;

  return (
    <>
      <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <p className="text-xs text-white/40">
          Active: <span className="text-white/70 font-medium">{plan.title}</span>
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {weeks.map((wk) => (
          <button key={wk.week} onClick={() => setExpandedWeek(wk.week)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              expandedWeek === wk.week
                ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30"
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
              <div key={day} className={`rounded-xl border transition-all ${
                isToday ? "border-brand-500/30 bg-brand-500/5" : "border-white/[0.06] bg-white/[0.02]"
              }`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 shrink-0 text-center ${isToday ? "text-brand-400 font-semibold" : "text-white/30"}`}>
                    <div className="text-[10px] uppercase tracking-widest">{DAY_LABELS[day - 1]}</div>
                    {isToday && <div className="mt-0.5 text-[9px] text-brand-400/70 uppercase">Today</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    {!workouts.length ? (
                      <p className="text-sm text-white/20">Rest day</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {workouts.map((w) => (
                          <WorkoutItem key={w.id} workout={w} isPast={isPast} isToday={isToday} />
                        ))}
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
      <div className={`h-2 w-2 rounded-full shrink-0 ${
        workout.completed ? "bg-green-400" : isPast ? "bg-white/10" : isToday ? "bg-brand-400 animate-pulse" : "bg-white/20"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${workout.completed ? "text-white/40 line-through" : "text-white"}`}>
            {workout.name}
          </span>
          {proto && <span className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{proto.name}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/30">
          {workout.sets && workout.reps && <span>{workout.sets}×{workout.reps}</span>}
          {workout.hang_time_s && <span>{workout.hang_time_s}s/{workout.rest_time_s}s</span>}
          {workout.intensity_percent && <span>{workout.intensity_percent}%</span>}
        </div>
      </div>
      {isToday && !workout.completed && (
        <Link
          href={`/timer?protocol=${workout.protocol_type}&hangTime=${workout.hang_time_s || 10}&restTime=${workout.rest_time_s || 180}&reps=${workout.reps || 6}&sets=${workout.sets || 3}&name=${encodeURIComponent(workout.name)}`}
          className="shrink-0 text-xs text-brand-400 hover:text-brand-300 transition font-medium"
        >
          Start →
        </Link>
      )}
    </div>
  );
}
