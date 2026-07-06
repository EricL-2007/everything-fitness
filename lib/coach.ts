// Coach Er — v1 rule engine. Pure function: today's numbers in, advice out.
// v2 swaps the message generation for a Claude Haiku call behind an Edge
// Function, but these same signals become that model's context.

export type CoachMessage = {
  id: string;
  tone: "push" | "praise" | "warn" | "info";
  text: string;
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
    const left = Math.round(proteinTarget - protein);
    m.push({
      id: "protein-low", tone: "push",
      text: `You're behind on protein — ${left} g to go. A chicken breast (~40 g) or Greek yogurt + shake closes most of that gap.`,
    });
  }

  // Calories over target
  if (kcal > kcalTarget * 1.05) {
    m.push({
      id: "kcal-over", tone: "warn",
      text: `You're ${Math.round(kcal - kcalTarget)} kcal over target. One day won't break anything — keep dinner light and get back on plan tomorrow.`,
    });
  }

  // Water pacing
  if (hour >= 12 && waterMl < waterTarget * Math.min(1, hour / 22) * 0.6) {
    m.push({
      id: "water-low", tone: "info",
      text: `Hydration check: ${(waterMl / 1000).toFixed(1)} L of ${(waterTarget / 1000).toFixed(1)} L. Grab a glass now.`,
    });
  }

  // Missed yesterday's session → shift the split instead of guilt
  if (!workedOutYesterday && !workedOutToday && todaySplitDay !== "Rest") {
    m.push({
      id: "shift-split", tone: "info",
      text: `Missed yesterday? No problem — your split shifts forward, so today is still ${todaySplitDay} day. Nothing is skipped, just delayed.`,
    });
  }

  // Today's session nudge (evening)
  if (!workedOutToday && todaySplitDay !== "Rest" && hour >= 17) {
    m.push({
      id: "workout-nudge", tone: "push",
      text: `${todaySplitDay} day isn't logged yet. Even an abbreviated session keeps the streak — 3 exercises beats 0.`,
    });
  }

  // Streak reinforcement
  if (streak >= 3) {
    const milestone = [7, 14, 30, 50, 100].includes(streak);
    m.push({
      id: "streak", tone: "praise",
      text: milestone
        ? `${streak}-day streak — that's a real milestone. Consistency is the whole game.`
        : `Day ${streak} of your streak. Keep the chain alive.`,
    });
  }

  if (m.length === 0) {
    m.push({
      id: "all-good", tone: "praise",
      text: "Everything's on track today. Log your meals as they happen and I'll flag anything that drifts.",
    });
  }
  return m;
}
