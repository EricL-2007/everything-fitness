import { useCallback, useEffect, useState } from "react";
import { supabase, today } from "./supabase";

export type TodayData = {
  kcal: number; protein: number; carbs: number; fat: number;
  waterMl: number;
  foodLogs: any[];
  workedOutToday: boolean;
  workedOutYesterday: boolean;
  loading: boolean;
};

/** Aggregates everything the dashboard and Coach Er need for the current day. */
export function useToday(userId?: string) {
  const [data, setData] = useState<TodayData>({
    kcal: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0,
    foodLogs: [], workedOutToday: false, workedOutYesterday: false, loading: true,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    const d = today();
    const yest = new Date(Date.now() - 86400000);
    const y = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;

    const [foods, water, workouts] = await Promise.all([
      supabase.from("food_logs").select("*").eq("user_id", userId).eq("logged_on", d).order("created_at"),
      supabase.from("water_logs").select("ml").eq("user_id", userId).eq("logged_on", d),
      supabase.from("workouts").select("id, started_at").eq("user_id", userId)
        .gte("started_at", `${y}T00:00:00`).order("started_at", { ascending: false }),
    ]);

    const logs = foods.data ?? [];
    const sum = (k: string) => logs.reduce((a, r) => a + Number(r[k] || 0), 0);
    const workedToday = (workouts.data ?? []).some((w) => w.started_at.slice(0, 10) === d);
    const workedYest = (workouts.data ?? []).some((w) => w.started_at.slice(0, 10) === y);

    setData({
      kcal: sum("kcal"), protein: sum("protein_g"), carbs: sum("carbs_g"), fat: sum("fat_g"),
      waterMl: (water.data ?? []).reduce((a, r) => a + r.ml, 0),
      foodLogs: logs,
      workedOutToday: workedToday,
      workedOutYesterday: workedYest,
      loading: false,
    });
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { ...data, refresh };
}

/** Bump the streak after any log; returns the new count. */
export async function touchStreak(): Promise<number> {
  const { data } = await supabase.rpc("touch_streak");
  return data ?? 0;
}
