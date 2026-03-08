"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatRelativeDate, lbsToKg, getRpeColor } from "@/lib/utils";
import { PROTOCOLS, PROTOCOL_CATEGORIES } from "@/lib/protocols";
import type { Log } from "@/types";

interface Send {
  grade: string;
  problem_name: string | null;
  location: string | null;
  style: string | null;
  notes: string | null;
  sent_at: string;
}

interface DashboardData {
  user: {
    display_name: string;
    bodyweight_lbs: number;
    max_boulder_grade: string;
    target_boulder_grade: string;
  } | null;
  todaysWorkout: {
    plan: { title: string; focus: string };
    exercises: Array<{
      id: number;
      name: string;
      protocol_type: string;
      hang_time_s: number;
      rest_time_s: number;
      reps: number;
      sets: number;
      rest_between_sets_s: number;
      intensity_percent: number;
    }>;
    weekNumber: number;
    dayOfWeek: number;
  } | null;
  recentLogs: Log[];
  latestTest: {
    percent_bodyweight: number;
    total_weight_lbs: number;
    bodyweight_lbs: number;
    added_weight_lbs: number;
    tested_at: string;
  } | null;
  testHistory: Array<{ percent_bodyweight: number; tested_at: string }>;
  recentSends: Send[];
  benchmarks: Record<string, number>;
}

interface CoachStats {
  totalAthletes: number;
  byTeam: Record<number, number>;
  sessionsWithPlan: number;
}

