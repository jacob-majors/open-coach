"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { BOULDER_GRADES } from "@/lib/protocols";

/* ─── Data ─────────────────────────────────────────────────────────── */

const POWER_EXERCISES = [
  { id: "limit_bouldering", label: "Limit Bouldering", desc: "Problems at/above max grade" },
  { id: "campus_board", label: "Campus Board", desc: "Dynamic contact strength" },
  { id: "system_board", label: "System Board", desc: "Symmetrical movement training" },
  { id: "deadhangs", label: "Dead Hangs", desc: "Max-weight finger loading" },
  { id: "weighted_pullups", label: "Weighted Pull-ups", desc: "Upper body pulling power" },
  { id: "one_arm_rows", label: "One-Arm Rows", desc: "Lat isolation" },
  { id: "lock_offs", label: "Lock-offs", desc: "Static upper body strength" },
];

const POWER_ENDURANCE_EXERCISES = [
  { id: "4x4", label: "4×4 Bouldering", desc: "4 problems × 4 rounds" },
  { id: "circuit_climbing", label: "Circuit Climbing", desc: "Continuous linked routes" },
  { id: "linked_problems", label: "Linked Problems", desc: "2–3 problems back to back" },
  { id: "hangboard_repeaters", label: "Hangboard Repeaters", desc: "7s on / 3s off × 6 reps" },
  { id: "density_training", label: "Density Hangboard", desc: "Max duration at low intensity" },
];

const ENDURANCE_EXERCISES = [
  { id: "arc_training", label: "ARC Training", desc: "Aerobic restoration climbing" },
  { id: "long_routes", label: "Long Routes", desc: "20+ move routes at 50–60%" },
  { id: "traversing", label: "Wall Traversing", desc: "Horizontal endurance movement" },
  { id: "board_laps", label: "Board Laps", desc: "Easy board sets for volume" },
];

const GAMES = [
  { id: "add_on", label: "Add-On", desc: "Sequentially add moves to a problem" },
  { id: "blind_sequence", label: "Blind Sequence", desc: "Call out moves without seeing" },
  { id: "10_in_10", label: "10 in 10 Challenge", desc: "10 problems in 10 minutes" },
  { id: "kingpin", label: "King/Queen Pin", desc: "Winner picks next problem" },
  { id: "horse", label: "HORSE", desc: "Copy or retry each other's problems" },
  { id: "contact_game", label: "Contact Game", desc: "Touch holds without matching" },
  { id: "downclimb", label: "Downclimb Game", desc: "Must downclimb every problem" },
  { id: "flash_challenge", label: "Flash Challenge", desc: "One attempt per problem" },
];

const FOCUS_SECTIONS = [
  {
    key: "power",
    label: "Power",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    exercises: POWER_EXERCISES,
  },
  {
    key: "power_endurance",
    label: "Power Endurance",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    exercises: POWER_ENDURANCE_EXERCISES,
  },
  {
    key: "endurance",
    label: "Endurance",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    exercises: ENDURANCE_EXERCISES,
  },
];

/* ─── Types ─────────────────────────────────────────────────────────── */

interface SessionBlock {
  id: string;
  focus: string;
  exercises: string[];
  games: string[];
  notes: string;
  duration: number;
  warmupMin: number;
  cooldownMin: number;
}

interface TeamPlan {
  teamName: string;
  coachName: string;
  gradeMin: string;
  gradeMax: string;
  sessionCount: number;
  weeksTotal: number;
  notes: string;
  sessions: SessionBlock[];
}

function newSession(focus = "power"): SessionBlock {
  return {
    id: Math.random().toString(36).slice(2),
    focus,
    exercises: [],
    games: [],
    notes: "",
    duration: 90,
    warmupMin: 20,
    cooldownMin: 10,
  };
}

/* ─── Component ─────────────────────────────────────────────────────── */

