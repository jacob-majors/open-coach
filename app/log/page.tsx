"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, PROTOCOL_CATEGORIES } from "@/lib/protocols";
import { formatRelativeDate, getRpeColor } from "@/lib/utils";
import type { Log, ProtocolType } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: "Very easy — barely any effort",
  2: "Easy — could do this all day",
  3: "Light — comfortable and sustainable",
  4: "Moderate — breathing harder but easy conversation",
  5: "Somewhat hard — noticeably challenging",
  6: "Hard — pushing but controlled",
  7: "Very hard — difficult to maintain",
  8: "Very very hard — near your limit",
  9: "Almost max — one more rep would be failure",
  10: "Max effort — absolute limit",
};

export default function LogPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRpeInfo, setShowRpeInfo] = useState(false);

  const defaultProtocol = PROTOCOLS["max_hang"];

  const [form, setForm] = useState({
    workoutName: "",
    protocolType: "max_hang" as ProtocolType,
    weightLbs: "",
    rpe: 7,
    notes: "",
    setsCompleted: "",
  });

  // When protocol changes, auto-update name if it's blank or matches a protocol name
  const handleProtocolChange = (newType: ProtocolType) => {
    const newProto = PROTOCOLS[newType];
    const oldProto = PROTOCOLS[form.protocolType];
    const nameIsAutoFilled = !form.workoutName || form.workoutName === oldProto?.name;
    setForm((f) => ({
      ...f,
      protocolType: newType,
      workoutName: nameIsAutoFilled ? (newProto?.name || f.workoutName) : f.workoutName,
      weightLbs: "",
    }));
  };

  useEffect(() => {
    if (!authLoading && !user) { window.location.href = "/auth/login"; return; }
    if (!authLoading && user) {
      fetch("/api/logs?limit=30")
        .then((r) => r.json())
        .then((d) => { setLogs(d.logs || []); setLoading(false); });
    }
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const proto = PROTOCOLS[form.protocolType];
    const nameToSave = form.workoutName.trim() || proto?.name || "Workout";
    const r = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutName: nameToSave,
        protocolType: form.protocolType,
        weightLbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
        rpe: form.rpe,
        notes: form.notes || null,
        setsCompleted: form.setsCompleted ? parseInt(form.setsCompleted) : null,
      }),
    });
    if (r.ok) {
      const data = await r.json();
      const newLog: Log = {
        id: data.id as number,
        user_id: user!.userId,
        workout_id: null,
        plan_id: null,
        workout_name: nameToSave,
        protocol_type: form.protocolType,
        weight_lbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
        rpe: form.rpe,
        notes: form.notes || null,
        duration_minutes: null,
        sets_completed: form.setsCompleted ? parseInt(form.setsCompleted) : null,
        completed_at: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);
      setForm({ workoutName: "", protocolType: "max_hang", weightLbs: "", rpe: 7, notes: "", setsCompleted: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  // Build weekly volume chart
  const weeklyData: Record<string, number> = {};
  for (const log of logs) {
    const week = getWeekLabel(log.completed_at);
    weeklyData[week] = (weeklyData[week] || 0) + 1;
  }
  const chartData = Object.entries(weeklyData).slice(-8).map(([week, count]) => ({ week, count }));

  const selectedProto = PROTOCOLS[form.protocolType];
  const usesWeight = selectedProto?.category === "finger_strength";

  if (authLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Log</h1>
          <p className="mt-1 text-sm text-white/40">{logs.length} sessions logged</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm">
          + Log Workout
        </button>
      </div>

      {/* Quick log form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Log a Workout</h2>

          {/* Protocol selector */}
          <div>
            <label className="label">Protocol</label>
            <select
              className="input"
              value={form.protocolType}
              onChange={(e) => handleProtocolChange(e.target.value as ProtocolType)}
            >
              {Object.values(PROTOCOLS).map((p) => (
                <option key={p.type} value={p.type}>{p.name}</option>
              ))}
            </select>
            {selectedProto && (
              <p className="mt-1.5 text-xs text-white/30 leading-relaxed">{selectedProto.description}</p>
            )}
          </div>

          {/* Name — optional, defaults to protocol name */}
          <div>
            <label className="label">
              Name <span className="text-white/25 font-normal">(optional — defaults to protocol name)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder={selectedProto?.name || "Workout name"}
              value={form.workoutName}
              onChange={(e) => setForm((f) => ({ ...f, workoutName: e.target.value }))}
            />
          </div>

          {/* Weight — only for finger strength */}
          {usesWeight && (
            <div>
              <label className="label">Added Weight (lbs) <span className="text-white/25 font-normal">— optional</span></label>
              <input
                type="number"
                step="0.5"
                className="input"
                placeholder="e.g. 15 (leave blank for bodyweight only)"
                value={form.weightLbs}
                onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))}
              />
            </div>
          )}

          {/* RPE */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">RPE</label>
              <button
                type="button"
                onClick={() => setShowRpeInfo((v) => !v)}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white/40 hover:text-white/70 hover:border-white/40 transition"
              >
                ?
              </button>
            </div>
            {showRpeInfo && (
              <div className="mb-3 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-xs font-semibold text-white mb-1.5">Rate of Perceived Exertion (1–10)</p>
                <p className="text-xs text-white/50 leading-relaxed">
                  RPE measures how hard an exercise felt — not just the weight lifted. A 10 means you couldn&apos;t do another rep. A 7 means you had 3 reps left in the tank. Use it to track training intensity over time.
                </p>
                <div className="mt-2 space-y-0.5">
                  {[1,4,6,8,10].map(n => (
                    <p key={n} className="text-[11px] text-white/30">
                      <span className="text-white/50 font-semibold">{n}</span> — {RPE_DESCRIPTIONS[n]}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} type="button"
                  onClick={() => setForm((f) => ({ ...f, rpe: n }))}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition ${
                    form.rpe === n
                      ? n <= 4 ? "bg-green-500 text-black" : n <= 7 ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                      : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-white/30">
              {form.rpe <= 3 ? "Easy" : form.rpe <= 5 ? "Moderate" : form.rpe <= 7 ? "Hard" : form.rpe <= 9 ? "Very Hard" : "Max effort"}
              {" "}&mdash; {RPE_DESCRIPTIONS[form.rpe]}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes <span className="text-white/25 font-normal">— optional</span></label>
            <textarea
              className="input min-h-[60px] resize-none"
              placeholder="How did it feel? Grip position, form notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Saving..." : "Save Log"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-5">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Weekly volume chart */}
      {chartData.length > 1 && (
        <div className="card mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Weekly Workout Volume</h2>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                  formatter={(v) => [`${v} sessions`, "Volume"]}
                />
                <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Logs list */}
      <div className="space-y-2">
        {logs.map((log) => {
          const proto = PROTOCOLS[log.protocol_type as keyof typeof PROTOCOLS];
          const cat = proto ? PROTOCOL_CATEGORIES[proto.category] : null;
          return (
            <div key={log.id} className="card flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {cat && (
                    <span className={`badge ${cat.bg} ${cat.color} ${cat.border}`}>{cat.label}</span>
                  )}
                  <span className="text-xs text-white/30">{formatRelativeDate(log.completed_at)}</span>
                </div>
                <p className="font-medium text-white truncate">{log.workout_name}</p>
                {log.notes && (
                  <p className="text-xs text-white/40 mt-0.5 truncate">{log.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {log.rpe && (
                  <p className={`text-sm font-bold ${getRpeColor(log.rpe)}`}>RPE {log.rpe}</p>
                )}
                {log.weight_lbs && (
                  <p className="text-xs text-white/40">+{Math.round(log.weight_lbs)} lbs</p>
                )}
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-white/40">No workouts logged yet</p>
            <button onClick={() => setShowForm(true)} className="mt-4 btn-primary text-sm">
              Log your first workout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - d.getDay());
  return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
