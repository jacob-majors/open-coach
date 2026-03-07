"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS } from "@/lib/protocols";
import type { ProtocolType } from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

interface DayData {
  day: number;
  workouts: WorkoutRow[];
}

interface WeekData {
  week: number;
  days: DayData[];
  isCurrent: boolean;
}

interface ScheduleData {
  plan: {
    id: number;
    title: string;
    focus: string;
    duration_weeks: number;
    started_at: string;
  } | null;
  weeks: WeekData[];
  currentWeek: number;
  currentDayOfWeek: number;
  daysSinceStart: number;
}

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setFetching(false); return; }
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setExpandedWeek(d.currentWeek || 1);
      })
      .finally(() => setFetching(false));
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-8 w-48 rounded animate-pulse bg-white/[0.05] mb-6" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-white/40 mb-4">Sign in to view your training schedule</p>
        <Link href="/auth/login" className="btn-primary">Sign in with Google</Link>
      </div>
    );
  }

  if (!data?.plan) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="mt-1 text-sm text-white/40">Your upcoming training sessions</p>
        </div>
        <div className="card flex flex-col items-center py-16 text-center gap-4">
          <div className="text-4xl opacity-30">📅</div>
          <div>
            <p className="text-white font-semibold mb-1">No active plan</p>
            <p className="text-sm text-white/40">Browse training plans and activate one to see your schedule</p>
          </div>
          <Link href="/plans" className="btn-primary mt-2">Browse Plans</Link>
        </div>
      </div>
    );
  }

  const { plan, weeks, currentWeek, currentDayOfWeek } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="mt-1 text-sm text-white/40">
            Active plan: <span className="text-white/70">{plan.title}</span>
          </p>
        </div>
        <Link href="/plans" className="btn-ghost text-sm shrink-0">Change plan</Link>
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {weeks.map((wk) => (
          <button
            key={wk.week}
            onClick={() => setExpandedWeek(wk.week)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              expandedWeek === wk.week
                ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/30"
                : wk.isCurrent
                ? "bg-white/[0.06] text-white"
                : "text-white/40 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            Week {wk.week}
            {wk.isCurrent && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      {/* Week view */}
      {weeks
        .filter((wk) => wk.week === expandedWeek)
        .map((wk) => (
          <div key={wk.week} className="space-y-3">
            {wk.days.map(({ day, workouts }) => {
              const isToday = wk.isCurrent && day === currentDayOfWeek;
              const isPast = wk.isCurrent
                ? day < currentDayOfWeek
                : wk.week < currentWeek;
              const hasWorkout = workouts.length > 0;

              return (
                <div
                  key={day}
                  className={`rounded-xl border transition-all ${
                    isToday
                      ? "border-brand-500/30 bg-brand-500/5"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 text-center ${isToday ? "text-brand-400 font-semibold" : "text-white/30"}`}>
                      <div className="text-[10px] uppercase tracking-widest">{DAY_LABELS[day - 1]}</div>
                      {isToday && (
                        <div className="mt-0.5 text-[9px] text-brand-400/70 uppercase tracking-wider">Today</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {!hasWorkout ? (
                        <p className="text-sm text-white/20">Rest day</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {workouts.map((w) => (
                            <WorkoutItem
                              key={w.id}
                              workout={w}
                              isPast={isPast}
                              isToday={isToday}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* Progress summary */}
      <div className="mt-8 card">
        <h2 className="text-sm font-semibold text-white mb-4">Plan Progress</h2>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.min((currentWeek / plan.duration_weeks) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-white/40 shrink-0">
            Week {currentWeek} of {plan.duration_weeks}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Stat label="Current Week" value={`${currentWeek}`} />
          <Stat label="Weeks Left" value={`${Math.max(plan.duration_weeks - currentWeek, 0)}`} />
          <Stat label="Total Weeks" value={`${plan.duration_weeks}`} />
        </div>
      </div>
    </div>
  );
}

function WorkoutItem({
  workout,
  isPast,
  isToday,
}: {
  workout: WorkoutRow;
  isPast: boolean;
  isToday: boolean;
}) {
  const proto = PROTOCOLS[workout.protocol_type];

  return (
    <div className="flex items-center gap-3">
      {/* Completion dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${
        workout.completed
          ? "bg-green-400"
          : isPast
          ? "bg-white/10"
          : isToday
          ? "bg-brand-400 animate-pulse"
          : "bg-white/20"
      }`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${
            workout.completed ? "text-white/40 line-through" : "text-white"
          }`}>
            {workout.name}
          </span>
          {proto && (
            <span className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {proto.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-white/30">
          {workout.sets && workout.reps && (
            <span>{workout.sets} × {workout.reps} reps</span>
          )}
          {workout.hang_time_s && (
            <span>{workout.hang_time_s}s hang / {workout.rest_time_s}s rest</span>
          )}
          {workout.intensity_percent && (
            <span>{workout.intensity_percent}% BW</span>
          )}
        </div>
      </div>

      {isToday && !workout.completed && (
        <Link
          href={`/timer?protocol=${workout.protocol_type}&hangTime=${workout.hang_time_s || 10}&restTime=${workout.rest_time_s || 180}&reps=${workout.reps || 6}&sets=${workout.sets || 3}`}
          className="shrink-0 text-xs text-brand-400 hover:text-brand-300 transition font-medium"
        >
          Start →
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
    </div>
  );
}
