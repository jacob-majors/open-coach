"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatRelativeDate } from "@/lib/utils";

type Tab = "feed" | "coaches" | "plans";

interface FeedData {
  sends: Array<{
    grade: string;
    problem_name: string | null;
    location: string | null;
    style: string | null;
    notes: string | null;
    sent_at: string;
    username: string;
    display_name: string | null;
  }>;
  tests: Array<{
    percent_bodyweight: number;
    added_weight_lbs: number;
    tested_at: string;
    username: string;
    display_name: string | null;
  }>;
  athletes: Array<{
    id: number;
    username: string;
    display_name: string | null;
    bio: string | null;
    max_boulder_grade: string | null;
    role: string | null;
  }>;
}

interface CoachesData {
  coaches: Array<{
    id: number;
    username: string;
    display_name: string | null;
    bio: string | null;
    max_boulder_grade: string | null;
    avatar_url: string | null;
    plan_count: number;
  }>;
}

interface PlansData {
  plans: Array<{
    id: number;
    title: string;
    description: string | null;
    focus: string;
    duration_weeks: number;
    difficulty_min: string | null;
    difficulty_max: string | null;
    is_certified: number;
    creator_username: string;
    creator_name: string | null;
  }>;
}

const FOCUS_COLORS: Record<string, string> = {
  strength: "bg-red-500/10 text-red-400 border-red-500/20",
  endurance: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  power: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  general: "bg-white/10 text-white/50 border-white/10",
  technique: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function CommunityPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("feed");
  const [data, setData] = useState<FeedData | CoachesData | PlansData | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleUpdating, setRoleUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !authUser) {
      window.location.href = "/auth/login";
    }
  }, [authUser, authLoading]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/community?tab=${tab}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab]);

  const updateRole = async (role: "athlete" | "coach") => {
    setRoleUpdating(true);
    await fetch("/api/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const feedData = tab === "feed" ? (data as FeedData) : null;
  const coachesData = tab === "coaches" ? (data as CoachesData) : null;
  const plansData = tab === "plans" ? (data as PlansData) : null;

  // Merge feed items sorted by date
  const feedItems: Array<{ type: "send" | "test"; date: string; data: FeedData["sends"][0] | FeedData["tests"][0] }> = [];
  if (feedData) {
    feedData.sends?.forEach((s) => feedItems.push({ type: "send", date: s.sent_at, data: s }));
    feedData.tests?.forEach((t) => feedItems.push({ type: "test", date: t.tested_at, data: t }));
    feedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="mt-1 text-sm text-white/40">Connect with athletes and coaches</p>
        </div>

        {/* Role switcher */}
        {authUser && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-1 gap-1">
              <button
                onClick={() => updateRole("athlete")}
                disabled={roleUpdating}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${authUser.role === "athlete" || !authUser.role ? "bg-brand-500 text-black" : "text-white/50 hover:text-white"}`}
              >
                Athlete
              </button>
              <button
                onClick={() => updateRole("coach")}
                disabled={roleUpdating}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${authUser.role === "coach" || authUser.role === "admin" ? "bg-brand-500 text-black" : "text-white/50 hover:text-white"}`}
              >
                Coach
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
        {(["feed", "coaches", "plans"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition capitalize ${
              tab === t
                ? "bg-brand-500/15 text-brand-400"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t === "feed" ? "Activity Feed" : t === "coaches" ? "Coaches" : "Shared Plans"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Feed Tab */}
          {tab === "feed" && feedData && (
            <div className="space-y-3">
              {feedItems.length === 0 && (
                <div className="card py-16 text-center">
                  <p className="text-white/40">No activity yet. Be the first to log a send!</p>
                  <Link href="/log" className="mt-4 inline-block btn-primary text-sm px-5 py-2">
                    Log a send
                  </Link>
                </div>
              )}
              {feedItems.map((item, i) => {
                if (item.type === "send") {
                  const s = item.data as FeedData["sends"][0];
                  return (
                    <div key={i} className="card flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 text-sm font-bold">
                        {(s.display_name || s.username)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/profile/${s.username}`}
                            className="text-sm font-semibold text-white hover:text-brand-400 transition"
                          >
                            {s.display_name || s.username}
                          </Link>
                          <span className="text-xs text-white/30">sent</span>
                          <span className="inline-flex items-center rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-400 border border-brand-500/20">
                            {s.grade}
                          </span>
                          {s.problem_name && (
                            <span className="text-sm text-white/80">{s.problem_name}</span>
                          )}
                        </div>
                        {(s.location || s.style || s.notes) && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {s.location && <span className="text-xs text-white/40">{s.location}</span>}
                            {s.style && <span className="text-xs text-white/30">· {s.style}</span>}
                            {s.notes && <p className="w-full text-xs text-white/50 mt-0.5">&ldquo;{s.notes}&rdquo;</p>}
                          </div>
                        )}
                        <p className="mt-1 text-[10px] text-white/20">{formatRelativeDate(s.sent_at)}</p>
                      </div>
                    </div>
                  );
                } else {
                  const t = item.data as FeedData["tests"][0];
                  return (
                    <div key={i} className="card flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-400 text-sm font-bold">
                        {(t.display_name || t.username)[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/profile/${t.username}`}
                            className="text-sm font-semibold text-white hover:text-brand-400 transition"
                          >
                            {t.display_name || t.username}
                          </Link>
                          <span className="text-xs text-white/30">max hang</span>
                          <span className="text-sm font-bold text-green-400">
                            {Math.round(t.percent_bodyweight)}% BW
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-white/20">{formatRelativeDate(t.tested_at)}</p>
                      </div>
                    </div>
                  );
                }
              })}

              {/* Athletes section */}
              {feedData.athletes && feedData.athletes.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wider text-xs">
                    Athletes on Session
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedData.athletes.map((a) => (
                      <Link
                        key={a.id}
                        href={`/profile/${a.username}`}
                        className="card hover:border-brand-500/20 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-sm font-bold">
                            {(a.display_name || a.username)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition truncate">
                              {a.display_name || a.username}
                            </p>
                            <p className="text-xs text-white/30">@{a.username}</p>
                          </div>
                          {a.max_boulder_grade && (
                            <span className="ml-auto text-sm font-bold text-brand-400 shrink-0">
                              {a.max_boulder_grade}
                            </span>
                          )}
                        </div>
                        {a.bio && (
                          <p className="mt-2 text-xs text-white/40 line-clamp-2">{a.bio}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coaches Tab */}
          {tab === "coaches" && coachesData && (
            <div>
              {(!coachesData.coaches || coachesData.coaches.length === 0) ? (
                <div className="card py-16 text-center">
                  <p className="text-white/40 mb-2">No coaches yet.</p>
                  <p className="text-xs text-white/25">Switch your role to Coach above to appear here.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {coachesData.coaches.map((coach) => (
                    <Link
                      key={coach.id}
                      href={`/profile/${coach.username}`}
                      className="card hover:border-brand-500/20 transition group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 text-sm font-bold">
                          {(coach.display_name || coach.username)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition">
                            {coach.display_name || coach.username}
                          </p>
                          <p className="text-[10px] text-white/30">@{coach.username}</p>
                        </div>
                        {Number(coach.plan_count) > 0 && (
                          <div className="ml-auto text-right shrink-0">
                            <p className="text-sm font-bold text-white">{coach.plan_count}</p>
                            <p className="text-[10px] text-white/30">plans shared</p>
                          </div>
                        )}
                      </div>
                      {coach.bio && (
                        <p className="text-xs text-white/50 line-clamp-2">{coach.bio}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shared Plans Tab */}
          {tab === "plans" && plansData && (
            <div className="space-y-3">
              {(!plansData.plans || plansData.plans.length === 0) ? (
                <div className="card py-16 text-center">
                  <p className="text-white/40 mb-2">No public plans yet.</p>
                  <Link href="/plans" className="mt-3 inline-block btn-primary text-sm px-5 py-2">
                    Browse All Plans
                  </Link>
                </div>
              ) : (
                plansData.plans.map((plan) => {
                  const focusColor = FOCUS_COLORS[plan.focus] || FOCUS_COLORS.general;
                  return (
                    <div key={plan.id} className="card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border capitalize ${focusColor}`}>
                              {plan.focus}
                            </span>
                            {plan.is_certified ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-400 border border-yellow-500/20">
                                ✓ Certified
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-sm font-semibold text-white">{plan.title}</h3>
                          {plan.description && (
                            <p className="mt-1 text-xs text-white/50 line-clamp-2">{plan.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-white/30">{plan.duration_weeks}w</span>
                            {plan.difficulty_min && (
                              <span className="text-xs text-white/30">
                                {plan.difficulty_min}
                                {plan.difficulty_max && plan.difficulty_max !== plan.difficulty_min
                                  ? `–${plan.difficulty_max}`
                                  : ""}
                              </span>
                            )}
                            <span className="text-xs text-white/20">by {plan.creator_name || plan.creator_username}</span>
                          </div>
                        </div>
                        <Link
                          href={`/plans/${plan.id}`}
                          className="btn-secondary shrink-0 text-xs py-1.5 px-3"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
