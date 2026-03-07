"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOL_CATEGORIES } from "@/lib/protocols";
import { FOCUS_OPTIONS } from "@/lib/utils";
import type { Plan } from "@/types";

const DIFFICULTY_OPTIONS = [
  { label: "All Levels", value: "" },
  { label: "Beginner (VB–V3)", value: "beginner" },
  { label: "Intermediate (V4–V6)", value: "intermediate" },
  { label: "Advanced (V7–V9)", value: "advanced" },
  { label: "Expert (V10+)", value: "expert" },
];

type PlanWithMeta = Plan & {
  creator_username: string;
  workout_count: number;
  save_count: number;
  is_saved?: boolean;
};

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState("");
  const [tab, setTab] = useState<"browse" | "mine">("browse");

  const fetchPlans = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (focus) params.set("focus", focus);
    if (tab === "mine") params.set("mine", "true");
    const r = await fetch(`/api/plans?${params}`);
    const data = await r.json();
    setPlans(data.plans || []);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [focus, tab]);

  const savePlan = async (planId: number) => {
    if (!user) { window.location.href = "/auth/login"; return; }
    await fetch(`/api/plans/${planId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate: false }),
    });
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, is_saved: true } : p));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Plans</h1>
          <p className="mt-1 text-sm text-white/40">
            Browse community plans or build your own
          </p>
        </div>
        {user && (
          <Link href="/plans/create" className="btn-primary shrink-0 text-sm">
            + Create Plan
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-white/[0.06]">
        {[
          { key: "browse", label: "Community Plans" },
          ...(user ? [{ key: "mine", label: "My Plans" }] : []),
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as "browse" | "mine")}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === key
                ? "border-brand-500 text-brand-400"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
        >
          <option value="">All Focus Areas</option>
          {FOCUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse h-44" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-white/40">
            {tab === "mine" ? "You haven't created any plans yet." : "No plans found."}
          </p>
          {tab === "mine" && user && (
            <Link href="/plans/create" className="mt-4 inline-block btn-primary text-sm">
              Create your first plan
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSave={() => savePlan(plan.id)}
              isOwner={user?.username === plan.creator_username}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  isOwner,
}: {
  plan: PlanWithMeta;
  onSave: () => void;
  isOwner: boolean;
}) {
  const focusOption = FOCUS_OPTIONS.find((f) => f.value === plan.focus);
  const catKey = plan.focus as keyof typeof PROTOCOL_CATEGORIES;
  const cat = PROTOCOL_CATEGORIES[catKey];

  return (
    <div className="card flex flex-col gap-3 hover:border-white/[0.12] transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {plan.is_certified && (
              <span className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20">
                ✓ Certified
              </span>
            )}
            {cat && (
              <span className={`badge ${cat.bg} ${cat.color} ${cat.border}`}>
                {focusOption?.label || plan.focus}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white truncate">{plan.title}</h3>
        </div>
      </div>

      {plan.description && (
        <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{plan.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-white/40">
        <span>{plan.duration_weeks}w</span>
        {plan.workout_count > 0 && <span>{plan.workout_count} workouts</span>}
        {plan.difficulty_min && (
          <span>{plan.difficulty_min}{plan.difficulty_max ? `–${plan.difficulty_max}` : "+"}</span>
        )}
        <span>{plan.save_count} saves</span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
        <span className="text-xs text-white/30">by @{plan.creator_username}</span>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={onSave}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${
                plan.is_saved
                  ? "text-brand-400 bg-brand-500/10"
                  : "btn-ghost py-1.5 text-xs"
              }`}
            >
              {plan.is_saved ? "Saved" : "Save"}
            </button>
          )}
          <Link
            href={`/plans/${plan.id}`}
            className="btn-primary text-xs py-1.5 px-3"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
