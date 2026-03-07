import type { AssessmentInput, AssessmentResult, BenchmarkEntry } from "@/types";

export const GRADE_BENCHMARKS: BenchmarkEntry[] = [
  { grade: "VB-V2",  minPercent: 70,  maxPercent: 90,  label: "Beginner" },
  { grade: "V3-V4",  minPercent: 90,  maxPercent: 105, label: "Intermediate" },
  { grade: "V5-V6",  minPercent: 105, maxPercent: 120, label: "Intermediate-Advanced" },
  { grade: "V7-V8",  minPercent: 118, maxPercent: 135, label: "Advanced" },
  { grade: "V9-V10", minPercent: 130, maxPercent: 150, label: "Expert" },
  { grade: "V11+",   minPercent: 145, maxPercent: 175, label: "Elite" },
];

export const PULLUP_BENCHMARKS: Record<string, number> = {
  "VB-V2":  8,
  "V3-V4":  12,
  "V5-V6":  15,
  "V7-V8":  18,
  "V9-V10": 20,
  "V11+":   25,
};

function gradeToRange(grade: string): string {
  const g = grade.toUpperCase().replace("V", "");
  const num = parseInt(g, 10);
  if (isNaN(num) || num <= 2) return "VB-V2";
  if (num <= 4) return "V3-V4";
  if (num <= 6) return "V5-V6";
  if (num <= 8) return "V7-V8";
  if (num <= 10) return "V9-V10";
  return "V11+";
}

function getExpectedHangPercent(grade: string): { min: number; max: number; mid: number } {
  const range = gradeToRange(grade);
  const benchmark = GRADE_BENCHMARKS.find((b) => b.grade === range);
  if (!benchmark) return { min: 100, max: 130, mid: 115 };
  return {
    min: benchmark.minPercent,
    max: benchmark.maxPercent,
    mid: (benchmark.minPercent + benchmark.maxPercent) / 2,
  };
}

function getExpectedPullups(grade: string): number {
  const range = gradeToRange(grade);
  return PULLUP_BENCHMARKS[range] || 12;
}

export function runAssessment(input: AssessmentInput): AssessmentResult {
  const { maxHangPercent, maxPullups, climbingGrade, lSitHoldS, campusReachCm } = input;
  const expectedHang = getExpectedHangPercent(climbingGrade);
  const expectedPullups = getExpectedPullups(climbingGrade);

  const fingerStrengthRatio = maxHangPercent / expectedHang.mid;
  const pullStrengthRatio = maxPullups / expectedPullups;
  const coreRatio = lSitHoldS ? lSitHoldS / 15 : null; // 15s L-sit is baseline
  const powerRatio = campusReachCm ? campusReachCm / 40 : null; // 40cm reach baseline

  const scores: Record<string, number> = {
    finger_strength: fingerStrengthRatio,
    pull_strength: pullStrengthRatio,
  };
  if (coreRatio) scores.core = coreRatio;
  if (powerRatio) scores.power = powerRatio;

  // Find strengths (score > 1.1) and weaknesses (score < 0.9)
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const labels: Record<string, string> = {
    finger_strength: "Finger strength",
    pull_strength: "Pulling strength",
    core: "Core strength",
    power: "Contact power",
  };

  for (const [key, score] of Object.entries(scores)) {
    if (score >= 1.1) {
      strengths.push(labels[key] || key);
    } else if (score < 0.9) {
      weaknesses.push(labels[key] || key);
    }
  }

  // Find the most limiting factor
  const sortedScores = Object.entries(scores).sort((a, b) => a[1] - b[1]);
  const worstFactor = sortedScores[0][0];

  const limitingFactorMap: Record<string, string> = {
    finger_strength: "Finger Strength",
    pull_strength: "Pulling Strength",
    core: "Core & Body Tension",
    power: "Contact Power",
  };

  const limitingFactor = limitingFactorMap[worstFactor] || "General Fitness";

  // Generate recommendations
  const recommendations: string[] = [];
  const focusAreas: string[] = [];

  if (fingerStrengthRatio < 0.85) {
    recommendations.push(
      "Your finger strength is below expected for your grade — this is likely your primary limiter.",
      "Focus on max hangs (3x/week) and add weight systematically each week.",
      "Consider a 4–8 week dedicated finger strength block before returning to climbing-focused training."
    );
    focusAreas.push("Max Hangs", "Repeaters");
  } else if (fingerStrengthRatio < 0.95) {
    recommendations.push(
      "Finger strength is slightly below grade benchmarks. Consistent hangboard work 2x/week will close the gap.",
      "Mix max hangs and repeaters to build both peak strength and endurance."
    );
    focusAreas.push("Repeaters", "Max Hangs");
  }

  if (pullStrengthRatio < 0.85) {
    recommendations.push(
      "Your pulling strength is low relative to your grade. Weighted pull-ups and lock-off work will help.",
      "Add 2 sets of weighted pull-ups or lock-off holds after each climbing session."
    );
    focusAreas.push("Weighted Pull-ups", "Lock-offs");
  }

  if (coreRatio !== null && coreRatio < 0.7) {
    recommendations.push(
      "Core strength needs attention — poor body tension limits performance on steep and overhanging terrain.",
      "Include L-sit progressions, front lever work, and hanging leg raises 3x/week."
    );
    focusAreas.push("Core Training", "Body Tension");
  }

  if (powerRatio !== null && powerRatio < 0.7) {
    recommendations.push(
      "Contact power and explosive strength are below average. Limit bouldering and campus board work will help.",
      "Work on powerful, dynamic moves on the bouldering wall focusing on problems 1–2 grades above your limit."
    );
    focusAreas.push("Limit Bouldering", "Campus Board");
  }

  if (fingerStrengthRatio >= 1.1 && pullStrengthRatio >= 1.0) {
    recommendations.push(
      "Your physical benchmarks are strong for your grade. Your limiter is likely technique, tactics, or mental game.",
      "Focus on volume at sub-max grades to automate movement patterns.",
      "Consider working with a coach on movement quality and footwork precision."
    );
    focusAreas.push("Technical Climbing", "Volume");
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Your metrics are close to the expected benchmark for your grade — good balanced development.",
      "Continue your current training with progressive overload and track your numbers monthly."
    );
    focusAreas.push("Balanced Training", "Technique");
  }

  // Estimate potential grade
  const avgRatio = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  const gradeRange = gradeToRange(climbingGrade);
  const gradeNum = parseInt(climbingGrade.replace(/[^0-9]/g, ""), 10) || 0;
  let potentialGrade = climbingGrade;
  if (avgRatio >= 1.2) {
    potentialGrade = `V${gradeNum + 2}–V${gradeNum + 3}`;
  } else if (avgRatio >= 1.05) {
    potentialGrade = `V${gradeNum + 1}–V${gradeNum + 2}`;
  } else if (avgRatio >= 0.95) {
    potentialGrade = `V${gradeNum}–V${gradeNum + 1}`;
  } else {
    potentialGrade = climbingGrade;
  }

  return {
    limitingFactor,
    strengths,
    weaknesses,
    recommendations,
    focusAreas,
    estimatedPotential: potentialGrade,
  };
}

