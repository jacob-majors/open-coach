"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, PROTOCOL_CATEGORIES } from "@/lib/protocols";
import { formatTime } from "@/lib/utils";
import type { Plan, Workout } from "@/types";

interface PlanDetail {
  plan: Plan & { creator_username: string };
  workouts: Workout[];
  isSaved: boolean;
  isActive: boolean;
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/plans/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); });
  }, [id]);

  const handleSave = async (activate = false) => {
    if (!user) { router.push("/auth/login"); return; }
    setSaving(true);
    await fetch(`/api/plans/${id}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate }),
    });
    setData((prev) => prev ? { ...prev, isSaved: true, isActive: activate } : prev);
    setSaving(false);
    if (activate) router.push("/dashboard");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    router.push("/plans");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-white/40">Plan not found</p>
        <Link href="/plans" className="btn-secondary text-sm">Back to Plans</Link>
      </div>
    );
  }

  const { plan, workouts, isSaved, isActive } = data;
  const isOwner = user?.username === plan.creator_username;

  // Group workouts by week
  const byWeek: Record<number, Workout[]> = {};
  for (const w of workouts) {
    const week = w.week_number || 1;
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(w);
  }

  const focusProtocol = PROTOCOLS[plan.focus as keyof typeof PROTOCOLS];
  const cat = focusProtocol ? PROTOCOL_CATEGORIES[focusProtocol.category] : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      {/* Back */}
      <Link href="/plans" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        All Plans
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {plan.is_certified && (
            <span className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20">
              ✓ Open Coach Certified
            </span>
          )}
          {cat && (
            <span className={`badge ${cat.bg} ${cat.color} ${cat.border}`}>{cat.label}</span>
          )}
          {plan.difficulty_min && (
            <span className="badge bg-white/5 text-white/60">
              {plan.difficulty_min}{plan.difficulty_max ? `–${plan.difficulty_max}` : "+"}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">{plan.title}</h1>
        {plan.description && (
          <p className="mt-2 text-sm text-white/50 leading-relaxed">{plan.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/40">
          <span>By @{plan.creator_username}</span>
          <span>{plan.duration_weeks} weeks</span>
          <span>{workouts.length} workouts</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        {!isOwner && (
          <>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || isActive}
              className="btn-primary disabled:opacity-50"
            >
              {isActive ? "Active Plan ✓" : saving ? "Starting..." : "Start This Plan"}
            </button>
            {!isSaved && (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="btn-secondary"
              >
                {saving ? "Saving..." : "Save for Later"}
              </button>
            )}
          </>
        )}
        {isOwner && (
          <button onClick={handleDelete} className="btn-ghost text-red-400 hover:text-red-300">
            Delete Plan
          </button>
        )}
      </div>

      {/* Workout schedule */}
      <div className="space-y-6">
        {Object.entries(byWeek).map(([week, weekWorkouts]) => (
          <div key={week}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
              Week {week}
            </h2>
            <div className="space-y-2">
              {weekWorkouts.map((workout) => {
                const proto = PROTOCOLS[workout.protocol_type as keyof typeof PROTOCOLS];
                const wCat = proto ? PROTOCOL_CATEGORIES[proto.category] : null;

                return (
                  <div key={workout.id} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {workout.day_of_week && (
                            <span className="text-xs text-white/30">
                              Day {workout.day_of_week}
                            </span>
                          )}
                          {wCat && (
                            <span className={`badge ${wCat.bg} ${wCat.color} ${wCat.border}`}>
                              {wCat.label}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-white">{workout.name}</h3>

                        {/* Protocol params */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          {workout.hang_time_s && <Param label="Hang" val={`${workout.hang_time_s}s`} />}
                          {workout.rest_time_s && <Param label="Rest" val={`${workout.rest_time_s}s`} />}
                          {workout.reps && <Param label="Reps" val={String(workout.reps)} />}
                          {workout.sets && <Param label="Sets" val={String(workout.sets)} />}
                          {workout.rest_between_sets_s && (
                            <Param label="Set Rest" val={formatTime(workout.rest_between_sets_s)} />
                          )}
                          {workout.intensity_percent && (
                            <Param label="Intensity" val={`${workout.intensity_percent}%`} />
                          )}
                        </div>

                        {workout.instructions && (
                          <p className="mt-2 text-xs text-white/40 leading-relaxed">
                            {workout.instructions}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/timer?workout=${workout.id}&name=${encodeURIComponent(workout.name)}&hangTime=${workout.hang_time_s || 10}&restTime=${workout.rest_time_s || 60}&reps=${workout.reps || 6}&sets=${workout.sets || 3}&restBetweenSets=${workout.rest_between_sets_s || 180}&intensity=${workout.intensity_percent || ""}`}
                        className="btn-primary shrink-0 text-xs py-1.5 px-3"
                      >
                        Start
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Param({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="text-sm font-semibold text-white">{val}</p>
    </div>
  );
}
