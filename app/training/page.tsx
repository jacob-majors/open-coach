"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { PROTOCOLS, PROTOCOL_CATEGORIES, calculateTrainingWeight } from "@/lib/protocols";
import { formatRelativeDate, getRpeColor, lbsToKg, formatDate } from "@/lib/utils";
import type { Log, Test, ProtocolType } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from "recharts";

type Tab = "log" | "test" | "assess";

const RPE_DESCRIPTIONS: Record<number, string> = {
  1: "Very easy", 2: "Easy", 3: "Light", 4: "Moderate", 5: "Somewhat hard",
  6: "Hard", 7: "Very hard", 8: "Near max", 9: "Almost failure", 10: "Max effort",
};

export default function TrainingPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("log");

  useEffect(() => {
    if (!authLoading && !user) window.location.href = "/auth/login";
  }, [user, authLoading]);

  if (authLoading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Training</h1>
        <p className="mt-1 text-sm text-white/40">Log workouts, test your strength, and assess your climbing</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
        {([
          { key: "log", label: "Workout Log" },
          { key: "test", label: "Hang Test" },
          { key: "assess", label: "Assessment" },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === key ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "log" && <LogTab user={user} />}
      {tab === "test" && <TestTab user={user} />}
      {tab === "assess" && <AssessTab />}
    </div>
  );
}

// ── Log Tab ──────────────────────────────────────────────────────────────────

function LogTab({ user }: { user: { userId: number } }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRpeInfo, setShowRpeInfo] = useState(false);
  const [form, setForm] = useState({
    workoutName: "", protocolType: "max_hang" as ProtocolType,
    weightLbs: "", rpe: 7, notes: "", setsCompleted: "",
  });

  useEffect(() => {
    fetch("/api/logs?limit=30")
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs || []); setLoading(false); });
  }, []);

  const handleProtocolChange = (newType: ProtocolType) => {
    const newProto = PROTOCOLS[newType];
    const oldProto = PROTOCOLS[form.protocolType];
    const nameIsAuto = !form.workoutName || form.workoutName === oldProto?.name;
    setForm((f) => ({ ...f, protocolType: newType, workoutName: nameIsAuto ? (newProto?.name || "") : f.workoutName, weightLbs: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const proto = PROTOCOLS[form.protocolType];
    const name = form.workoutName.trim() || proto?.name || "Workout";
    const r = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutName: name, protocolType: form.protocolType,
        weightLbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
        rpe: form.rpe, notes: form.notes || null,
        setsCompleted: form.setsCompleted ? parseInt(form.setsCompleted) : null,
      }),
    });
    if (r.ok) {
      const data = await r.json();
      setLogs((prev) => [{
        id: data.id, user_id: user.userId, workout_id: null, plan_id: null,
        workout_name: name, protocol_type: form.protocolType,
        weight_lbs: form.weightLbs ? parseFloat(form.weightLbs) : null,
        rpe: form.rpe, notes: form.notes || null, duration_minutes: null,
        sets_completed: form.setsCompleted ? parseInt(form.setsCompleted) : null,
        completed_at: new Date().toISOString(),
      }, ...prev]);
      setForm({ workoutName: "", protocolType: "max_hang", weightLbs: "", rpe: 7, notes: "", setsCompleted: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const weeklyData: Record<string, number> = {};
  for (const log of logs) {
    const d = new Date(log.completed_at);
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const k = ws.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeklyData[k] = (weeklyData[k] || 0) + 1;
  }
  const chartData = Object.entries(weeklyData).slice(-8).map(([week, count]) => ({ week, count }));

  const selectedProto = PROTOCOLS[form.protocolType];
  const usesWeight = selectedProto?.category === "finger_strength";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{logs.length} sessions logged</p>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-sm">+ Log Workout</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-sm font-semibold text-white">Log a Workout</h2>

          <div>
            <label className="label">Protocol</label>
            <select className="input" value={form.protocolType}
              onChange={(e) => handleProtocolChange(e.target.value as ProtocolType)}>
              {Object.values(PROTOCOLS).map((p) => <option key={p.type} value={p.type}>{p.name}</option>)}
            </select>
            {selectedProto && <p className="mt-1.5 text-xs text-white/30">{selectedProto.description}</p>}
          </div>

          <div>
            <label className="label">Name <span className="text-white/25 font-normal">— optional</span></label>
            <input type="text" className="input" placeholder={selectedProto?.name || "Workout name"}
              value={form.workoutName} onChange={(e) => setForm((f) => ({ ...f, workoutName: e.target.value }))} />
          </div>

          {usesWeight && (
            <div>
              <label className="label">Added Weight (lbs) <span className="text-white/25 font-normal">— optional</span></label>
              <input type="number" step="0.5" className="input" placeholder="Leave blank for bodyweight only"
                value={form.weightLbs} onChange={(e) => setForm((f) => ({ ...f, weightLbs: e.target.value }))} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="label mb-0">RPE</label>
              <button type="button" onClick={() => setShowRpeInfo((v) => !v)}
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white/40 hover:text-white/70 transition">
                ?
              </button>
            </div>
            {showRpeInfo && (
              <div className="mb-3 rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 text-xs text-white/50 leading-relaxed">
                Rate of Perceived Exertion — 10 means you couldn&apos;t do another rep. 7 means 3 reps left in the tank.
              </div>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rpe: n }))}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition ${
                    form.rpe === n
                      ? n <= 4 ? "bg-green-500 text-black" : n <= 7 ? "bg-yellow-500 text-black" : "bg-red-500 text-white"
                      : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  }`}>{n}</button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-white/30">{RPE_DESCRIPTIONS[form.rpe]}</p>
          </div>

          <div>
            <label className="label">Notes <span className="text-white/25 font-normal">— optional</span></label>
            <textarea className="input min-h-[60px] resize-none" placeholder="How did it feel?"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Saving..." : "Save Log"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-5">Cancel</button>
          </div>
        </form>
      )}

      {chartData.length > 1 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Weekly Volume</h2>
          <div className="h-32">
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

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const proto = PROTOCOLS[log.protocol_type as keyof typeof PROTOCOLS];
            const cat = proto ? PROTOCOL_CATEGORIES[proto.category] : null;
            return (
              <div key={log.id} className="card flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {cat && <span className={`badge ${cat.bg} ${cat.color} ${cat.border}`}>{cat.label}</span>}
                    <span className="text-xs text-white/30">{formatRelativeDate(log.completed_at)}</span>
                  </div>
                  <p className="font-medium text-white truncate">{log.workout_name}</p>
                  {log.notes && <p className="text-xs text-white/40 mt-0.5 truncate">{log.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  {log.rpe && <p className={`text-sm font-bold ${getRpeColor(log.rpe)}`}>RPE {log.rpe}</p>}
                  {log.weight_lbs && <p className="text-xs text-white/40">+{Math.round(log.weight_lbs)} lbs</p>}
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-white/40">No workouts logged yet</p>
              <button onClick={() => setShowForm(true)} className="mt-4 btn-primary text-sm">Log your first workout</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Test Tab ─────────────────────────────────────────────────────────────────

function TestTab({ user }: { user: { userId: number } }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ bodyweightLbs: "", addedWeightLbs: "", edgeMm: "20", hangTimeS: "10", notes: "" });

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.json())
      .then((d) => { setTests(d.tests || []); setLoading(false); });
  }, []);

  const totalWeight = parseFloat(form.bodyweightLbs || "0") + parseFloat(form.addedWeightLbs || "0");
  const percentBW = form.bodyweightLbs ? (totalWeight / parseFloat(form.bodyweightLbs)) * 100 : 0;
  const latestTest = tests[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bodyweightLbs) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyweightLbs: parseFloat(form.bodyweightLbs),
          addedWeightLbs: parseFloat(form.addedWeightLbs || "0"),
          edgeMm: parseInt(form.edgeMm),
          hangTimeS: parseInt(form.hangTimeS),
          notes: form.notes || null,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const newTest: Test = {
          id: data.id, user_id: user.userId, edge_mm: parseInt(form.edgeMm),
          bodyweight_lbs: parseFloat(form.bodyweightLbs),
          added_weight_lbs: parseFloat(form.addedWeightLbs || "0"),
          total_weight_lbs: totalWeight, percent_bodyweight: data.percentBodyweight,
          hang_time_s: parseInt(form.hangTimeS), notes: form.notes || null,
          tested_at: new Date().toISOString(),
        };
        setTests((prev) => [newTest, ...prev]);
        setForm({ bodyweightLbs: "", addedWeightLbs: "", edgeMm: "20", hangTimeS: "10", notes: "" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally { setSubmitting(false); }
  };

  const chartData = [...tests].reverse().map((t) => ({
    date: new Date(t.tested_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    percent: Math.round(t.percent_bodyweight),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Form */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Record New Test</h2>
          {success && (
            <div className="mb-4 rounded-lg bg-brand-500/10 border border-brand-500/20 p-3 text-sm text-brand-400">
              Test recorded!
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bodyweight (lbs)</label>
                <input type="number" step="0.1" className="input" placeholder="e.g. 155"
                  value={form.bodyweightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, bodyweightLbs: e.target.value }))} required />
                {form.bodyweightLbs && <p className="mt-1 text-xs text-white/30">{lbsToKg(parseFloat(form.bodyweightLbs))} kg</p>}
              </div>
              <div>
                <label className="label">Added Weight (lbs)</label>
                <input type="number" step="0.5" className="input" placeholder="0 = bodyweight"
                  value={form.addedWeightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, addedWeightLbs: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Edge Size (mm)</label>
                <select className="input" value={form.edgeMm} onChange={(e) => setForm((f) => ({ ...f, edgeMm: e.target.value }))}>
                  <option value="20">20mm (standard)</option>
                  <option value="18">18mm</option>
                  <option value="16">16mm</option>
                  <option value="14">14mm</option>
                  <option value="12">12mm</option>
                </select>
              </div>
              <div>
                <label className="label">Hang Time (s)</label>
                <select className="input" value={form.hangTimeS} onChange={(e) => setForm((f) => ({ ...f, hangTimeS: e.target.value }))}>
                  <option value="5">5s</option>
                  <option value="7">7s</option>
                  <option value="10">10s (standard)</option>
                  <option value="12">12s</option>
                </select>
              </div>
            </div>

            {form.bodyweightLbs && (
              <div className="rounded-xl bg-brand-500/5 border border-brand-500/20 p-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">Total</p>
                    <p className="text-lg font-bold text-white">{Math.round(totalWeight * 10) / 10} <span className="text-xs text-white/40">lbs</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">% BW</p>
                    <p className="text-lg font-bold text-brand-400">{Math.round(percentBW)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">Added</p>
                    <p className="text-lg font-bold text-white">
                      {parseFloat(form.addedWeightLbs || "0") >= 0 ? "+" : ""}
                      {Math.round(parseFloat(form.addedWeightLbs || "0") * 10) / 10} <span className="text-xs text-white/40">lbs</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Notes (optional)</label>
              <input type="text" className="input" placeholder="Grip type, conditions, etc."
                value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting || !form.bodyweightLbs} className="btn-primary w-full py-3">
              {submitting ? "Saving..." : "Record Test"}
            </button>
          </form>
        </div>

        {/* Latest + calculator */}
        <div className="flex flex-col gap-4">
          {latestTest && (
            <div className="card">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">Latest Result</p>
              <p className="text-4xl font-bold text-brand-400">
                {Math.round(latestTest.percent_bodyweight)}%
                <span className="text-lg font-normal text-white/40 ml-1">BW</span>
              </p>
              <p className="mt-1 text-sm text-white/60">{Math.round(latestTest.total_weight_lbs)} lbs total</p>
              <p className="mt-0.5 text-xs text-white/30">
                {formatRelativeDate(latestTest.tested_at)} · {latestTest.edge_mm}mm · {latestTest.hang_time_s}s
              </p>
              {tests.length > 1 && (
                <p className={`mt-2 text-sm font-bold ${tests[0].percent_bodyweight >= tests[1].percent_bodyweight ? "text-brand-400" : "text-red-400"}`}>
                  {tests[0].percent_bodyweight >= tests[1].percent_bodyweight ? "+" : ""}
                  {Math.round(tests[0].percent_bodyweight - tests[1].percent_bodyweight)}% vs previous
                </p>
              )}
            </div>
          )}

          {latestTest && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Training Weights</h3>
              <div className="space-y-2">
                {[
                  { label: "Repeaters (65%)", pct: 65 },
                  { label: "Density Hangs (55%)", pct: 55 },
                  { label: "Max Hang (85%)", pct: 85 },
                ].map(({ label, pct }) => {
                  const { addedWeight, totalWeight: tw } = calculateTrainingWeight(
                    latestTest.total_weight_lbs, latestTest.bodyweight_lbs, pct
                  );
                  return (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-sm text-white/70">{label}</span>
                      <span className="text-sm font-bold text-white">
                        {addedWeight >= 0 ? "+" : ""}{addedWeight} lbs
                        <span className="text-xs font-normal text-white/30 ml-1">({tw} total)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Strength Progress</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px", color: "#fff" }}
                  formatter={(v) => [`${v}% BW`, "Max Hang"]} />
                <Line type="monotone" dataKey="percent" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History table */}
      {!loading && tests.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="text-sm font-semibold text-white mb-4">Test History</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Date", "Edge", "Added", "Total", "% BW"].map((h) => (
                  <th key={h} className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => (
                <tr key={t.id} className="border-b border-white/[0.04]">
                  <td className="py-2.5 text-white/60">{formatDate(t.tested_at)}</td>
                  <td className="py-2.5 text-white/60">{t.edge_mm}mm</td>
                  <td className="py-2.5 text-white/60">{t.added_weight_lbs >= 0 ? "+" : ""}{Math.round(t.added_weight_lbs)} lbs</td>
                  <td className="py-2.5 text-white">{Math.round(t.total_weight_lbs)} lbs</td>
                  <td className="py-2.5">
                    <span className={`font-bold ${i === 0 ? "text-brand-400" : t.percent_bodyweight >= (tests[i - 1]?.percent_bodyweight || 0) ? "text-brand-400" : "text-red-400"}`}>
                      {Math.round(t.percent_bodyweight)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Assess Tab ───────────────────────────────────────────────────────────────

function AssessTab() {
  return (
    <div className="space-y-4">
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />
        <h2 className="text-base font-semibold text-white">Climber Assessment</h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          Answer a few questions about your current level and get a personalized analysis of your strengths, limiting factors, and a 4-week training plan built specifically for you.
        </p>
        <ul className="mt-4 space-y-2">
          {[
            "Current bouldering grade",
            "Max hang strength (% bodyweight)",
            "Max pull-ups",
            "Campus reach + vertical jump",
            "L-sit hold time",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <Link href="/assessment" className="mt-6 block btn-primary text-center text-sm py-3">
          Start Assessment →
        </Link>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3">What you&apos;ll get</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Limiting Factor", desc: "Finger strength, power, endurance, or technique" },
            { title: "Benchmarks", desc: "See how your numbers compare to your grade" },
            { title: "4-Week Plan", desc: "Auto-generated plan saved to your account" },
          ].map((item) => (
            <div key={item.title} className="rounded-lg bg-white/[0.03] px-3 py-3">
              <p className="text-sm font-medium text-white mb-1">{item.title}</p>
              <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
