import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type StrengthPoint = { date: string; weightKg: number };

export type WeeklyData = {
  workouts: number;
  avgKcal: number;
  avgProtein: number;
  topExercise: string | null;
  strengthPoints: StrengthPoint[];
  loading: boolean;
};

/** Aggregates the last 7 days of training + nutrition, plus a strength trend
 * for whichever exercise the user has logged most — the "weekly report" and
 * "strength progression" tracking features. */
export function useWeekly(userId?: string) {
  const [data, setData] = useState<WeeklyData>({
    workouts: 0, avgKcal: 0, avgProtein: 0, topExercise: null, strengthPoints: [], loading: true,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [{ data: workouts }, { data: foods }, { data: sets }] = await Promise.all([
      supabase.from("workouts").select("id").eq("user_id", userId)
        .not("ended_at", "is", null).gte("started_at", `${since}T00:00:00`),
      supabase.from("food_logs").select("kcal, protein_g").eq("user_id", userId).gte("logged_on", since),
      supabase.from("workout_sets").select("exercise_id, weight_kg, created_at, exercises(name)")
        .eq("user_id", userId).order("created_at", { ascending: true }).limit(500),
    ]);

    const avgKcal = (foods ?? []).reduce((a, f) => a + (Number(f.kcal) || 0), 0) / 7;
    const avgProtein = (foods ?? []).reduce((a, f) => a + (Number(f.protein_g) || 0), 0) / 7;

    // Most-logged exercise overall drives the strength trend — usually the
    // user's main compound lift, which is what they care about tracking.
    const countByExercise = new Map<string, number>();
    for (const s of sets ?? []) countByExercise.set(s.exercise_id, (countByExercise.get(s.exercise_id) ?? 0) + 1);
    let topId: string | null = null;
    let topCount = 0;
    for (const [id, count] of countByExercise) {
      if (count > topCount) { topCount = count; topId = id; }
    }

    let topName: string | null = null;
    let strengthPoints: StrengthPoint[] = [];
    if (topId) {
      const rowsForTop = (sets ?? []).filter((s: any) => s.exercise_id === topId);
      topName = (rowsForTop[0] as any)?.exercises?.name ?? null;
      const byDay = new Map<string, number>();
      for (const s of rowsForTop) {
        const day = String((s as any).created_at).slice(0, 10);
        byDay.set(day, Math.max(byDay.get(day) ?? 0, Number((s as any).weight_kg) || 0));
      }
      strengthPoints = [...byDay.entries()].map(([date, weightKg]) => ({ date, weightKg })).slice(-10);
    }

    setData({
      workouts: (workouts ?? []).length,
      avgKcal, avgProtein,
      topExercise: topName,
      strengthPoints,
      loading: false,
    });
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...data, refresh };
}