export default function DashboardPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const isCoach = authUser?.role === "coach" || authUser?.role === "admin";

  const [data, setData] = useState<DashboardData | null>(null);
  const [coachStats, setCoachStats] = useState<CoachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !authUser) {
      window.location.href = "/auth/login";
      return;
    }
    if (!authLoading && authUser) {
      if (isCoach) {
        fetch("/api/coach/stats")
          .then((r) => r.json())
          .then(setCoachStats)
          .finally(() => setLoading(false));
      } else {
        fetch("/api/dashboard")
          .then((r) => r.json())
          .then(setData)
          .finally(() => setLoading(false));
      }
    }
  }, [authUser, authLoading, isCoach]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authUser) return null;

  if (isCoach) {
    return <CoachDashboard authUser={authUser} stats={coachStats} activeTeam={activeTeam} setActiveTeam={setActiveTeam} />;
  }

  const { todaysWorkout, recentLogs, latestTest, testHistory, recentSends, benchmarks } = data || {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          {data?.user?.display_name
            ? `Hey, ${data.user.display_name.split(" ")[0]}`
            : `Hey, ${authUser.username}`}
        </h1>
        <p className="mt-1 text-sm text-white/40">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
        <StatCard
          label="Max Hang"
          value={latestTest ? `${Math.round(latestTest.percent_bodyweight)}%` : "—"}
          sub={latestTest ? "of bodyweight" : "No tests yet"}
          href="/training"
        />
        <StatCard
          label="Best Boulder"
          value={data?.user?.max_boulder_grade || "—"}
          sub={data?.user?.target_boulder_grade ? `Goal: ${data.user.target_boulder_grade}` : "Set in profile"}
          href={`/profile/${authUser.username}`}
        />
        <StatCard
          label="Max Pull-ups"
          value={benchmarks?.max_pullups != null ? String(Math.round(benchmarks.max_pullups)) : "—"}
          sub="reps"
          href="/training"
        />
        <StatCard
          label="Sends Logged"
          value={recentSends != null ? String(recentSends.length > 0 ? recentSends.length : 0) : "—"}
          sub="recent climbs"
          href="/training"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* Today's Workout */}
        <div className="md:col-span-2 lg:col-span-3">
          {todaysWorkout ? (
            <TodaysWorkoutCard workout={todaysWorkout} latestTest={latestTest ?? null} />
          ) : (
            <NoWorkoutCard />
          )}
        </div>

        {/* Sidebar: grade + quick actions */}
        <div className="flex flex-col gap-4">
          {data?.user?.max_boulder_grade && (
            <div className="card">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                Current Grade
              </span>
              <p className="mt-2 text-2xl font-bold text-white">{data.user.max_boulder_grade}</p>
              {data.user.target_boulder_grade && (
                <p className="mt-1 text-xs text-white/40">
                  Target: <span className="text-brand-400">{data.user.target_boulder_grade}</span>
                </p>
              )}
            </div>
          )}
          <div className="card">
            <span className="text-xs font-medium uppercase tracking-wider text-white/40">Quick Actions</span>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/assessment" className="btn-secondary text-center text-xs py-2">
                Run Assessment
              </Link>
              <Link href="/plans" className="btn-ghost text-center text-xs py-2">
                Browse Plans
              </Link>
              <Link href="/training" className="btn-ghost text-center text-xs py-2">
                Training Log
              </Link>
            </div>
          </div>
        </div>

        {/* Hangboard Progress Chart */}
        {testHistory && testHistory.length > 1 && (
          <div className="md:col-span-2 lg:col-span-2">
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Hangboard Progress</h2>
                <Link href="/training" className="text-xs text-brand-400 hover:underline">
                  View all →
                </Link>
              </div>
              <HangboardChart data={testHistory} />
            </div>
          </div>
        )}

        {/* Benchmarks */}
        {benchmarks && Object.keys(benchmarks).length > 0 && (
          <div className={testHistory && testHistory.length > 1 ? "md:col-span-1 lg:col-span-2" : "md:col-span-2 lg:col-span-2"}>
            <div className="card h-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Benchmarks</h2>
                <Link href="/training" className="text-xs text-brand-400 hover:underline">
                  Log →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {benchmarks.max_pullups != null && (
                  <BenchmarkItem label="Max Pull-ups" value={`${Math.round(benchmarks.max_pullups)} reps`} />
                )}
                {benchmarks.l_sit_hold != null && (
                  <BenchmarkItem label="L-Sit Hold" value={`${Math.round(benchmarks.l_sit_hold)}s`} />
                )}
                {benchmarks.campus_reach != null && (
                  <BenchmarkItem label="Campus Reach" value={`${benchmarks.campus_reach} cm`} />
                )}
                {benchmarks.vertical_jump != null && (
                  <BenchmarkItem label="Vert Jump" value={`${benchmarks.vertical_jump} cm`} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Sends */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Sends</h2>
              <Link href="/training" className="text-xs text-brand-400 hover:underline">
                Log send →
              </Link>
            </div>
            {recentSends && recentSends.length > 0 ? (
              <div className="space-y-2">
                {recentSends.map((send, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-400 border border-brand-500/20">
                          {send.grade}
                        </span>
                        {send.problem_name && (
                          <span className="text-sm text-white truncate">{send.problem_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {send.location && (
                          <span className="text-xs text-white/30">{send.location}</span>
                        )}
                        {send.style && (
                          <span className="text-xs text-white/20">· {send.style}</span>
                        )}
                        <span className="text-xs text-white/20">{formatRelativeDate(send.sent_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-white/40">No sends logged yet</p>
                <Link href="/training" className="mt-3 inline-block btn-primary text-xs py-2 px-4">
                  Log a send
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Workouts</h2>
              <Link href="/training" className="text-xs text-brand-400 hover:underline">
                View all →
              </Link>
            </div>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-2">
                {recentLogs.map((log) => {
                  const protocol = PROTOCOLS[log.protocol_type as keyof typeof PROTOCOLS];
                  const cat = protocol ? PROTOCOL_CATEGORIES[protocol.category] : null;
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{log.workout_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cat && (
                            <span className={`badge ${cat.bg} ${cat.color} ${cat.border}`}>
                              {cat.label}
                            </span>
                          )}
                          <span className="text-xs text-white/30">
                            {formatRelativeDate(log.completed_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {log.rpe && (
                          <span className={`text-sm font-bold ${getRpeColor(log.rpe)}`}>
                            RPE {log.rpe}
                          </span>
                        )}
                        {log.weight_lbs && (
                          <p className="text-xs text-white/40">
                            {Math.round(log.weight_lbs)} lbs
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-white/40">No workouts logged yet</p>
                <Link href="/training" className="mt-3 inline-block btn-primary text-xs py-2 px-4">
                  Log a workout
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Coach Dashboard ────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<number, { pill: string; card: string }> = {
  1: { pill: "bg-red-500/15 text-red-400 border-red-500/25", card: "border-red-500/20" },
  2: { pill: "bg-blue-500/15 text-blue-400 border-blue-500/25", card: "border-blue-500/20" },
  3: { pill: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", card: "border-yellow-500/20" },
  4: { pill: "bg-purple-500/15 text-purple-400 border-purple-500/25", card: "border-purple-500/20" },
};

function CoachDashboard({
  authUser,
  stats,
  activeTeam,
  setActiveTeam,
}: {
  authUser: { username: string };
  stats: CoachStats | null;
  activeTeam: number | null;
  setActiveTeam: (t: number | null) => void;
}) {
  const byTeam = stats?.byTeam ?? { 1: 0, 2: 0, 3: 0, 4: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Coach Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Team stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="card">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Total Athletes</p>
          <p className="text-3xl font-bold text-white">{stats?.totalAthletes ?? "—"}</p>
          <p className="text-xs text-white/30 mt-0.5">on roster</p>
        </div>
        {[1, 2, 3].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTeam(activeTeam === t ? null : t)}
            className={`card text-left transition hover:border-white/15 ${
              activeTeam === t ? `${TEAM_COLORS[t].card} bg-white/[0.03]` : ""
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Comp Team {t}</p>
            <p className="text-3xl font-bold text-white">{byTeam[t] ?? 0}</p>
            <p className="text-xs text-white/30 mt-0.5">athletes</p>
          </button>
        ))}
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-8">
        <div className="card">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Sessions w/ Plan</p>
          <p className="text-3xl font-bold text-white">{stats?.sessionsWithPlan ?? "—"}</p>
          <p className="text-xs text-white/30 mt-0.5">have a practice plan</p>
        </div>
        <div className="card">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Comp Team 4</p>
          <p className="text-3xl font-bold text-white">{byTeam[4] ?? 0}</p>
          <p className="text-xs text-white/30 mt-0.5">athletes</p>
        </div>
        <div className="card">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">Unassigned</p>
          <p className="text-3xl font-bold text-white">
            {stats ? Math.max(0, (stats.totalAthletes as number) - Object.values(byTeam).reduce((a, b) => a + b, 0)) : "—"}
          </p>
          <p className="text-xs text-white/30 mt-0.5">no team yet</p>
        </div>
      </div>

      {/* Active team filter indicator */}
      {activeTeam && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 ${TEAM_COLORS[activeTeam].card} bg-white/[0.02]`}>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${TEAM_COLORS[activeTeam].pill}`}>
            Comp Team {activeTeam}
          </span>
          <span className="text-sm text-white/60">selected — viewing team filter on Roster</span>
          <Link href={`/roster?team=${activeTeam}`} className="ml-auto text-xs text-brand-400 hover:underline shrink-0">
            View Roster →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/roster" className="card hover:border-brand-500/20 transition group block">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="7" cy="6" r="3" stroke="#22c55e" strokeWidth="1.5"/>
                <circle cx="14" cy="6" r="2.5" stroke="#22c55e" strokeWidth="1.5"/>
                <path d="M1 17c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 10.5c1.657 0 3 1.343 3 3" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition">Roster</h3>
          </div>
          <p className="text-xs text-white/40">Assign athletes to comp teams, view all climbers</p>
        </Link>

        <Link href="/schedule" className="card hover:border-brand-500/20 transition group block">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="13" rx="2" stroke="#22c55e" strokeWidth="1.5"/>
                <path d="M7 2v3M13 2v3M3 8h14" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition">Calendar</h3>
          </div>
          <p className="text-xs text-white/40">View and plan practice sessions for each team</p>
        </Link>

        <Link href="/team" className="card hover:border-brand-500/20 transition group block">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="11" height="9" rx="2" stroke="#22c55e" strokeWidth="1.5"/>
                <path d="M13 8l5-3v10l-5-3" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white group-hover:text-brand-400 transition">Coach Aid</h3>
          </div>
          <p className="text-xs text-white/40">Build session practice plans and drills</p>
        </Link>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, href,
}: {
  label: string; value: string; sub: string; href: string;
}) {
  return (
    <Link href={href} className="card hover:border-brand-500/20 transition group block">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white group-hover:text-brand-400 transition">{value}</p>
      <p className="text-xs text-white/30 mt-0.5">{sub}</p>
    </Link>
  );
}

function BenchmarkItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

function HangboardChart({
  data,
}: {
  data: Array<{ percent_bodyweight: number; tested_at: string }>;
}) {
  if (data.length < 2) return null;
  const vals = data.map((d) => d.percent_bodyweight);
  const min = Math.min(...vals) * 0.92;
  const max = Math.max(...vals) * 1.08;
  const range = max - min || 1;
  const W = 300;
  const H = 60;

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return { x, y };
  });

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = pathD + ` L${W},${H} L0,${H} Z`;

  const latest = vals[vals.length - 1];
  const first = vals[0];
  const diff = latest - first;
  const sign = diff >= 0 ? "+" : "";

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{Math.round(latest)}%</span>
        <span className="text-xs text-white/40">of bodyweight</span>
        {diff !== 0 && (
          <span className={`text-xs font-semibold ml-auto ${diff >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sign}{diff.toFixed(1)}% since first test
          </span>
        )}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id="hbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#hbGrad)" />
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#22c55e" opacity={i === pts.length - 1 ? 1 : 0.4} />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-white/20">
          {new Date(data[0].tested_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className="text-[10px] text-white/20">
          {new Date(data[data.length - 1].tested_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

function TodaysWorkoutCard({
  workout,
  latestTest,
}: {
  workout: NonNullable<DashboardData["todaysWorkout"]>;
  latestTest: DashboardData["latestTest"];
}) {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
        <span className="text-xs font-medium uppercase tracking-wider text-brand-400">
          Today&apos;s Workout
        </span>
      </div>
      <p className="text-xs text-white/30 mb-4">
        {workout.plan.title} — Week {workout.weekNumber}
      </p>

      <div className="space-y-3">
        {workout.exercises.map((ex) => {
          const p = PROTOCOLS[ex.protocol_type as keyof typeof PROTOCOLS];
          const c = p ? PROTOCOL_CATEGORIES[p.category] : null;
          const recommendedWeight =
            latestTest && ex.intensity_percent
              ? (latestTest.total_weight_lbs * ex.intensity_percent) / 100 -
                latestTest.bodyweight_lbs
              : null;

          return (
            <div key={ex.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {c && (
                      <span className={`badge ${c.bg} ${c.color} ${c.border}`}>{c.label}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white">{ex.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {ex.hang_time_s > 0 && <Stat label="Hang" value={`${ex.hang_time_s}s`} />}
                    {ex.rest_time_s > 0 && <Stat label="Rest" value={`${ex.rest_time_s}s`} />}
                    {ex.reps > 0 && <Stat label="Reps" value={String(ex.reps)} />}
                    {ex.sets > 0 && <Stat label="Sets" value={String(ex.sets)} />}
                    {ex.rest_between_sets_s > 0 && (
                      <Stat label="Set Rest" value={`${ex.rest_between_sets_s}s`} />
                    )}
                    {ex.intensity_percent && (
                      <Stat label="Intensity" value={`${ex.intensity_percent}%`} />
                    )}
                  </div>
                  {recommendedWeight !== null && (
                    <p className="mt-2 text-xs text-brand-400">
                      Recommended: +{Math.max(0, Math.round(recommendedWeight * 10) / 10)} lbs
                      <span className="text-white/30 ml-1">
                        ({lbsToKg(Math.max(0, recommendedWeight))} kg)
                      </span>
                    </p>
                  )}
                </div>
                <Link
                  href={`/timer?workout=${ex.id}&hangTime=${ex.hang_time_s || 10}&restTime=${ex.rest_time_s || 3}&reps=${ex.reps || 6}&sets=${ex.sets || 3}&restBetweenSets=${ex.rest_between_sets_s || 180}&name=${encodeURIComponent(ex.name)}`}
                  className="btn-primary shrink-0 text-sm px-4 py-2"
                >
                  Start
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NoWorkoutCard() {
  return (
    <div className="card">
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10">
          <svg className="h-6 w-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-white">No Active Plan</h2>
        <p className="mt-1 text-sm text-white/40">
          Start a training plan to see your daily workout here.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/plans" className="btn-primary text-sm">
            Browse Plans
          </Link>
          <Link href="/assessment" className="btn-secondary text-sm">
            Get Assessed
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
