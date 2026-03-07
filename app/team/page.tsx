"use client";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────────────── */

type DayType = "power" | "endurance" | "power_endurance";

interface WarmupOption {
  id: string;
  label: string;
  duration: number;
  desc: string;
}

interface Activity {
  id: string;
  label: string;
  duration: number;
  desc: string;
  category: string;
}

interface PracticeBlock {
  id: string;
  activityId: string;
  duration: number;
  notes: string;
}

/* ─── Data ───────────────────────────────────────────────────────── */

const DAY_TYPES: { key: DayType; label: string; color: string; bg: string; border: string; desc: string }[] = [
  {
    key: "power",
    label: "Power Day",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    desc: "Max effort, high intensity, long rest",
  },
  {
    key: "power_endurance",
    label: "Power Endurance",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    desc: "Sustained hard climbing, shorter rests",
  },
  {
    key: "endurance",
    label: "Endurance Day",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    desc: "High volume, aerobic base, easy intensity",
  },
];

const WARMUP_OPTIONS: WarmupOption[] = [
  { id: "open", label: "Open Warm-up", duration: 10, desc: "Athletes warm up independently on easy terrain" },
  { id: "traversing", label: "Traversing", duration: 15, desc: "Low wall traversing at conversational pace" },
  { id: "easy_circuits", label: "Easy Circuits", duration: 20, desc: "Coach-set easy circuit, focus on movement" },
  { id: "dynamic_stretching", label: "Dynamic Stretching", duration: 10, desc: "Leg swings, arm circles, hip openers" },
  { id: "games_warmup", label: "Tag / Warm-up Games", duration: 15, desc: "Fun movement games to get blood flowing" },
  { id: "yoga_flow", label: "Yoga Flow", duration: 20, desc: "Structured mobility and breathing sequence" },
];

const ACTIVITIES_BY_TYPE: Record<DayType, Activity[]> = {
  power: [
    { id: "limit_bouldering", label: "Limit Bouldering", duration: 30, desc: "Projects at or above max grade, full rest between attempts", category: "Climbing" },
    { id: "campus_ladders", label: "Campus Board — Ladders", duration: 20, desc: "1-4-7, 1-5-8, 1-3-5-7. Full rest between burns", category: "Climbing" },
    { id: "system_board", label: "System Board Sets", duration: 25, desc: "Symmetrical movements, coach-assigned sequences", category: "Climbing" },
    { id: "deadhangs", label: "Dead Hangs", duration: 15, desc: "Max-weight 10s hangs on 20mm edge, 3–5 sets", category: "Hangboard" },
    { id: "weighted_pullups", label: "Weighted Pull-ups", duration: 15, desc: "3–5 sets of 3–5 reps with added weight", category: "Strength" },
    { id: "lock_offs", label: "Lock-offs", duration: 10, desc: "Static holds at 90°, 120°, and full lock. 3 sets", category: "Strength" },
    { id: "one_arm_rows", label: "One-Arm Rows", duration: 10, desc: "Lat isolation with TRX or rings. 3×8 each side", category: "Strength" },
    { id: "flash_challenge", label: "Flash Challenge", duration: 20, desc: "One attempt each on coach-set problems", category: "Game" },
    { id: "kingpin", label: "King/Queen Pin", duration: 20, desc: "Winner picks next problem for the group", category: "Game" },
  ],
  power_endurance: [
    { id: "4x4", label: "4×4 Bouldering", duration: 25, desc: "4 problems × 4 rounds, minimal rest between problems, 4 min between rounds", category: "Climbing" },
    { id: "linked_problems", label: "Linked Problems", duration: 20, desc: "2–3 problems linked back to back, 3–4 rounds", category: "Climbing" },
    { id: "circuit_climbing", label: "Circuits", duration: 30, desc: "Coach-set circuit of 8–12 moves, climb continuously for sets", category: "Climbing" },
    { id: "repeaters", label: "Hangboard Repeaters", duration: 20, desc: "7s on / 3s off × 6 reps, 3 sets. 60% intensity", category: "Hangboard" },
    { id: "density_hangs", label: "Density Hangs", duration: 15, desc: "Max duration hangs at 50–55% BW. 3–4 sets", category: "Hangboard" },
    { id: "horse", label: "HORSE", duration: 20, desc: "Copy each other's problems, eliminate on fail", category: "Game" },
    { id: "10_in_10", label: "10 in 10 Challenge", duration: 15, desc: "Complete 10 assigned problems in 10 minutes", category: "Game" },
    { id: "add_on", label: "Add-On", duration: 20, desc: "Sequentially add moves, group builds problem together", category: "Game" },
  ],
  endurance: [
    { id: "arc_training", label: "ARC Training", duration: 40, desc: "Continuous climbing at 40–60% for 20–40 min. Never pump out", category: "Climbing" },
    { id: "long_routes", label: "Long Routes / Laps", duration: 30, desc: "20+ move routes at easy intensity, lap them 3–5 times", category: "Climbing" },
    { id: "wall_traversing", label: "Wall Traversing", duration: 25, desc: "Horizontal traversing at conversational pace, 15–20 min sets", category: "Climbing" },
    { id: "board_laps", label: "Board Laps", duration: 20, desc: "Easy system board or spray wall, continuous laps", category: "Climbing" },
    { id: "contact_game", label: "Contact Game", duration: 20, desc: "Touch holds without matching — stay on wall as long as possible", category: "Game" },
    { id: "downclimb", label: "Downclimb Game", duration: 20, desc: "Must downclimb every problem — penalties for jumping off", category: "Game" },
    { id: "blind_sequence", label: "Blind Sequence", duration: 15, desc: "Coach calls out holds, climbers execute without previewing", category: "Game" },
    { id: "circuit_race", label: "Circuit Race", duration: 15, desc: "Teams race to complete the most laps of a set circuit", category: "Game" },
  ],
};

