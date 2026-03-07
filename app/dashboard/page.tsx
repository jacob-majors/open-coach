"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatRelativeDate, lbsToKg, getRpeColor, getRpeLabel } from "@/lib/utils";
import { PROTOCOLS, PROTOCOL_CATEGORIES } from "@/lib/protocols";
import type { Log } from "@/types";

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
}

export default function DashboardPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !authUser) {
      window.location.href = "/auth/login";
      return;
    }
    if (!authLoading && authUser) {
      fetch("/api/dashboard")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [authUser, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authUser) return null;

  const { todaysWorkout, recentLogs, latestTest, testHistory } = data || {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-8">
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

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* Today's Workout — main card */}
        <div className="md:col-span-2 lg:col-span-3">
          {todaysWorkout ? (
            <TodaysWorkoutCard workout={todaysWorkout} latestTest={latestTest ?? null} />
          ) : (
            <NoWorkoutCard />
          )}
        </div>

        {/* Sidebar stats */}
        <div className="flex flex-col gap-4">
          {/* Max Hang */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                Max Hang
              </span>
              <Link href="/test" className="text-xs text-brand-400 hover:underline">
                Test now →
              </Link>
            </div>
            {latestTest ? (
              <>
                <p className="text-3xl font-bold text-white">
                  {Math.round(latestTest.percent_bodyweight)}
                  <span className="text-base font-normal text-white/40">% BW</span>
                </p>
                <p className="mt-1 text-sm text-white/50">
                  +{Math.round(latestTest.added_weight_lbs)} lbs added
                </p>
                <p className="mt-0.5 text-xs text-white/30">
                  {formatRelativeDate(latestTest.tested_at)}
                </p>
                {testHistory && testHistory.length > 1 && (
                  <MiniGraph data={testHistory} />
                )}
              </>
            ) : (
              <div className="py-2">
                <p className="text-sm text-white/40">No tests yet</p>
                <Link href="/test" className="mt-2 block btn-primary text-center text-xs py-2">
                  Record first test
                </Link>
              </div>
            )}
          </div>

          {/* Grade */}
          {data?.user?.max_boulder_grade && (
            <div className="card">
              <span className="text-xs font-medium uppercase tracking-wider text-white/40">
                Current Grade
              </span>
              <p className="mt-2 text-2xl font-bold text-white">{data.user.max_boulder_grade}</p>
              {data.user.target_boulder_grade && (
                <p className="mt-1 text-xs text-white/40">
                  Target:{" "}
                  <span className="text-brand-400">{data.user.target_boulder_grade}</span>
                </p>
              )}
            </div>
          )}

          {/* Quick links */}
          <div className="card">
            <span className="text-xs font-medium uppercase tracking-wider text-white/40">Quick Actions</span>
            <div className="mt-3 flex flex-col gap-2">
              <Link href="/assessment" className="btn-secondary text-center text-xs py-2">
                Run Assessment
              </Link>
              <Link href="/plans" className="btn-ghost text-center text-xs py-2">
                Browse Plans
              </Link>
              <Link href="/ai" className="btn-ghost text-center text-xs py-2">
                Ask AI Coach
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Workouts</h2>
              <Link href="/log" className="text-xs text-brand-400 hover:underline">
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
                <Link href="/log" className="mt-3 inline-block btn-primary text-xs py-2 px-4">
                  Log a workout
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Assessment CTA */}
        <div className="md:col-span-1 lg:col-span-2">
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />
            <h2 className="text-sm font-semibold text-white">Free Climber Assessment</h2>
            <p className="mt-1 text-xs text-white/50 leading-relaxed">
              Get a personalized analysis of your strengths, weaknesses, and a 4-week training plan — in minutes.
            </p>
            <Link href="/assessment" className="mt-4 block btn-primary text-center text-sm">
              Start Assessment
            </Link>
          </div>
        </div>
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
  const firstEx = workout.exercises[0];
  const protocol = firstEx ? PROTOCOLS[firstEx.protocol_type as keyof typeof PROTOCOLS] : null;
  const cat = protocol ? PROTOCOL_CATEGORIES[protocol.category] : null;

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
                    {ex.hang_time_s > 0 && (
                      <Stat label="Hang" value={`${ex.hang_time_s}s`} />
                    )}
                    {ex.rest_time_s > 0 && (
                      <Stat label="Rest" value={`${ex.rest_time_s}s`} />
                    )}
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
                      {" "}
                      <span className="text-white/30">
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

function MiniGraph({ data }: { data: Array<{ percent_bodyweight: number; tested_at: string }> }) {
  if (data.length < 2) return null;
  const vals = data.map((d) => d.percent_bodyweight);
  const min = Math.min(...vals) * 0.95;
  const max = Math.max(...vals) * 1.05;
  const range = max - min;
  const w = 100;
  const h = 32;
  const points = vals
    .map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-3">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={w}
          cy={h - ((vals[vals.length - 1] - min) / range) * h}
          r="2"
          fill="#22c55e"
        />
      </svg>
    </div>
  );
}
