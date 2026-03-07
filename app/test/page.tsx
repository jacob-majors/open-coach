"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { lbsToKg, formatDate, formatRelativeDate } from "@/lib/utils";
import { calculateTrainingWeight, PROTOCOLS } from "@/lib/protocols";
import type { Test } from "@/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function TestPage() {
  const { user, loading: authLoading } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    bodyweightLbs: "",
    addedWeightLbs: "",
    edgeMm: "20",
    hangTimeS: "10",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/auth/login";
      return;
    }
    if (!authLoading && user) {
      fetch("/api/tests")
        .then((r) => r.json())
        .then((d) => { setTests(d.tests || []); setLoading(false); });
    }
  }, [user, authLoading]);

  const totalWeight =
    parseFloat(form.bodyweightLbs || "0") + parseFloat(form.addedWeightLbs || "0");
  const percentBW =
    form.bodyweightLbs
      ? (totalWeight / parseFloat(form.bodyweightLbs)) * 100
      : 0;

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
          id: data.id as number,
          user_id: user!.userId,
          edge_mm: parseInt(form.edgeMm),
          bodyweight_lbs: parseFloat(form.bodyweightLbs),
          added_weight_lbs: parseFloat(form.addedWeightLbs || "0"),
          total_weight_lbs: totalWeight,
          percent_bodyweight: data.percentBodyweight,
          hang_time_s: parseInt(form.hangTimeS),
          notes: form.notes || null,
          tested_at: new Date().toISOString(),
        };
        setTests((prev) => [newTest, ...prev]);
        setForm({ bodyweightLbs: "", addedWeightLbs: "", edgeMm: "20", hangTimeS: "10", notes: "" });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const latestTest = tests[0];
  const chartData = [...tests].reverse().map((t) => ({
    date: new Date(t.tested_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    percent: Math.round(t.percent_bodyweight),
    total: Math.round(t.total_weight_lbs),
  }));

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Max Hang Test</h1>
        <p className="mt-1 text-sm text-white/40">
          20mm edge · 10s hang · Half-crimp · Track your finger strength over time
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form */}
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Record New Test</h2>

          {success && (
            <div className="mb-4 rounded-lg bg-brand-500/10 border border-brand-500/20 p-3 text-sm text-brand-400">
              Test recorded successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Bodyweight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  placeholder="e.g. 155"
                  value={form.bodyweightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, bodyweightLbs: e.target.value }))}
                  required
                />
                {form.bodyweightLbs && (
                  <p className="mt-1 text-xs text-white/30">
                    {lbsToKg(parseFloat(form.bodyweightLbs))} kg
                  </p>
                )}
              </div>
              <div>
                <label className="label">Added Weight (lbs)</label>
                <input
                  type="number"
                  step="0.5"
                  className="input"
                  placeholder="0 for bodyweight"
                  value={form.addedWeightLbs}
                  onChange={(e) => setForm((f) => ({ ...f, addedWeightLbs: e.target.value }))}
                />
                {form.addedWeightLbs && parseFloat(form.addedWeightLbs) < 0 && (
                  <p className="mt-1 text-xs text-white/30">
                    Use negative for assisted (bands)
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Edge Size (mm)</label>
                <select
                  className="input"
                  value={form.edgeMm}
                  onChange={(e) => setForm((f) => ({ ...f, edgeMm: e.target.value }))}
                >
                  <option value="20">20mm (standard)</option>
                  <option value="18">18mm</option>
                  <option value="16">16mm</option>
                  <option value="14">14mm</option>
                  <option value="12">12mm</option>
                </select>
              </div>
              <div>
                <label className="label">Hang Time (s)</label>
                <select
                  className="input"
                  value={form.hangTimeS}
                  onChange={(e) => setForm((f) => ({ ...f, hangTimeS: e.target.value }))}
                >
                  <option value="5">5s</option>
                  <option value="7">7s</option>
                  <option value="10">10s (standard)</option>
                  <option value="12">12s</option>
                </select>
              </div>
            </div>

            {/* Live totals */}
            {form.bodyweightLbs && (
              <div className="rounded-xl bg-brand-500/5 border border-brand-500/20 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Total</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {Math.round(totalWeight * 10) / 10}
                      <span className="text-sm font-normal text-white/40"> lbs</span>
                    </p>
                    <p className="text-xs text-white/30">{lbsToKg(totalWeight)} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">% BW</p>
                    <p className="text-xl font-bold text-brand-400 mt-1">
                      {Math.round(percentBW)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider">Added</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {parseFloat(form.addedWeightLbs || "0") >= 0 ? "+" : ""}
                      {Math.round(parseFloat(form.addedWeightLbs || "0") * 10) / 10}
                      <span className="text-sm font-normal text-white/40"> lbs</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="label">Notes (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="Grip type, conditions, etc."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={submitting || !form.bodyweightLbs} className="btn-primary w-full py-3">
              {submitting ? "Saving..." : "Record Test"}
            </button>
          </form>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Latest result */}
          {latestTest && (
            <div className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Latest Result
                  </p>
                  <p className="mt-2 text-4xl font-bold text-brand-400">
                    {Math.round(latestTest.percent_bodyweight)}%
                    <span className="text-lg font-normal text-white/40 ml-1">BW</span>
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {Math.round(latestTest.total_weight_lbs)} lbs total
                    {latestTest.added_weight_lbs > 0 && (
                      <span className="text-white/40"> (+{Math.round(latestTest.added_weight_lbs)} lbs added)</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-white/30">
                    {formatRelativeDate(latestTest.tested_at)} · {latestTest.edge_mm}mm · {latestTest.hang_time_s}s hang
                  </p>
                </div>
                {tests.length > 1 && (
                  <div className="text-right">
                    <p className="text-xs text-white/40">vs previous</p>
                    <p className={`text-sm font-bold mt-1 ${
                      tests[0].percent_bodyweight >= tests[1].percent_bodyweight
                        ? "text-brand-400"
                        : "text-red-400"
                    }`}>
                      {tests[0].percent_bodyweight >= tests[1].percent_bodyweight ? "+" : ""}
                      {Math.round(tests[0].percent_bodyweight - tests[1].percent_bodyweight)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training weight calculator */}
          {latestTest && (
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-3">Training Weight Calculator</h3>
              <p className="text-xs text-white/40 mb-3">
                Recommended weights based on your {Math.round(latestTest.percent_bodyweight)}% BW max hang
              </p>
              <div className="space-y-2">
                {[
                  { label: "Repeaters", pct: 65, protocol: "repeaters" },
                  { label: "Density Hangs", pct: 55, protocol: "density_hang" },
                  { label: "Max Hang ~85%", pct: 85, protocol: "max_hang" },
                ].map(({ label, pct, protocol }) => {
                  const { addedWeight, totalWeight } = calculateTrainingWeight(
                    latestTest.total_weight_lbs,
                    latestTest.bodyweight_lbs,
                    pct
                  );
                  return (
                    <div
                      key={protocol}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-white/40">{pct}% of max</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {addedWeight >= 0 ? "+" : ""}{addedWeight} lbs
                        </p>
                        <p className="text-xs text-white/40">{totalWeight} lbs total</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress chart */}
      {chartData.length > 1 && (
        <div className="mt-6 card">
          <h2 className="text-sm font-semibold text-white mb-4">Strength Progress</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                  formatter={(v) => [`${v}% BW`, "Max Hang"]}
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History table */}
      {tests.length > 0 && (
        <div className="mt-6 card">
          <h2 className="text-sm font-semibold text-white mb-4">Test History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Date", "Edge", "Added", "Total", "% BW", "Notes"].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.map((t, i) => (
                  <tr key={t.id} className="border-b border-white/[0.04]">
                    <td className="py-2.5 text-white/60">{formatDate(t.tested_at)}</td>
                    <td className="py-2.5 text-white/60">{t.edge_mm}mm</td>
                    <td className="py-2.5 text-white/60">
                      {t.added_weight_lbs >= 0 ? "+" : ""}{Math.round(t.added_weight_lbs)} lbs
                    </td>
                    <td className="py-2.5 text-white">{Math.round(t.total_weight_lbs)} lbs</td>
                    <td className="py-2.5">
                      <span className={`font-bold ${
                        i === 0 ? "text-brand-400" :
                        t.percent_bodyweight >= tests[i-1]?.percent_bodyweight ? "text-brand-400" : "text-red-400"
                      }`}>
                        {Math.round(t.percent_bodyweight)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-white/40 text-xs">{t.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
