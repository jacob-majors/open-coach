import type { WorkoutProtocol, ProtocolType } from "@/types";

export interface ProtocolDefinition {
  type: ProtocolType;
  name: string;
  category: "finger_strength" | "power" | "endurance" | "conditioning";
  description: string;
  purpose: string;
  instructions: string;
  formCues: string;
  defaultParams: Omit<WorkoutProtocol, "name" | "type">;
}

export const PROTOCOLS: Record<ProtocolType, ProtocolDefinition> = {
  max_hang: {
    type: "max_hang",
    name: "Max Hang",
    category: "finger_strength",
    description: "Maximum intensity dead-hang on a small edge with added weight or bodyweight.",
    purpose:
      "Builds maximum finger strength and recruitment by loading the flexor tendons at peak intensity. Targets fast-twitch muscle fibers and neural adaptations.",
    instructions:
      "Load a 20mm edge to a weight you can barely hold for 10 seconds. Use a half-crimp grip. Hang for the prescribed time, rest fully, then repeat. Add weight each session when you can complete all reps with good form.",
    formCues:
      "Half-crimp grip (90° at middle joint). Shoulders engaged, slight bend in elbows. No open-hand unless specified. Controlled descent off the hold.",
    defaultParams: {
      hangTime: 10,
      restTime: 180,
      reps: 6,
      sets: 3,
      restBetweenSets: 300,
      intensityPercent: 100,
    },
  },
  repeaters: {
    type: "repeaters",
    name: "Repeaters",
    category: "finger_strength",
    description: "Multiple short hangs with short rest, repeated in blocks. Classic 7/3 or 6/4 protocol.",
    purpose:
      "Builds finger strength endurance and capillarization. The short rest keeps muscles under sustained tension while allowing partial recovery.",
    instructions:
      "Hang for the prescribed time, rest briefly, repeat for the set number of reps. Use 60–70% of your max hang weight. Rest 3–5 minutes between sets.",
    formCues:
      "Same half-crimp position throughout. If form breaks, stop. Keep a consistent pace — no rushing the rest period.",
    defaultParams: {
      hangTime: 7,
      restTime: 3,
      reps: 6,
      sets: 4,
      restBetweenSets: 180,
      intensityPercent: 65,
    },
  },
  density_hang: {
    type: "density_hang",
    name: "Density Hang",
    category: "finger_strength",
    description: "Longer hangs (20–40s) at lower intensity to build structural finger strength.",
    purpose:
      "Targets collagen adaptation and tendon health. Lower intensity, longer time-under-tension builds the structural capacity of tendons and pulleys.",
    instructions:
      "Hang for 20–40 seconds at 50–60% of your max. Focus on perfect form throughout. Rest 2 minutes between sets. Good for warming up or recovery training.",
    formCues:
      "Open-hand or half-crimp. Stay relaxed in the upper body. Don't lock off — keep slight elbow bend only. Breathe steadily throughout the hang.",
    defaultParams: {
      hangTime: 30,
      restTime: 120,
      reps: 3,
      sets: 3,
      restBetweenSets: 120,
      intensityPercent: 55,
    },
  },
  limit_bouldering: {
    type: "limit_bouldering",
    name: "Limit Bouldering",
    category: "power",
    description: "Work problems at your absolute limit — problems you can barely do in 1–3 moves.",
    purpose:
      "Develops power and coordination at maximum intensity. Forces recruitment of maximum motor units and improves movement economy on hard terrain.",
    instructions:
      "Choose problems 1–2 grades above your flash grade. Work individual moves or short sequences. Try each problem 5–10 times. Rest fully between attempts (3–5 min). Quality over quantity.",
    formCues:
      "Commit to each attempt. Use your feet precisely. Don't just grab harder — climb smarter. Film yourself to review technique.",
    defaultParams: {
      hangTime: 0,
      restTime: 180,
      reps: 5,
      sets: 5,
      restBetweenSets: 300,
    },
  },
  campus_board: {
    type: "campus_board",
    name: "Campus Board",
    category: "power",
    description: "Laddering or matching on campus rungs without feet — develops explosive contact strength.",
    purpose:
      "Builds explosive contact strength, power, and upper body power endurance. One of the most effective power development tools for advanced climbers.",
    instructions:
      "Start with basic laddering (1-2-3-4 or 1-3-5). Rest 3–5 minutes between attempts. Never train campus when fatigued. Warm up thoroughly first. Not recommended for climbers under V5 level.",
    formCues:
      "Explosive lock-off from the bottom. Reach with control. Land softly on each rung. Stop if you feel any elbow or shoulder pain.",
    defaultParams: {
      hangTime: 0,
      restTime: 240,
      reps: 4,
      sets: 3,
      restBetweenSets: 300,
    },
  },
  arc_training: {
    type: "arc_training",
    name: "ARC Training",
    category: "endurance",
    description: "Aerobic Restoration and Capillarization — 20–45 min continuous easy climbing.",
    purpose:
      "Builds aerobic base, forearm capillarization, and active recovery ability. Allows you to train more frequently without accumulating fatigue.",
    instructions:
      "Climb continuously at an easy pace (5–6/10 effort) for 20–45 minutes. Never pump out. If you get pumped, downclimb or traverse easier terrain. Stay in the aerobic zone the entire time.",
    formCues:
      "Breathe steadily. Shake out frequently. Stay relaxed. Use your feet efficiently to take load off your hands.",
    defaultParams: {
      hangTime: 1800,
      restTime: 0,
      reps: 1,
      sets: 1,
      restBetweenSets: 0,
      intensityPercent: 40,
    },
  },
  core: {
    type: "core",
    name: "Core Training",
    category: "conditioning",
    description: "Targeted core exercises to improve body tension and climbing performance.",
    purpose:
      "Core strength is critical for maintaining body tension on steep terrain and transferring power from legs to arms efficiently.",
    instructions:
      "Perform exercises in circuit format or as prescribed. Focus on quality of movement. Include anti-rotation and anti-extension exercises for climbing-specific benefit.",
    formCues:
      "Brace core before each rep. Breathe throughout. Never compromise form for reps. L-sit, front lever progressions, and hanging exercises are most climbing-specific.",
    defaultParams: {
      hangTime: 30,
      restTime: 30,
      reps: 3,
      sets: 3,
      restBetweenSets: 90,
    },
  },
  antagonist: {
    type: "antagonist",
    name: "Antagonist Training",
    category: "conditioning",
    description: "Push-focused exercises (push-ups, dips, wrist extension) to balance climbing-specific pulling.",
    purpose:
      "Prevents imbalances that lead to injury. Climbers heavily develop pulling muscles — antagonist training keeps shoulder health and posture balanced.",
    instructions:
      "Perform after climbing sessions when possible. Focus on push-ups, dips, shoulder press, and wrist extensors. 2–3 sets of 10–15 reps at moderate intensity.",
    formCues:
      "Full range of motion. Controlled descent. Don't rush. Wrist extensions with a light dumbbell are often neglected but critical.",
    defaultParams: {
      hangTime: 0,
      restTime: 60,
      reps: 3,
      sets: 3,
      restBetweenSets: 60,
    },
  },
  mobility: {
    type: "mobility",
    name: "Mobility & Flexibility",
    category: "conditioning",
    description: "Targeted stretching and mobility work for climbing performance and injury prevention.",
    purpose:
      "Improves hip flexibility (for high-feet moves), shoulder mobility, and overall movement quality. Reduces injury risk and aids recovery.",
    instructions:
      "Hold stretches for 30–90 seconds. Focus on hip flexors, thoracic spine, shoulder, and wrist mobility. Best performed after training when muscles are warm.",
    formCues:
      "Never stretch into pain — only mild discomfort. Breathe into the stretch. Progressive range of motion over time.",
    defaultParams: {
      hangTime: 60,
      restTime: 15,
      reps: 3,
      sets: 2,
      restBetweenSets: 30,
    },
  },
  custom: {
    type: "custom",
    name: "Custom Exercise",
    category: "conditioning",
    description: "A custom exercise defined by the user.",
    purpose: "User-defined training purpose.",
    instructions: "Follow the prescribed parameters.",
    formCues: "Maintain good form throughout.",
    defaultParams: {
      hangTime: 10,
      restTime: 60,
      reps: 3,
      sets: 3,
      restBetweenSets: 120,
    },
  },
};

export const PROTOCOL_CATEGORIES = {
  finger_strength: {
    label: "Finger Strength",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  power: {
    label: "Power",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  endurance: {
    label: "Endurance",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  conditioning: {
    label: "Conditioning",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
};

export function calculateTrainingWeight(
  maxHangTotalLbs: number,
  bodyweightLbs: number,
  intensityPercent: number
): { addedWeight: number; totalWeight: number } {
  const targetTotal = maxHangTotalLbs * (intensityPercent / 100);
  const addedWeight = targetTotal - bodyweightLbs;
  return {
    addedWeight: Math.round(addedWeight * 10) / 10,
    totalWeight: Math.round(targetTotal * 10) / 10,
  };
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export const BOULDER_GRADES = [
  "VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6",
  "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16",
];

export const ROPE_GRADES = [
  "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d",
  "5.11a", "5.11b", "5.11c", "5.11d",
  "5.12a", "5.12b", "5.12c", "5.12d",
  "5.13a", "5.13b", "5.13c", "5.13d",
  "5.14a", "5.14b", "5.14c", "5.14d",
  "5.15a", "5.15b", "5.15c",
];
