"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { GRADE_BENCHMARKS } from "@/lib/assessment";
import { BOULDER_GRADES } from "@/lib/protocols";
import type { AssessmentResult } from "@/types";

interface FormData {
  maxHangPercent: string;
  maxPullups: string;
  campusReachCm: string;
  verticalJumpCm: string;
  lSitHoldS: string;
  climbingGrade: string;
  bodyweightLbs: string;
  addedWeightLbs: string;
}

export default function AssessmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    maxHangPercent: "",
    maxPullups: "",
    campusReachCm: "",
    verticalJumpCm: "",
    lSitHoldS: "",
    climbingGrade: "V5",
    bodyweightLbs: "",
    addedWeightLbs: "",
  });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate % BW from inputs
  const bw = parseFloat(form.bodyweightLbs);
  const added = parseFloat(form.addedWeightLbs || "0");
  const calcPercent = bw > 0 ? Math.round(((bw + added) / bw) * 100) : 0;

  const steps = [
    {
      title: "Current Grade",
      subtitle: "What's your current bouldering grade?",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-white/50 leading-relaxed">
            Be honest — pick a grade you can send consistently (not your best project).
          </p>
          <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
            {BOULDER_GRADES.filter((_, i) => i <= 14).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm((f) => ({ ...f, climbingGrade: g }))}
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  form.climbingGrade === g
                    ? "bg-brand-500 text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">
              Strength benchmarks for {form.climbingGrade} climbers
            </p>
            {GRADE_BENCHMARKS.map((b) => {
              const isMatch = b.grade.includes(form.climbingGrade?.replace("V", "") || "");
              return (
                <div key={b.grade} className={`flex justify-between py-1.5 text-sm border-b border-white/[0.04] last:border-0 ${isMatch ? "text-brand-400 font-medium" : "text-white/40"}`}>
                  <span>{b.grade}</span>
                  <span>{b.minPercent}–{b.maxPercent}% BW max hang</span>
                </div>
              );
            })}
          </div>
        </div>
      ),
      canAdvance: !!form.climbingGrade,
    },
    {
      title: "Finger Strength",
      subtitle: "Max hang on a 20mm edge",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-white/50 leading-relaxed">
            If you've done a max hang test, enter your numbers below. Use half-crimp grip on a 20mm edge.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Your Bodyweight (lbs)</label>
              <input type="number" step="0.1" className="input" placeholder="e.g. 155"
                value={form.bodyweightLbs}
                onChange={(e) => setForm((f) => ({ ...f, bodyweightLbs: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Added Weight (lbs)</label>
              <input type="number" step="0.5" className="input" placeholder="0 = bodyweight only"
                value={form.addedWeightLbs}
                onChange={(e) => setForm((f) => ({ ...f, addedWeightLbs: e.target.value }))}
              />
            </div>
          </div>

          {calcPercent > 0 && (
            <div className="rounded-xl bg-brand-500/5 border border-brand-500/20 p-4 text-center">
              <p className="text-4xl font-bold text-brand-400">{calcPercent}%</p>
              <p className="text-sm text-white/40 mt-1">of bodyweight</p>
            </div>
          )}

          <div>
            <label className="label">Or enter % directly</label>
            <input type="number" className="input w-32" placeholder="e.g. 120"
              value={form.maxHangPercent}
              onChange={(e) => setForm((f) => ({ ...f, maxHangPercent: e.target.value }))}
            />
          </div>

          <p className="text-xs text-white/30">
            Don't know your max hang? Estimate based on feeling — bodyweight only = 100%, +20 lbs = ~113%.
          </p>
        </div>
      ),
      canAdvance: !!(form.maxHangPercent || calcPercent > 0),
    },
    {
      title: "Pulling Strength",
      subtitle: "Max pull-ups (no kipping)",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            Dead-hang pull-ups from full extension, chin over bar. No kipping or momentum.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[5, 8, 10, 12, 15, 18, 20, 25, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForm((f) => ({ ...f, maxPullups: String(n) }))}
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  form.maxPullups === String(n)
                    ? "bg-brand-500 text-black"
                    : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Or enter exact count</label>
            <input type="number" className="input w-24" placeholder="e.g. 13"
              value={form.maxPullups}
              onChange={(e) => setForm((f) => ({ ...f, maxPullups: e.target.value }))}
            />
          </div>
          <p className="text-xs text-white/30">
            Be honest — this is your max, not a comfortable working set.
          </p>
        </div>
      ),
      canAdvance: !!form.maxPullups,
    },
    {
      title: "Power & Core (Optional)",
      subtitle: "Additional metrics for a more complete assessment",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            These are optional — skip any you haven't measured.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">L-Sit Hold (seconds)</label>
              <input type="number" className="input w-32" placeholder="e.g. 10"
                value={form.lSitHoldS}
                onChange={(e) => setForm((f) => ({ ...f, lSitHoldS: e.target.value }))}
              />
              <p className="mt-1 text-xs text-white/30">Full L-sit from floor or rings, legs horizontal</p>
            </div>
            <div>
              <label className="label">Campus Board Reach (cm)</label>
              <input type="number" className="input w-32" placeholder="e.g. 35"
                value={form.campusReachCm}
                onChange={(e) => setForm((f) => ({ ...f, campusReachCm: e.target.value }))}
              />
              <p className="mt-1 text-xs text-white/30">1-5 move reach on large campus rungs</p>
            </div>
            <div>
              <label className="label">Vertical Jump (cm)</label>
              <input type="number" className="input w-32" placeholder="e.g. 50"
                value={form.verticalJumpCm}
                onChange={(e) => setForm((f) => ({ ...f, verticalJumpCm: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ),
      canAdvance: true, // optional step
    },
  ];

  const currentStep = steps[step];

  const handleSubmit = async () => {
    if (!user) { router.push("/auth/login"); return; }
    setSubmitting(true);

    const hangPercent = form.maxHangPercent
      ? parseFloat(form.maxHangPercent)
      : calcPercent;

    try {
      const r = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxHangPercent: hangPercent,
          maxPullups: parseInt(form.maxPullups),
          campusReachCm: form.campusReachCm ? parseFloat(form.campusReachCm) : null,
          verticalJumpCm: form.verticalJumpCm ? parseFloat(form.verticalJumpCm) : null,
          lSitHoldS: form.lSitHoldS ? parseFloat(form.lSitHoldS) : null,
          climbingGrade: form.climbingGrade,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult(data.result);
        setPlanId(data.planId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <AssessmentResults result={result} planId={planId} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Climber Assessment</h1>
        <p className="mt-1 text-sm text-white/40">
          Free automated diagnostic — find your limiting factor and get a personalized plan
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? "bg-brand-500" : i === step ? "bg-brand-500/50" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step */}
      <div className="card">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-400 mb-1">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
          <p className="mt-1 text-sm text-white/50">{currentStep.subtitle}</p>
        </div>

        {currentStep.content}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)} className="btn-secondary px-6">
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!currentStep.canAdvance}
              className="btn-primary flex-1 disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? "Analyzing..." : "Generate My Assessment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentResults({
  result,
  planId,
}: {
  result: AssessmentResult;
  planId: number | null;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Your Assessment</h1>
        <p className="mt-1 text-sm text-white/40">
          Based on your metrics — here's what's holding you back
        </p>
      </div>

      {/* Limiting Factor */}
      <div className="card mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />
        <p className="text-xs font-medium uppercase tracking-wider text-brand-400 mb-1">
          Primary Limiting Factor
        </p>
        <p className="text-2xl font-bold text-white">{result.limitingFactor}</p>
        {result.estimatedPotential && (
          <p className="mt-2 text-sm text-white/50">
            With focused training, you have potential to reach{" "}
            <span className="text-white font-medium">{result.estimatedPotential}</span>
          </p>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {result.strengths.length > 0 && (
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-400 mb-3">
              Strengths
            </p>
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-brand-400">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.weaknesses.length > 0 && (
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wider text-orange-400 mb-3">
              Weaknesses
            </p>
            <ul className="space-y-1.5">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-orange-400">→</span> {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="card mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
          Recommendations
        </p>
        <div className="space-y-3">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs text-brand-400 font-bold">
                {i + 1}
              </span>
              <p className="text-sm text-white/70 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Areas */}
      <div className="card mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
          Training Focus Areas
        </p>
        <div className="flex flex-wrap gap-2">
          {result.focusAreas.map((area, i) => (
            <span key={i} className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20 py-1 px-3 text-sm">
              {area}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        {planId && (
          <button
            onClick={() => router.push(`/plans/${planId}`)}
            className="btn-primary flex-1 py-3"
          >
            View Your Generated Plan
          </button>
        )}
        <button
          onClick={() => router.push("/ai")}
          className="btn-secondary px-6"
        >
          Ask AI Coach
        </button>
      </div>
    </div>
  );
}
