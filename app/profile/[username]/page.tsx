"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, PROTOCOL_CATEGORIES, BOULDER_GRADES, ROPE_GRADES } from "@/lib/protocols";
import { formatRelativeDate, lbsToKg, getRpeColor } from "@/lib/utils";

interface ProfileData {
  user: {
    id: number;
    username: string;
    display_name: string | null;
    bio: string | null;
    bodyweight_lbs: number | null;
    max_rope_grade: string | null;
    max_boulder_grade: string | null;
    target_rope_grade: string | null;
    target_boulder_grade: string | null;
    created_at: string;
  };
  recentLogs: Array<{ workout_name: string; protocol_type: string; rpe: number; completed_at: string }>;
  recentTests: Array<{ percent_bodyweight: number; total_weight_lbs: number; tested_at: string }>;
  publicPlans: Array<{ id: number; title: string; focus: string; duration_weeks: number; is_certified: boolean }>;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    displayName: "", bio: "", bodyweightLbs: "",
    maxBoulderGrade: "", targetBoulderGrade: "",
    maxRopeGrade: "", targetRopeGrade: "",
  });

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setData(d);
        if (d) {
          setFollowing(d.isFollowing);
          setEditForm({
            displayName: d.user.display_name || "",
            bio: d.user.bio || "",
            bodyweightLbs: d.user.bodyweight_lbs?.toString() || "",
            maxBoulderGrade: d.user.max_boulder_grade || "",
            targetBoulderGrade: d.user.target_boulder_grade || "",
            maxRopeGrade: d.user.max_rope_grade || "",
            targetRopeGrade: d.user.target_rope_grade || "",
          });
        }
        setLoading(false);
      });
  }, [username]);

  const handleFollow = async () => {
    if (!authUser) { router.push("/auth/login"); return; }
    setFollowLoading(true);
    const r = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data?.user.id }),
    });
    const d = await r.json();
    setFollowing(d.following);
    setFollowLoading(false);
  };

  const handleSaveProfile = async () => {
    await fetch(`/api/users/${username}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: editForm.displayName || null,
        bio: editForm.bio || null,
        bodyweightLbs: editForm.bodyweightLbs ? parseFloat(editForm.bodyweightLbs) : null,
        maxBoulderGrade: editForm.maxBoulderGrade || null,
        targetBoulderGrade: editForm.targetBoulderGrade || null,
        maxRopeGrade: editForm.maxRopeGrade || null,
        targetRopeGrade: editForm.targetRopeGrade || null,
      }),
    });
    setData((prev) => prev ? {
      ...prev,
      user: {
        ...prev.user,
        display_name: editForm.displayName || null,
        bio: editForm.bio || null,
        bodyweight_lbs: editForm.bodyweightLbs ? parseFloat(editForm.bodyweightLbs) : null,
        max_boulder_grade: editForm.maxBoulderGrade || null,
        target_boulder_grade: editForm.targetBoulderGrade || null,
        max_rope_grade: editForm.maxRopeGrade || null,
        target_rope_grade: editForm.targetRopeGrade || null,
      },
    } : prev);
    setEditing(false);
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  if (!data) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-white/40">User not found</p>
      <Link href="/dashboard" className="btn-secondary text-sm">Go Home</Link>
    </div>
  );

  const { user: profileUser, recentLogs, recentTests, publicPlans, followerCount, followingCount, isOwnProfile } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      {/* Profile header */}
      <div className="card mb-6">
        {editing ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white mb-2">Edit Profile</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Display Name</label>
                <input type="text" className="input" value={editForm.displayName}
                  onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Bio</label>
                <textarea className="input resize-none min-h-[60px]" value={editForm.bio}
                  onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Bodyweight (lbs)</label>
                <input type="number" className="input" value={editForm.bodyweightLbs}
                  onChange={(e) => setEditForm((f) => ({ ...f, bodyweightLbs: e.target.value }))} />
              </div>
              <div>
                <label className="label">Max Boulder</label>
                <select className="input" value={editForm.maxBoulderGrade}
                  onChange={(e) => setEditForm((f) => ({ ...f, maxBoulderGrade: e.target.value }))}>
                  <option value="">—</option>
                  {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target Boulder</label>
                <select className="input" value={editForm.targetBoulderGrade}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetBoulderGrade: e.target.value }))}>
                  <option value="">—</option>
                  {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Max Rope</label>
                <select className="input" value={editForm.maxRopeGrade}
                  onChange={(e) => setEditForm((f) => ({ ...f, maxRopeGrade: e.target.value }))}>
                  <option value="">—</option>
                  {ROPE_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaveProfile} className="btn-primary text-sm">Save Changes</button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-lg font-bold">
                  {(profileUser.display_name || profileUser.username)[0].toUpperCase()}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    {profileUser.display_name || profileUser.username}
                  </h1>
                  <p className="text-sm text-white/40">@{profileUser.username}</p>
                </div>
              </div>
              {profileUser.bio && (
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{profileUser.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/40">
                <span>{followerCount} followers</span>
                <span>{followingCount} following</span>
              </div>
            </div>
            {isOwnProfile ? (
              <button onClick={() => setEditing(true)} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
                Edit Profile
              </button>
            ) : authUser ? (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`shrink-0 text-xs py-1.5 px-4 rounded-lg transition ${
                  following ? "border border-white/10 bg-white/5 text-white hover:bg-white/10" : "btn-primary"
                }`}
              >
                {followLoading ? "..." : following ? "Following" : "Follow"}
              </button>
            ) : null}
          </div>
        )}

        {/* Stats row */}
        {!editing && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4 md:grid-cols-4">
            <Stat label="Max Boulder" value={profileUser.max_boulder_grade} />
            <Stat label="Target" value={profileUser.target_boulder_grade} dimmed />
            <Stat label="Max Rope" value={profileUser.max_rope_grade} />
            {recentTests[0] && (
              <Stat label="Max Hang" value={`${Math.round(recentTests[0].percent_bodyweight)}% BW`} highlight />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent workouts */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3">Recent Workouts</h2>
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log, i) => {
                const proto = PROTOCOLS[log.protocol_type as keyof typeof PROTOCOLS];
                const cat = proto ? PROTOCOL_CATEGORIES[proto.category] : null;
                return (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm text-white">{log.workout_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cat && <span className={`badge ${cat.bg} ${cat.color} ${cat.border} text-[10px]`}>{cat.label}</span>}
                        <span className="text-xs text-white/30">{formatRelativeDate(log.completed_at)}</span>
                      </div>
                    </div>
                    {log.rpe && (
                      <span className={`text-sm font-bold ${getRpeColor(log.rpe)}`}>RPE {log.rpe}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/30">No workouts yet</p>
          )}
        </div>

        {/* Recent tests */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-3">Strength Tests</h2>
          {recentTests.length > 0 ? (
            <div className="space-y-2">
              {recentTests.map((test, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm text-white">{Math.round(test.total_weight_lbs)} lbs total</p>
                    <p className="text-xs text-white/30">{formatRelativeDate(test.tested_at)}</p>
                  </div>
                  <span className="text-lg font-bold text-brand-400">
                    {Math.round(test.percent_bodyweight)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/30">No tests yet</p>
          )}
        </div>

        {/* Public plans */}
        {publicPlans.length > 0 && (
          <div className="card md:col-span-2">
            <h2 className="text-sm font-semibold text-white mb-3">Training Plans</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {publicPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.id}`}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {plan.is_certified && (
                        <span className="text-brand-400 text-xs">✓</span>
                      )}
                      <p className="text-sm font-medium text-white">{plan.title}</p>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{plan.duration_weeks} weeks · {plan.focus}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white/30">
                    <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, dimmed, highlight }: {
  label: string; value: string | null | undefined; dimmed?: boolean; highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-brand-400" : dimmed ? "text-white/40" : "text-white"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