export default function TeamCoachPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<TeamPlan>({
    teamName: "",
    coachName: "",
    gradeMin: "V3",
    gradeMax: "V7",
    sessionCount: 2,
    weeksTotal: 4,
    notes: "",
    sessions: [newSession("power"), newSession("endurance")],
  });

  const [printMode, setPrintMode] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <p className="text-white/40 mb-4">Sign in to use the Team Coach plan builder</p>
        <button onClick={() => router.push("/auth/login")} className="btn-primary">
          Sign in with Google
        </button>
      </div>
    );
  }

  const updatePlan = (updates: Partial<TeamPlan>) =>
    setPlan((p) => ({ ...p, ...updates }));

  const updateSession = (id: string, updates: Partial<SessionBlock>) =>
    setPlan((p) => ({
      ...p,
      sessions: p.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));

  const toggleExercise = (sessionId: string, exerciseId: string) => {
    const session = plan.sessions.find((s) => s.id === sessionId)!;
    const has = session.exercises.includes(exerciseId);
    updateSession(sessionId, {
      exercises: has
        ? session.exercises.filter((e) => e !== exerciseId)
        : [...session.exercises, exerciseId],
    });
  };

  const toggleGame = (sessionId: string, gameId: string) => {
    const session = plan.sessions.find((s) => s.id === sessionId)!;
    const has = session.games.includes(gameId);
    updateSession(sessionId, {
      games: has
        ? session.games.filter((g) => g !== gameId)
        : [...session.games, gameId],
    });
  };

  const addSession = () =>
    setPlan((p) => ({ ...p, sessions: [...p.sessions, newSession("power")] }));

  const removeSession = (id: string) =>
    setPlan((p) => ({ ...p, sessions: p.sessions.filter((s) => s.id !== id) }));

  const generateText = () => {
    const allExercises = [...POWER_EXERCISES, ...POWER_ENDURANCE_EXERCISES, ...ENDURANCE_EXERCISES];
    const lines = [
      `TEAM TRAINING PLAN — ${plan.teamName || "My Team"}`,
      `Coach: ${plan.coachName || user?.username || "—"}`,
      `Grades: ${plan.gradeMin}–${plan.gradeMax} | ${plan.weeksTotal} weeks | ${plan.sessionCount} sessions/week`,
      plan.notes ? `\nNotes: ${plan.notes}` : "",
      "",
      ...plan.sessions.flatMap((s, i) => {
        const focusDef = FOCUS_SECTIONS.find((f) => f.key === s.focus);
        const exerciseNames = s.exercises.map(
          (eid) => allExercises.find((e) => e.id === eid)?.label || eid
        );
        const gameNames = s.games.map(
          (gid) => GAMES.find((g) => g.id === gid)?.label || gid
        );
        return [
          `--- SESSION ${i + 1}: ${focusDef?.label || s.focus} (${s.duration} min) ---`,
          `Warm-up: ${s.warmupMin} min | Cool-down: ${s.cooldownMin} min`,
          exerciseNames.length ? `Exercises: ${exerciseNames.join(", ")}` : "",
          gameNames.length ? `Games: ${gameNames.join(", ")}` : "",
          s.notes ? `Notes: ${s.notes}` : "",
          "",
        ].filter(Boolean);
      }),
    ].filter((l) => l !== undefined) as string[];

    return lines.join("\n");
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`mx-auto max-w-4xl px-4 py-6 md:py-8 ${printMode ? "print:p-0" : ""}`}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Coach</h1>
          <p className="mt-1 text-sm text-white/40">
            Build and share a structured practice plan for your climbing team
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copyToClipboard} className="btn-ghost text-sm">
            {copied ? "Copied!" : "Copy Text"}
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-sm">
            Print / PDF
          </button>
        </div>
      </div>

      {/* Team Info */}
      <div className="card mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Team Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Team Name</label>
            <input
              className="input"
              placeholder="e.g. Granite Peak Youth Team"
              value={plan.teamName}
              onChange={(e) => updatePlan({ teamName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Coach Name</label>
            <input
              className="input"
              placeholder={user?.username || "Your name"}
              value={plan.coachName}
              onChange={(e) => updatePlan({ coachName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Grade Range</label>
            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={plan.gradeMin}
                onChange={(e) => updatePlan({ gradeMin: e.target.value })}
              >
                {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <span className="text-white/30 text-sm">to</span>
              <select
                className="input flex-1"
                value={plan.gradeMax}
                onChange={(e) => updatePlan({ gradeMax: e.target.value })}
              >
                {BOULDER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duration (weeks)</label>
              <select
                className="input"
                value={plan.weeksTotal}
                onChange={(e) => updatePlan({ weeksTotal: parseInt(e.target.value) })}
              >
                {[2, 3, 4, 6, 8, 10, 12].map((w) => (
                  <option key={w} value={w}>{w} weeks</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sessions / Week</label>
              <select
                className="input"
                value={plan.sessionCount}
                onChange={(e) => updatePlan({ sessionCount: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="label">Coach Notes (optional)</label>
          <textarea
            className="input min-h-[70px] resize-none text-sm"
            placeholder="Goals for this training block, athlete notes, etc."
            value={plan.notes}
            onChange={(e) => updatePlan({ notes: e.target.value })}
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Practice Sessions</h2>
          <button onClick={addSession} className="btn-ghost text-xs py-1.5">
            + Add Session
          </button>
        </div>

        {plan.sessions.map((session, idx) => (
          <SessionCard
            key={session.id}
            session={session}
            index={idx}
            onUpdate={(u) => updateSession(session.id, u)}
            onRemove={() => removeSession(session.id)}
            onToggleExercise={(eid) => toggleExercise(session.id, eid)}
            onToggleGame={(gid) => toggleGame(session.id, gid)}
            canRemove={plan.sessions.length > 1}
          />
        ))}

        <button
          onClick={addSession}
          className="w-full rounded-xl border border-dashed border-white/10 py-3 text-sm text-white/30 hover:text-white/60 hover:border-white/20 transition"
        >
          + Add Practice Session
        </button>
      </div>

      {/* Preview */}
      <div className="mt-8 card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Text Preview</h2>
          <button onClick={copyToClipboard} className="text-xs text-brand-400 hover:text-brand-300 transition">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap font-mono">
          {generateText()}
        </pre>
      </div>
    </div>
  );
}

/* ─── Session Card ──────────────────────────────────────────────────── */

function SessionCard({
  session,
  index,
  onUpdate,
  onRemove,
  onToggleExercise,
  onToggleGame,
  canRemove,
}: {
  session: SessionBlock;
  index: number;
  onUpdate: (u: Partial<SessionBlock>) => void;
  onRemove: () => void;
  onToggleExercise: (id: string) => void;
  onToggleGame: (id: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const focusDef = FOCUS_SECTIONS.find((f) => f.key === session.focus);

  return (
    <div className="card border border-white/[0.06]">
      {/* Session header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-white/30 hover:text-white transition"
        >
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-white">Session {index + 1}</span>
          <select
            className="input text-sm py-1 h-auto flex-1 max-w-[180px]"
            value={session.focus}
            onChange={(e) => onUpdate({ focus: e.target.value })}
          >
            {FOCUS_SECTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          {focusDef && (
            <span className={`badge ${focusDef.bg} ${focusDef.color} ${focusDef.border} text-[10px]`}>
              {focusDef.label}
            </span>
          )}
        </div>

        {canRemove && (
          <button onClick={onRemove} className="text-white/20 hover:text-red-400 transition ml-auto">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-5 space-y-5">
          {/* Timing */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Total (min)</label>
              <input
                type="number"
                className="input"
                value={session.duration}
                onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 60 })}
              />
            </div>
            <div>
              <label className="label">Warm-up (min)</label>
              <input
                type="number"
                className="input"
                value={session.warmupMin}
                onChange={(e) => onUpdate({ warmupMin: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Cool-down (min)</label>
              <input
                type="number"
                className="input"
                value={session.cooldownMin}
                onChange={(e) => onUpdate({ cooldownMin: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Exercises for selected focus */}
          <div>
            <label className="label mb-2">Exercises — {focusDef?.label}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(focusDef?.exercises || []).map((ex) => {
                const selected = session.exercises.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => onToggleExercise(ex.id)}
                    className={`text-left rounded-lg px-3 py-2.5 border transition ${
                      selected
                        ? "border-brand-500/40 bg-brand-500/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white hover:border-white/10"
                    }`}
                  >
                    <div className="text-xs font-medium">{ex.label}</div>
                    <div className="text-[10px] mt-0.5 text-white/30">{ex.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Games */}
          <div>
            <label className="label mb-2">Games & Challenges (optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GAMES.map((game) => {
                const selected = session.games.includes(game.id);
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => onToggleGame(game.id)}
                    className={`text-left rounded-lg px-3 py-2.5 border transition ${
                      selected
                        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                        : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white hover:border-white/10"
                    }`}
                  >
                    <div className="text-xs font-medium">{game.label}</div>
                    <div className="text-[10px] mt-0.5 text-white/30">{game.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Session Notes (optional)</label>
            <textarea
              className="input min-h-[60px] resize-none text-sm"
              placeholder="Specific instructions, goals, or modifications for this session..."
              value={session.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
