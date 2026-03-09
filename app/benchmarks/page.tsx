"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

interface Athlete {
  id: number;
  username: string;
  display_name: string | null;
  comp_team: number | null;
}

interface KilterBenchmark {
  id: number;
  climb_name: string;
  grade: string | null;
  angle: number | null;
  notes: string | null;
  is_completed: number;
  created_at: string;
  coach_name: string | null;
}

interface FitnessBenchmark {
  id: number;
  type: string;
  value: number;
  notes: string | null;
  recorded_at: string;
}

const FITNESS_TYPES = ["pullups", "pushups", "plank"];
const FITNESS_LABELS: Record<string, string> = { pullups: "Pull-ups", pushups: "Push-ups", plank: "Plank (s)" };

export default function BenchmarksPage() {
  const { user, loading } = useAuth();
  const isCoach = user?.role === "coach" || user?.role === "admin";

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<"kilter" | "fitness">("kilter");

  const [kilter, setKilter] = useState<KilterBenchmark[]>([]);
  const [fitness, setFitness] = useState<FitnessBenchmark[]>([]);

  // Add kilter form
  const [kForm, setKForm] = useState({ climbName: "", grade: "", angle: "", notes: "" });
  const [kSaving, setKSaving] = useState(false);

  // Add fitness form
  const [fForm, setFForm] = useState({ type: "pullups", value: "" });
  const [fSaving, setFSaving] = useState(false);

  useEffect(() => {
    if (loading || !isCoach) return;
    fetch("/api/roster")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.athletes || []).filter((a: Athlete & { role?: string }) => a.role === "athlete");
        setAthletes(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, [loading, isCoach]);

  useEffect(() => {
    if (!selectedId) return;
    if (tab === "kilter") {
      fetch(`/api/benchmarks/kilter?athleteId=${selectedId}`)
        .then((r) => r.json())
        .then((d) => setKilter(d.benchmarks || []));
    } else {
      fetch(`/api/benchmarks?userId=${selectedId}`)
        .then((r) => r.json())
        .then((d) => setFitness((d.benchmarks || []).filter((b: FitnessBenchmark) => FITNESS_TYPES.includes(b.type))));
    }
  }, [selectedId, tab]);

  const addKilter = async () => {
    if (!selectedId || !kForm.climbName) return;
    setKSaving(true);
    await fetch("/api/benchmarks/kilter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId: selectedId, climbName: kForm.climbName, grade: kForm.grade || null, angle: kForm.angle ? parseInt(kForm.angle) : null, notes: kForm.notes || null }),
    });
    setKForm({ climbName: "", grade: "", angle: "", notes: "" });
    const d = await fetch(`/api/benchmarks/kilter?athleteId=${selectedId}`).then((r) => r.json());
    setKilter(d.benchmarks || []);
    setKSaving(false);
  };

  const toggleKilter = async (id: number, isCompleted: number) => {
    await fetch("/api/benchmarks/kilter", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCompleted: !isCompleted }),
    });
    setKilter((prev) => prev.map((b) => b.id === id ? { ...b, is_completed: isCompleted ? 0 : 1 } : b));
  };

  const deleteKilter = async (id: number) => {
    await fetch("/api/benchmarks/kilter", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKilter((prev) => prev.filter((b) => b.id !== id));
  };

  const addFitness = async () => {
    if (!selectedId || !fForm.value) return;
    setFSaving(true);
    await fetch("/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedId, type: fForm.type, value: parseFloat(fForm.value) }),
    });
    setFForm((f) => ({ ...f, value: "" }));
    const d = await fetch(`/api/benchmarks?userId=${selectedId}`).then((r) => r.json());
    setFitness((d.benchmarks || []).filter((b: FitnessBenchmark) => FITNESS_TYPES.includes(b.type)));
    setFSaving(false);
  };

  const deleteFitness = async (id: number) => {
    await fetch("/api/benchmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setFitness((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;
  if (!isCoach) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4"><p className="text-white/40">Coaches only</p></div>;

  const selectedAthlete = athletes.find((a) => a.id === selectedId);

  // Simple SVG line chart for fitness
  const fitnessChart = (type: string) => {
    const entries = fitness.filter((b) => b.type === type).slice(0, 10).reverse();
    if (entries.length < 2) return null;
    const vals = entries.map((e) => e.value);
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.1 || 1;
    const w = 200, h = 60;
    const points = entries.map((e, i) => {
      const x = (i / (entries.length - 1)) * w;
      const y = h - ((e.value - min) / (max - min)) * h;
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={points} fill="none" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {entries.map((e, i) => {
          const x = (i / (entries.length - 1)) * w;
          const y = h - ((e.value - min) / (max - min)) * h;
          return <circle key={i} cx={x} cy={y} r="3" fill="#eab308" />;
        })}
      </svg>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Benchmarks</h1>
        <p className="mt-1 text-sm text-white/40">Coach-only: Kilter climb goals & fitness tracking</p>
      </div>

      {/* Athlete selector */}
      <div className="mb-5">
        <label className="label">Select Athlete</label>
        <select className="input max-w-xs" value={selectedId ?? ""} onChange={(e) => setSelectedId(Number(e.target.value))}>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>{a.display_name || a.username}{a.comp_team ? ` — Team ${a.comp_team}` : ""}</option>
          ))}
        </select>
      </div>

      {selectedAthlete && (
        <>
          {/* Tabs */}
          <div className="mb-5 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 max-w-xs">
            {(["kilter", "fitness"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition capitalize ${tab === t ? "bg-brand-500/15 text-brand-400" : "text-white/40 hover:text-white/70"}`}>
                {t === "kilter" ? "Kilter Goals" : "Fitness"}
              </button>
            ))}
          </div>

          {/* Kilter benchmarks tab */}
          {tab === "kilter" && (
            <div className="space-y-4">
              {/* Add form */}
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-white">Add Kilter Benchmark</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="label">Climb Name / Set ID</label>
                    <input type="text" className="input" placeholder="e.g. The Pinch" value={kForm.climbName}
                      onChange={(e) => setKForm((f) => ({ ...f, climbName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Grade</label>
                    <input type="text" className="input" placeholder="V6" value={kForm.grade}
                      onChange={(e) => setKForm((f) => ({ ...f, grade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Angle (°)</label>
                    <input type="number" className="input" placeholder="40" value={kForm.angle}
                      onChange={(e) => setKForm((f) => ({ ...f, angle: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Notes</label>
                    <input type="text" className="input" placeholder="Focus on footwork, flag at the crux..." value={kForm.notes}
                      onChange={(e) => setKForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <button onClick={addKilter} disabled={kSaving || !kForm.climbName} className="btn-primary text-sm">
                  {kSaving ? "Saving..." : "Add Benchmark"}
                </button>
              </div>

              {/* List */}
              {kilter.length === 0 ? (
                <div className="card py-10 text-center">
                  <p className="text-white/30 text-sm">No Kilter benchmarks yet for {selectedAthlete.display_name || selectedAthlete.username}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {kilter.map((b) => (
                    <div key={b.id} className={`card flex items-start gap-3 ${b.is_completed ? "opacity-60" : ""}`}>
                      <button onClick={() => toggleKilter(b.id, b.is_completed)}
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${b.is_completed ? "border-green-500 bg-green-500/20" : "border-white/20 hover:border-brand-500"}`}>
                        {!!b.is_completed && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${b.is_completed ? "line-through text-white/40" : "text-white"}`}>{b.climb_name}</p>
                          {b.grade && <span className="text-xs font-bold text-brand-400">{b.grade}</span>}
                          {b.angle != null && <span className="text-xs text-white/30">{b.angle}°</span>}
                        </div>
                        {b.notes && <p className="text-xs text-white/40 mt-0.5">{b.notes}</p>}
                      </div>
                      <button onClick={() => deleteKilter(b.id)} className="shrink-0 text-white/20 hover:text-red-400 transition p-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fitness tab */}
          {tab === "fitness" && (
            <div className="space-y-4">
              {/* Add entry */}
              <div className="card space-y-3">
                <h2 className="text-sm font-semibold text-white">Log Fitness Entry</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Type</label>
                    <select className="input" value={fForm.type} onChange={(e) => setFForm((f) => ({ ...f, type: e.target.value }))}>
                      {FITNESS_TYPES.map((t) => <option key={t} value={t}>{FITNESS_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Value {fForm.type === "plank" ? "(seconds)" : "(reps)"}</label>
                    <input type="number" className="input" placeholder="0" value={fForm.value}
                      onChange={(e) => setFForm((f) => ({ ...f, value: e.target.value }))} />
                  </div>
                </div>
                <button onClick={addFitness} disabled={fSaving || !fForm.value} className="btn-primary text-sm">
                  {fSaving ? "Saving..." : "Log Entry"}
                </button>
              </div>

              {/* Charts + history by type */}
              {FITNESS_TYPES.map((type) => {
                const entries = fitness.filter((b) => b.type === type);
                if (entries.length === 0) return null;
                const latest = entries[0];
                return (
                  <div key={type} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">{FITNESS_LABELS[type]}</h3>
                      <span className="text-lg font-bold text-brand-400">{latest.value}{type === "plank" ? "s" : ""}</span>
                    </div>
                    <div className="mb-3">{fitnessChart(type)}</div>
                    <div className="space-y-1">
                      {entries.slice(0, 5).map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-xs">
                          <span className="text-white/40">{new Date(e.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <span className="text-white/70 font-medium">{e.value}{type === "plank" ? "s" : " reps"}</span>
                          <button onClick={() => deleteFitness(e.id)} className="text-white/20 hover:text-red-400 transition ml-3">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {fitness.length === 0 && (
                <div className="card py-10 text-center">
                  <p className="text-white/30 text-sm">No fitness data yet for {selectedAthlete.display_name || selectedAthlete.username}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