const COOLDOWN_OPTIONS = [
  { id: "none", label: "No Cool-down", duration: 0 },
  { id: "easy_movement", label: "Easy Movement (5 min)", duration: 5 },
  { id: "static_stretch", label: "Static Stretching (10 min)", duration: 10 },
  { id: "antagonist", label: "Antagonist + Stretch (15 min)", duration: 15 },
];

/* ─── Component ─────────────────────────────────────────────────── */

export default function CoachAidPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dayType, setDayType] = useState<DayType>("power");
  const [warmupId, setWarmupId] = useState("open");
  const [blocks, setBlocks] = useState<PracticeBlock[]>([]);
  const [cooldown, setCooldown] = useState("static_stretch");
  const [sessionName, setSessionName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [copied, setCopied] = useState(false);

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-white/40 mb-4">Sign in to use Coach Aid</p>
        <button onClick={() => router.push("/auth/login")} className="btn-primary">
          Sign in with Google
        </button>
      </div>
    );
  }

  const dayDef = DAY_TYPES.find((d) => d.key === dayType)!;
  const activities = ACTIVITIES_BY_TYPE[dayType];
  const warmup = WARMUP_OPTIONS.find((w) => w.id === warmupId)!;
  const cooldownOpt = COOLDOWN_OPTIONS.find((c) => c.id === cooldown)!;
  const selectedIds = new Set(blocks.map((b) => b.activityId));

  const addBlock = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId)!;
    setBlocks((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), activityId, duration: activity.duration, notes: "" },
    ]);
  };

  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const updateBlock = (id: string, updates: Partial<PracticeBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));

  const totalMinutes =
    warmup.duration +
    blocks.reduce((sum, b) => sum + b.duration, 0) +
    cooldownOpt.duration;

  const generateText = () => {
    const lines: string[] = [
      `PRACTICE PLAN${sessionName ? ` — ${sessionName}` : ""}`,
      teamName ? `Team: ${teamName}` : "",
      `Type: ${dayDef.label}`,
      `Total Time: ~${totalMinutes} min`,
      "",
      `WARM-UP (${warmup.duration} min)`,
      `  ${warmup.label}: ${warmup.desc}`,
      "",
      "MAIN ACTIVITIES",
      ...blocks.map((b, i) => {
        const act = activities.find((a) => a.id === b.activityId)!;
        return `  ${i + 1}. ${act.label} (${b.duration} min)${b.notes ? `\n     Notes: ${b.notes}` : ""}`;
      }),
      "",
      cooldownOpt.duration > 0 ? `COOL-DOWN (${cooldownOpt.duration} min)\n  ${cooldownOpt.label}` : "",
      coachNotes ? `\nCOACH NOTES\n  ${coachNotes}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Coach Aid</h1>
          <p className="mt-1 text-sm text-white/40">Build a practice plan for your session</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copyText} className="btn-ghost text-sm">
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-sm">
            Print
          </button>
        </div>
      </div>

      {/* Session info */}
      <div className="card mb-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Session Name</label>
            <input
              className="input"
              placeholder="e.g. Tuesday Practice"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Team / Group</label>
            <input
              className="input"
              placeholder="e.g. Youth A Team"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Day Type */}
      <div className="mb-5">
        <p className="label mb-3">Session Type</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DAY_TYPES.map((dt) => (
            <button
              key={dt.key}
              onClick={() => { setDayType(dt.key); setBlocks([]); }}
              className={`rounded-xl border p-4 text-left transition ${
                dayType === dt.key
                  ? `${dt.bg} ${dt.border}`
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <p className={`text-sm font-semibold ${dayType === dt.key ? dt.color : "text-white"}`}>
                {dt.label}
              </p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">{dt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Warm-up */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Warm-up</h2>
          <span className="text-xs text-white/30">{warmup.duration} min</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WARMUP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setWarmupId(opt.id)}
              className={`text-left rounded-lg px-3 py-2.5 border transition ${
                warmupId === opt.id
                  ? "border-brand-500/40 bg-brand-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${warmupId === opt.id ? "text-brand-400" : "text-white"}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-white/30">{opt.duration} min</span>
              </div>
              <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Activities</h2>
          <span className="text-xs text-white/30">
            {blocks.length > 0 && `${blocks.length} selected · ${blocks.reduce((s, b) => s + b.duration, 0)} min`}
          </span>
        </div>

        {/* Activity picker */}
        <div className="card mb-3">
          <p className="text-xs text-white/40 mb-3">Tap to add to your plan</p>
          {["Climbing", "Hangboard", "Strength", "Game"].map((cat) => {
            const catActivities = activities.filter((a) => a.category === cat);
            if (!catActivities.length) return null;
            return (
              <div key={cat} className="mb-4 last:mb-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catActivities.map((act) => {
                    const added = selectedIds.has(act.id);
                    return (
                      <button
                        key={act.id}
                        onClick={() => !added && addBlock(act.id)}
                        disabled={added}
                        className={`text-left rounded-lg px-3 py-2.5 border transition ${
                          added
                            ? "border-brand-500/20 bg-brand-500/5 opacity-40 cursor-default"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white">{act.label}</span>
                          <span className="text-[10px] text-white/30">{act.duration} min</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">{act.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected blocks */}
        {blocks.length > 0 && (
          <div className="space-y-2">
            {blocks.map((block, idx) => {
              const act = activities.find((a) => a.id === block.activityId)!;
              return (
                <div key={block.id} className="card border border-white/[0.08]">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-white/20 mt-0.5 w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-white">{act.label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            value={block.duration}
                            onChange={(e) => updateBlock(block.id, { duration: parseInt(e.target.value) || 0 })}
                            className="w-16 text-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-brand-500/50"
                          />
                          <span className="text-xs text-white/30">min</span>
                          <button onClick={() => removeBlock(block.id)} className="text-white/20 hover:text-red-400 transition">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Coach notes for this activity..."
                        value={block.notes}
                        onChange={(e) => updateBlock(block.id, { notes: e.target.value })}
                        className="w-full rounded-lg border border-white/[0.06] bg-transparent px-2.5 py-1.5 text-xs text-white/70 placeholder-white/20 outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {blocks.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
            <p className="text-sm text-white/30">Select activities above to build your plan</p>
          </div>
        )}
      </div>

      {/* Cool-down */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Cool-down</h2>
          <span className="text-xs text-white/30">{cooldownOpt.duration > 0 ? `${cooldownOpt.duration} min` : ""}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COOLDOWN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setCooldown(opt.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                cooldown === opt.id
                  ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                  : "border-white/[0.06] text-white/50 hover:text-white hover:border-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div className="card mb-6">
        <label className="label">Coach Notes</label>
        <textarea
          className="input min-h-[70px] resize-none text-sm"
          placeholder="Goals for today, athlete reminders, focus points..."
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
        />
      </div>

      {/* Summary */}
      <div className="card border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Practice Summary</h2>
          <span className={`text-xs font-semibold ${dayDef.color}`}>{dayDef.label}</span>
        </div>
        <div className="space-y-2 text-sm">
          <Row label={`Warm-up`} value={`${warmup.label} · ${warmup.duration} min`} />
          {blocks.map((b, i) => {
            const act = activities.find((a) => a.id === b.activityId)!;
            return <Row key={b.id} label={`${i + 1}. ${act.label}`} value={`${b.duration} min`} />;
          })}
          {cooldownOpt.duration > 0 && (
            <Row label="Cool-down" value={`${cooldownOpt.label.replace(/ \(\d+ min\)/, "")} · ${cooldownOpt.duration} min`} />
          )}
          <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs font-semibold text-white/60">Total</span>
            <span className="text-sm font-bold text-white">~{totalMinutes} min</span>
          </div>
        </div>
        <button onClick={copyText} className="mt-4 w-full btn-secondary text-sm">
          {copied ? "Copied!" : "Copy Practice Plan as Text"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/60 truncate">{label}</span>
      <span className="text-white/40 shrink-0 text-xs">{value}</span>
    </div>
  );
}
