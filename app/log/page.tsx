"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, PROTOCOL_CATEGORIES } from "@/lib/protocols";
import { formatRelativeDate, getRpeColor, lbsToKg } from "@/lib/utils";
import type { Log, ProtocolType } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function LogPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    workoutName: "",
    protocolType: "max_hang" as ProtocolType,
    weightLbs: "",
    rpe: 7,
    notes: "",
    setsCompleted: "",
  });

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
    if (!form.workoutName) return;
    setSubmitting(true);
    const r = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutName: form.workoutName,
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
        workout_name: form.workoutName,
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

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Exercise Name</label>
              <input type="text" className="input" placeholder="e.g. Max Hangs, Repeaters"
                value={form.workoutName}
                onChange={(e) => setForm((f) => ({ ...f, workoutName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Protocol</label>
              <select className="input" value={form.protocolType}
                onChange={(e) => setForm((f) => ({ ...f, protocolType: e.target.value as ProtocolType }))}>
                {Object.values(PROTOCOLS).map((p) => (
                  <option key={p.type} value={p.type}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Weight Used (lbs)</label>
              <input type="number" step="0.5" className="input" placeholder="Added weight"
                value={form.weightLbs}
                onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">RPE (1–10)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} type="button"
                  onClick={() => setForm((f) => ({ ...f, rpe: n }))}
                  className={`h-9 w-9 rounded-lg text-sm font-bold transition ${
                    form.rpe === n
                      ? n <= 4 ? "bg-green-500 text-black" : n <= 7 ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                      : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-[60px] resize-none" placeholder="How did it feel?"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting || !form.workoutName} className="btn-primary flex-1">
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
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                  formatter={(v) => [`${v} sessions`, "Volume"]} />
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