export function generatePlanFromAssessment(result: AssessmentResult): {
  title: string;
  description: string;
  focus: string;
  workouts: Array<{
    name: string;
    protocolType: string;
    weekNumber: number;
    dayOfWeek: number;
    hangTime: number;
    restTime: number;
    reps: number;
    sets: number;
    restBetweenSets: number;
    intensityPercent: number;
    instructions: string;
  }>;
} {
  const focus = result.focusAreas[0]?.toLowerCase().includes("max hang") ||
    result.focusAreas[0]?.toLowerCase().includes("finger")
    ? "finger_strength"
    : result.focusAreas[0]?.toLowerCase().includes("pull")
    ? "power"
    : result.focusAreas[0]?.toLowerCase().includes("core")
    ? "conditioning"
    : "general";

  const workouts = [];

  if (focus === "finger_strength") {
    // 4-week max hang progression
    for (let week = 1; week <= 4; week++) {
      workouts.push({
        name: `Week ${week} Max Hangs`,
        protocolType: "max_hang",
        weekNumber: week,
        dayOfWeek: 1,
        hangTime: 10,
        restTime: 180,
        reps: 6,
        sets: 3,
        restBetweenSets: 300,
        intensityPercent: 85 + week * 2.5,
        instructions: `Week ${week}: Focus on adding weight if previous week felt manageable. Use 20mm edge, half-crimp grip.`,
      });
      workouts.push({
        name: `Week ${week} Repeaters`,
        protocolType: "repeaters",
        weekNumber: week,
        dayOfWeek: 3,
        hangTime: 7,
        restTime: 3,
        reps: 6,
        sets: 4,
        restBetweenSets: 180,
        intensityPercent: 60 + week * 1.5,
        instructions: `Week ${week}: 7-on-3-off repeaters. 65% of max hang weight. Log RPE.`,
      });
    }
  } else {
    // Generic 4-week plan
    for (let week = 1; week <= 4; week++) {
      workouts.push({
        name: `Week ${week} Fingerboard`,
        protocolType: "repeaters",
        weekNumber: week,
        dayOfWeek: 1,
        hangTime: 7,
        restTime: 3,
        reps: 6,
        sets: 3,
        restBetweenSets: 180,
        intensityPercent: 60 + week * 2,
        instructions: `Week ${week} repeaters — increase weight by 2.5lbs if all sets felt strong.`,
      });
    }
  }

  return {
    title: `AI-Generated ${result.limitingFactor} Focus — 4 Weeks`,
    description: `Personalized 4-week plan targeting ${result.limitingFactor.toLowerCase()} based on your assessment results. Generated by Open Coach's assessment engine.`,
    focus,
    workouts,
  };
}
