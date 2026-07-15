// Coach Er — v1 rule engine. Pure function: today's numbers in, structured
// advice out. Messages carry an i18n key + interpolation params rather than
// baked-in English text, so the Coach screen can render them in any language.
// The AI Coach chat (Edge Function) is the LLM-powered layer on top of this.

export type CoachMessage = {
  id: string;
  tone: "push" | "praise" | "warn" | "info";
  key: string;                  // coachRules.<key> in lib/i18n.tsx
  params?: Record<string, string | number>;
};

export function coachEr(input: {
  hour: number;                 // local hour 0–23
  kcal: number; kcalTarget: number;
  protein: number; proteinTarget: number;
  waterMl: number; waterTarget: number;
  streak: number;
  workedOutToday: boolean;
  workedOutYesterday: boolean;
  todaySplitDay: string;        // "Push", "Rest", ...
}): CoachMessage[] {
  const m: CoachMessage[] = [];
  const {
    hour, kcal, kcalTarget, protein, proteinTarget,
    waterMl, waterTarget, streak, workedOutToday, workedOutYesterday, todaySplitDay,
  } = input;

  // Protein pacing — behind schedule after mid-afternoon
  const proteinPace = proteinTarget * Math.min(1, hour / 20);
  if (hour >= 15 && protein < proteinPace * 0.7) {
    m.push({
      id: "protein-low", tone: "push", key: "proteinLow",
      params: { left: Math.round(proteinTarget - protein) },
    });
  }

  // Calories over target
  if (kcal > kcalTarget * 1.05) {
    m.push({
      id: "kcal-over", tone: "warn", key: "kcalOver",
      params: { over: Math.round(kcal - kcalTarget) },
    });
  }

  // Water pacing
  if (hour >= 12 && waterMl < waterTarget * Math.min(1, hour / 22) * 0.6) {
    m.push({
      id: "water-low", tone: "info", key: "waterLow",
      params: { have: (waterMl / 1000).toFixed(1), target: (waterTarget / 1000).toFixed(1) },
    });
  }

  // Missed yesterday's session → shift the split instead of guilt
  if (!workedOutYesterday && !workedOutToday && todaySplitDay !== "Rest") {
    m.push({ id: "shift-split", tone: "info", key: "shiftSplit", params: { day: todaySplitDay } });
  }

  // Today's session nudge (evening)
  if (!workedOutToday && todaySplitDay !== "Rest" && hour >= 17) {
    m.push({ id: "workout-nudge", tone: "push", key: "workoutNudge", params: { day: todaySplitDay } });
  }

  // Streak reinforcement
  if (streak >= 3) {
    const milestone = [7, 14, 30, 50, 100].includes(streak);
    m.push({
      id: "streak", tone: "praise",
      key: milestone ? "streakMilestone" : "streakDay",
      params: { n: streak },
    });
  }

  if (m.length === 0) {
    m.push({ id: "all-good", tone: "praise", key: "allGood" });
  }
  return m;
}
