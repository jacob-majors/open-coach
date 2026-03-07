"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, BOULDER_GRADES } from "@/lib/protocols";
import { FOCUS_OPTIONS } from "@/lib/utils";
import type { ProtocolType } from "@/types";

interface WorkoutEntry {
  id: string;
  name: string;
  protocolType: ProtocolType;
  weekNumber: number;
  dayOfWeek: number;
  hangTime: number;
  restTime: number;
  reps: number;
  sets: number;
  restBetweenSets: number;
  intensityPercent: string;
  instructions: string;
}

function newWorkout(week = 1, day = 1): WorkoutEntry {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    protocolType: "max_hang",
    weekNumber: week,
    dayOfWeek: day,
    hangTime: 10,
    restTime: 180,
    reps: 6,
    sets: 3,
    restBetweenSets: 300,
    intensityPercent: "",
    instructions: "",
  };
}

export default function CreatePlanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    durationWeeks: 4,
    focus: "finger_strength",
    difficultyMin: "",
    difficultyMax: "",
    isPublic: false,
  });

  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([newWorkout(1, 1)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && !user) {
    router.push("/auth/login");
    return null;
  }

  const addWorkout = () => {
    const last = workouts[workouts.length - 1];
    setWorkouts((prev) => [
      ...prev,
      newWorkout(last?.weekNumber || 1, (last?.dayOfWeek || 0) + 1),
    ]);
  };

  const removeWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWorkout = (id: string, updates: Partial<WorkoutEntry>) => {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const updated = { ...w, ...updates };
        // Auto-fill defaults from protocol
        if (updates.protocolType && updates.protocolType !== w.protocolType) {
          const proto = PROTOCOLS[updates.protocolType];
          if (proto) {
            updated.hangTime = proto.defaultParams.hangTime;
            updated.restTime = proto.defaultParams.restTime;
            updated.reps = proto.defaultParams.reps;
            updated.sets = proto.defaultParams.sets;
            updated.restBetweenSets = proto.defaultParams.restBetweenSets;
            if (!updated.name) updated.name = proto.name;
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { setError("Title is required"); return; }
    if (workouts.some((w) => !w.name)) { setError("All exercises need a name"); return; }
    setSubmitting(true);
    setError("");

    try {
      const r = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          workouts: workouts.map((w) => ({
            ...w,
            intensityPercent: w.intensityPercent ? parseFloat(w.intensityPercent) : null,
          })),
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Failed to create plan"); return; }
      router.push(`/plans/${data.planId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Create Training Plan</h1>
        <p className="mt-1 text-sm text-white/40">
          Build a structured plan to share with the community or keep for yourself
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Plan info */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-white">Plan Details</h2>

          <div>
            <label className="label">Plan Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 4-Week Max Hang Block"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="What's this plan for? Who's it best suited to?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Training Focus</label>
              <select
                className="input"
                value={form.focus}
                onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}
              >
                {FOCUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duration (weeks)</label>
              <select
                className="input"
                value={form.durationWeeks}
                onChange={(e) => setForm((f) => ({ ...f, durationWeeks: parseInt(e.target.value) }))}
              >
                {[2,3,4,6,8,12].map((w) => (
                  <option key={w} value={w}>{w} weeks</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Grade (optional)</label>
              <select
                className="input"
                value={form.difficultyMin}
                onChange={(e) => setForm((f) => ({ ...f, difficultyMin: e.target.value }))}
              >
                <option value="">Any</option>
                {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max Grade (optional)</label>
              <select
                className="input"
                value={form.difficultyMax}
                onChange={(e) => setForm((f) => ({ ...f, difficultyMax: e.target.value }))}
              >
                <option value="">Any</option>
                {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                form.isPublic ? "bg-brand-500" : "bg-white/20"
              }`}
            >
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                form.isPublic ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </div>
            <span className="text-sm text-white/70">Make plan public</span>
          </label>
        </div>

        {/* Workouts */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Exercises</h2>
            <button type="button" onClick={addWorkout} className="btn-ghost text-xs py-1.5">
              + Add Exercise
            </button>
          </div>

          <div className="space-y-3">
            {workouts.map((w, idx) => (
              <WorkoutRow
                key={w.id}
                workout={w}
                index={idx}
                onChange={(updates) => updateWorkout(w.id, updates)}
                onRemove={() => removeWorkout(w.id)}
                canRemove={workouts.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addWorkout}
            className="mt-3 w-full rounded-xl border border-dashed border-white/10 py-3 text-sm text-white/30 hover:text-white/60 hover:border-white/20 transition"
          >
            + Add Another Exercise
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
            {submitting ? "Creating..." : form.isPublic ? "Publish Plan" : "Save Plan"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary px-6">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function WorkoutRow({
  workout,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  workout: WorkoutEntry;
  index: number;
  onChange: (updates: Partial<WorkoutEntry>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const proto = PROTOCOLS[workout.protocolType];

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-white/30 hover:text-white transition"
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="flex-1 grid grid-cols-2 gap-2 md:grid-cols-4">
          <input
            type="text"
            className="input text-sm col-span-2"
            placeholder={`Exercise ${index + 1} name`}
            value={workout.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <select
            className="input text-sm"
            value={workout.weekNumber}
            onChange={(e) => onChange({ weekNumber: parseInt(e.target.value) })}
          >
            {[1,2,3,4,5,6,7,8].map((w) => <option key={w} value={w}>Week {w}</option>)}
          </select>
          <select
            className="input text-sm"
            value={workout.dayOfWeek}
            onChange={(e) => onChange({ dayOfWeek: parseInt(e.target.value) })}
          >
            {[1,2,3,4,5,6,7].map((d) => <option key={d} value={d}>Day {d}</option>)}
          </select>
        </div>

        {canRemove && (
          <button type="button" onClick={onRemove} className="text-white/20 hover:text-red-400 transition">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Protocol Type</label>
            <select
              className="input"
              value={workout.protocolType}
              onChange={(e) => onChange({ protocolType: e.target.value as ProtocolType })}
            >
              {Object.values(PROTOCOLS).map((p) => (
                <option key={p.type} value={p.type}>{p.name}</option>
              ))}
            </select>
            {proto?.purpose && (
              <p className="mt-1.5 text-xs text-white/40 leading-relaxed">{proto.purpose}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div>
              <label className="label">Hang (s)</label>
              <input type="number" className="input" value={workout.hangTime}
                onChange={(e) => onChange({ hangTime: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Rest (s)</label>
              <input type="number" className="input" value={workout.restTime}
                onChange={(e) => onChange({ restTime: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Reps</label>
              <input type="number" className="input" value={workout.reps}
                onChange={(e) => onChange({ reps: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Sets</label>
              <input type="number" className="input" value={workout.sets}
                onChange={(e) => onChange({ sets: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Set Rest (s)</label>
              <input type="number" className="input" value={workout.restBetweenSets}
                onChange={(e) => onChange({ restBetweenSets: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div>
            <label className="label">Intensity % (optional — for weight calculator)</label>
            <input
              type="number"
              className="input w-32"
              placeholder="e.g. 65"
              value={workout.intensityPercent}
              onChange={(e) => onChange({ intensityPercent: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Instructions (optional)</label>
            <textarea
              className="input min-h-[60px] resize-none text-sm"
              placeholder={proto?.instructions || "Describe how to perform this exercise..."}
              value={workout.instructions}
              onChange={(e) => onChange({ instructions: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
