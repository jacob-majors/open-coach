export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return String(seconds);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateStr);
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getRpeColor(rpe: number): string {
  if (rpe <= 3) return "text-green-400";
  if (rpe <= 6) return "text-yellow-400";
  if (rpe <= 8) return "text-orange-400";
  return "text-red-400";
}

export function getRpeLabel(rpe: number): string {
  if (rpe <= 2) return "Very Easy";
  if (rpe <= 4) return "Easy";
  if (rpe <= 6) return "Moderate";
  if (rpe <= 8) return "Hard";
  if (rpe === 9) return "Very Hard";
  return "Max Effort";
}

// Create an AudioContext beep
export function createBeep(
  frequency = 880,
  duration = 0.15,
  volume = 0.5
): () => void {
  return () => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio not supported
    }
  };
}

export const DIFFICULTY_RANGES = [
  { label: "All Levels", min: null, max: null },
  { label: "Beginner (VB–V3)", min: "VB", max: "V3" },
  { label: "Intermediate (V4–V6)", min: "V4", max: "V6" },
  { label: "Advanced (V7–V9)", min: "V7", max: "V9" },
  { label: "Expert (V10+)", min: "V10", max: null },
];

export const FOCUS_OPTIONS = [
  { value: "general", label: "General Training" },
  { value: "finger_strength", label: "Finger Strength" },
  { value: "power", label: "Power & Contact Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "conditioning", label: "Conditioning" },
];
