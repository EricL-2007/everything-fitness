// Nutrition + training math for Everything Fitness.
// General-guideline formulas, not medical advice — surfaced to users in the disclaimer.

export type Goal = "fat_loss" | "maintain" | "muscle_gain" | "recomp";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type SplitId = "PPL" | "UL" | "FB" | "BRO" | "ARN" | "PPLUL" | "PHUL" | "PHAT";

const ACTIVITY_MULT: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

const GOAL_ADJUST: Record<Goal, number> = {
  fat_loss: -450, maintain: 0, muscle_gain: +300, recomp: -100,
};

/** Mifflin-St Jeor BMR → TDEE → goal-adjusted calorie + macro targets. */
export function computeTargets(p: {
  sex: "male" | "female"; birthYear: number; heightCm: number;
  weightKg: number; activity: Activity; goal: Goal;
}) {
  const age = new Date().getFullYear() - p.birthYear;
  const bmr =
    10 * p.weightKg + 6.25 * p.heightCm - 5 * age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * ACTIVITY_MULT[p.activity];
  const calories = Math.max(1200, Math.round(tdee + GOAL_ADJUST[p.goal]));

  // Protein anchored to bodyweight (0.8–1 g/lb depending on goal), fat ~25% kcal, carbs fill.
  const proteinPerLb = p.goal === "fat_loss" ? 1.0 : p.goal === "muscle_gain" ? 0.9 : 0.85;
  const protein = Math.round(kgToLb(p.weightKg) * proteinPerLb);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const waterMl = Math.round(p.weightKg * 35 + 500); // ~35 ml/kg + training buffer

  return { calories, protein, carbs, fat, waterMl };
}

// ---------- units ----------
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const cmToFtIn = (cm: number) => {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inch: Math.round(totalIn % 12) };
};
export const ftInToCm = (ft: number, inch: number) => (ft * 12 + inch) * 2.54;

export function fmtWeight(kg: number, units: "imperial" | "metric") {
  return units === "imperial" ? `${kgToLb(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
}

// ---------- workout splits ----------
export const SPLITS: Record<SplitId, { label: string; days: string[] }> = {
  PPL:   { label: "Push / Pull / Legs", days: ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Rest"] },
  UL:    { label: "Upper / Lower",      days: ["Upper", "Lower", "Rest", "Upper", "Lower", "Rest", "Rest"] },
  FB:    { label: "Full Body 3×",       days: ["Full Body", "Rest", "Full Body", "Rest", "Full Body", "Rest", "Rest"] },
  BRO:   { label: "Bro Split",          days: ["Chest", "Back", "Shoulders", "Legs", "Arms", "Rest", "Rest"] },
  ARN:   { label: "Arnold Split",       days: ["Chest & Back", "Shoulders & Arms", "Legs", "Chest & Back", "Shoulders & Arms", "Legs", "Rest"] },
  PPLUL: { label: "PPL × Upper/Lower",  days: ["Push", "Pull", "Legs", "Upper", "Lower", "Rest", "Rest"] },
  PHUL:  { label: "PHUL",               days: ["Upper Power", "Lower Power", "Rest", "Upper Hyper", "Lower Hyper", "Rest", "Rest"] },
  PHAT:  { label: "PHAT",               days: ["Upper Power", "Lower Power", "Rest", "Back & Shoulders", "Chest & Arms", "Legs", "Rest"] },
};

/** Which muscle groups a split day targets — drives the suggested exercise list. */
export const DAY_MUSCLES: Record<string, string[]> = {
  Push: ["chest", "shoulders", "triceps"],
  Pull: ["back", "biceps"],
  Legs: ["legs", "glutes", "core"],
  Upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  Lower: ["legs", "glutes", "core"],
  "Full Body": ["chest", "back", "legs", "shoulders", "core"],
  Chest: ["chest"], Back: ["back"], Shoulders: ["shoulders"],
  Arms: ["biceps", "triceps"], Core: ["core"], Rest: [],
  "Chest & Back": ["chest", "back"],
  "Shoulders & Arms": ["shoulders", "biceps", "triceps"],
  "Chest & Arms": ["chest", "biceps", "triceps"],
  "Back & Shoulders": ["back", "shoulders"],
  "Upper Power": ["chest", "back", "shoulders", "biceps", "triceps"],
  "Lower Power": ["legs", "glutes", "core"],
  "Upper Hyper": ["chest", "back", "shoulders", "biceps", "triceps"],
  "Lower Hyper": ["legs", "glutes", "core"],
};

/** The day names a user can pick from when building a custom plan. */
export const CUSTOM_DAY_OPTIONS = [
  "Push", "Pull", "Legs", "Upper", "Lower", "Full Body",
  "Chest", "Back", "Shoulders", "Arms", "Core",
  "Chest & Back", "Shoulders & Arms", "Rest",
];

/** Resolve the active week for a profile — a custom plan overrides the built-in split. */
export function splitDaysOf(profile: any): string[] {
  if (profile?.split_days?.length) return profile.split_days as string[];
  const s = SPLITS[profile?.split as SplitId];
  return s ? s.days : SPLITS.PPL.days;
}
export function splitLabelOf(profile: any): string {
  if (profile?.split_label) return profile.split_label as string;
  const s = SPLITS[profile?.split as SplitId];
  return s ? s.label : "Custom plan";
}