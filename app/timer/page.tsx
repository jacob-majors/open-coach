"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import HangboardTimer from "@/components/timer/HangboardTimer";
import type { WorkoutProtocol } from "@/types";

function TimerPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [showLog, setShowLog] = useState(false);
  const [logData, setLogData] = useState({ rpe: 7, notes: "", weight: "" });
  const [submitting, setSubmitting] = useState(false);

  const protocol: WorkoutProtocol = {
    name: params.get("name") || "Workout",
    type: (params.get("type") as WorkoutProtocol["type"]) || "custom",
    hangTime: parseInt(params.get("hangTime") || "10"),
    restTime: parseInt(params.get("restTime") || "60"),
    reps: parseInt(params.get("reps") || "6"),
    sets: parseInt(params.get("sets") || "3"),
    restBetweenSets: parseInt(params.get("restBetweenSets") || "180"),
    intensityPercent: params.get("intensity") ? parseInt(params.get("intensity")!) : undefined,
  };

  const workoutId = params.get("workout");

  const handleComplete = () => {
    setTimeout(() => setShowLog(true), 800);
  };

  const submitLog = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: workoutId ? parseInt(workoutId) : null,
          workoutName: protocol.name,
          protocolType: protocol.type,
          weightLbs: logData.weight ? parseFloat(logData.weight) : null,
          rpe: logData.rpe,
          notes: logData.notes || null,
          setsCompleted: protocol.sets,
        }),
      });
      router.push("/dashboard");
    } catch {
      setSubmitting(false);
    }
  };

  if (showLog) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20">
              <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Workout Complete!</h2>
            <p className="mt-1 text-sm text-white/50">{protocol.name}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Weight Used (lbs)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g. +15 lbs added"
                value={logData.weight}
                onChange={(e) => setLogData((d) => ({ ...d, weight: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">RPE — Rate of Perceived Exertion (1–10)</label>
              <div className="flex gap-1.5 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLogData((d) => ({ ...d, rpe: n }))}
                    className={`h-9 w-9 rounded-lg text-sm font-bold transition ${
                      logData.rpe === n
                        ? n <= 4 ? "bg-green-500 text-black"
                          : n <= 7 ? "bg-yellow-500 text-black"
                          : "bg-red-500 text-white"
                        : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-white/30">
                {logData.rpe <= 3 ? "Easy" : logData.rpe <= 5 ? "Moderate" : logData.rpe <= 7 ? "Hard" : logData.rpe <= 9 ? "Very Hard" : "Max"}
              </p>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="How did it feel? Form notes, grip position, etc."
                value={logData.notes}
                onChange={(e) => setLogData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={submitLog} disabled={submitting} className="btn-primary flex-1 py-3">
                {submitting ? "Saving..." : "Save & Done"}
              </button>
              <Link href="/dashboard" className="btn-secondary flex-1 py-3 text-center">
                Skip
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <HangboardTimer protocol={protocol} onComplete={handleComplete} backHref="/dashboard" />
    </div>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    }>
      <TimerPageInner />
    </Suspense>
  );
}
