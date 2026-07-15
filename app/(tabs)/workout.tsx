import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSession } from "../_layout";
import { Button, Card, H1, Input, Label, Screen } from "../../components/UI";
import { useT } from "../../lib/i18n";
import { DAY_MUSCLES, exercisesForMode, fmtWeight, lbToKg, splitDaysOf, splitLabelOf } from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { type, useTheme } from "../../lib/theme";
import { touchStreak } from "../../lib/useToday";

type Exercise = { id: string; name: string; muscle_group: string; equipment: string };
type LoggedSet = { id: string; exercise_id: string; set_number: number; reps: number; weight_kg: number };
type Summary = { durationSec: number; sets: number; volumeKg: number; exercises: number };

const confirm = (msg: string, onOk: () => void) => {
  if (Platform.OS === "web") { if (window.confirm(msg)) onOk(); }
  else Alert.alert("Everything Fitness", msg, [{ text: "Cancel", style: "cancel" }, { text: "OK", onPress: onOk }]);
};

export default function Workout() {
  const { session, profile, refreshProfile } = useSession();
  const { colors } = useTheme();
  const { t } = useT();
  const uid = session!.user.id;
  const units = profile?.units ?? "imperial";
  const mode: "gym" | "home" = profile?.training_mode ?? "gym";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exQuery, setExQuery] = useState("");
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [now, setNow] = useState(Date.now());

  const splitDays = splitDaysOf(profile);
  const todayDay = profile ? splitDays[profile.split_day_index % splitDays.length] : "Rest";
  const dayMuscles = DAY_MUSCLES[todayDay] ?? [];

  const load = useCallback(async () => {
    const [{ data: ex }, { data: open }, { data: hist }] = await Promise.all([
      supabase.from("exercises").select("*").order("muscle_group"),
      supabase.from("workouts").select("*").eq("user_id", uid).is("ended_at", null)
        .order("started_at", { ascending: false }).limit(1),
      supabase.from("workouts").select("*, workout_sets(count)").eq("user_id", uid)
        .not("ended_at", "is", null).order("started_at", { ascending: false }).limit(10),
    ]);
    setExercises(ex ?? []);
    setHistory(hist ?? []);
    const w = open?.[0] ?? null;
    setActiveWorkout(w);
    if (w) {
      const { data: ss } = await supabase.from("workout_sets").select("*")
        .eq("workout_id", w.id).order("created_at");
      setSets(ss ?? []);
    } else setSets([]);
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live elapsed-time ticker while a session is open.
  useEffect(() => {
    if (!activeWorkout) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [activeWorkout]);

  const start = async () => {
    const { data } = await supabase.from("workouts")
      .insert({ user_id: uid, split_day: todayDay }).select("*").single();
    setActiveWorkout(data);
    setNow(Date.now());
  };

  // Adaptive split: skipping a day just advances the rotation without logging
  // a session — the next time you train, you pick up where you left off
  // instead of being stuck redoing a stale day.
  const skip = () => {
    confirm(t("workout.skipConfirm"), async () => {
      const next = ((profile!.split_day_index ?? 0) + 1) % splitDays.length;
      await supabase.from("profiles").update({ split_day_index: next }).eq("id", uid);
      await refreshProfile();
    });
  };

  const logSet = async () => {
    if (!currentExercise || !activeWorkout) return;
    const priorForExercise = sets.filter((s) => s.exercise_id === currentExercise.id).length;
    const weightKg = units === "imperial" ? lbToKg(Number(weight) || 0) : Number(weight) || 0;
    const { data } = await supabase.from("workout_sets").insert({
      workout_id: activeWorkout.id, user_id: uid, exercise_id: currentExercise.id,
      set_number: priorForExercise + 1, reps: Number(reps) || 0, weight_kg: weightKg,
    }).select("*").single();
    if (data) setSets([...sets, data]);
  };

  const finish = async () => {
    const startedAt = new Date(activeWorkout.started_at).getTime();
    const endedAt = Date.now();
    await supabase.from("workouts").update({ ended_at: new Date(endedAt).toISOString() })
      .eq("id", activeWorkout.id);
    // Advance the split to the next day
    const next = ((profile!.split_day_index ?? 0) + 1) % splitDays.length;
    await supabase.from("profiles").update({ split_day_index: next }).eq("id", uid);
    await touchStreak();
    await refreshProfile();

    const volumeKg = sets.reduce((a, s) => a + s.reps * Number(s.weight_kg), 0);
    const exerciseCount = new Set(sets.map((s) => s.exercise_id)).size;
    setSummary({ durationSec: Math.round((endedAt - startedAt) / 1000), sets: sets.length, volumeKg, exercises: exerciseCount });

    setActiveWorkout(null); setSets([]); setCurrentExercise(null);
    load();
  };

  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "";

  const modeFiltered = exercisesForMode(exercises, mode);

  // Picker list: when searching, match all exercises by name; otherwise show the
  // day's suggested muscles first, then everything else.
  const q = exQuery.trim().toLowerCase();
  const pickerList = q
    ? modeFiltered.filter((e) => e.name.toLowerCase().includes(q))
    : [
        ...modeFiltered.filter((e) => dayMuscles.includes(e.muscle_group)),
        ...modeFiltered.filter((e) => !dayMuscles.includes(e.muscle_group)),
      ];

  // Substitutes: same muscle group, different exercise, respecting home/gym mode.
  const substitutes = currentExercise
    ? modeFiltered.filter((e) => e.muscle_group === currentExercise.muscle_group && e.id !== currentExercise.id)
    : [];

  const elapsed = activeWorkout ? Math.max(0, Math.round((now - new Date(activeWorkout.started_at).getTime()) / 1000)) : 0;
  const fmtDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (summary) {
    return (
      <Screen>
        <H1>{t("workout.summaryTitle")}</H1>
        <Card style={{ marginTop: 16 }}>
          <SummaryRow label={t("workout.summaryDuration")} value={fmtDuration(summary.durationSec)} />
          <SummaryRow label={t("workout.summarySets")} value={String(summary.sets)} />
          <SummaryRow label={t("workout.summaryVolume")} value={fmtWeight(summary.volumeKg, units)} />
          <SummaryRow label={t("workout.summaryExercises")} value={String(summary.exercises)} last />
        </Card>
        <Button title={t("workout.done")} onPress={() => setSummary(null)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>{t("workout.title")}</H1>
      <Text style={{ color: colors.steel, marginTop: 4 }}>
        {t("workout.todayIs", { split: splitLabelOf(profile), day: todayDay })}
      </Text>

      {!activeWorkout ? (
        <>
          {todayDay === "Rest" ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: type.display, fontSize: 18, color: colors.ink }}>{t("workout.restDay")}</Text>
              <Text style={{ color: colors.steel, marginTop: 4 }}>{t("workout.restDayBody")}</Text>
              <Button title={t("workout.trainAnyway")} kind="ghost" onPress={start} />
            </Card>
          ) : (
            <>
              <Button title={t("workout.startSession", { day: todayDay })} onPress={start} />
              <Pressable onPress={skip} style={{ marginTop: 10, alignSelf: "center" }}>
                <Text style={{ color: colors.steel, fontSize: 13 }}>{t("workout.skipToday")}</Text>
              </Pressable>
            </>
          )}

          {history.length > 0 && (
            <>
              <Label>{t("workout.history")}</Label>
              <Card>
                {history.map((w) => (
                  <View key={w.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <Text style={{ color: colors.ink, fontFamily: type.displayMed }}>{w.split_day}</Text>
                    <Text style={{ color: colors.steel, fontSize: 12 }}>
                      {new Date(w.started_at).toLocaleDateString()} · {w.workout_sets?.[0]?.count ?? 0} sets
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      ) : (
        <>
          <Card style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: type.display, fontSize: 18, color: colors.ink }}>
                {activeWorkout.split_day} session
              </Text>
              <Text style={{ color: colors.cobalt, fontFamily: type.displayMed, fontSize: 16 }}>
                {fmtDuration(elapsed)}
              </Text>
            </View>

            {/* Exercise picker */}
            <Label>{t("workout.exercise")}</Label>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setPickerOpen(!pickerOpen)}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: colors.card }}>
                <Text style={{ color: currentExercise ? colors.ink : colors.steel }}>
                  {currentExercise?.name ?? t("workout.chooseExercise")}
                </Text>
              </Pressable>
              {currentExercise && (
                <Pressable onPress={() => setSubOpen(!subOpen)}
                  style={{ justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12 }}>
                  <Text style={{ color: colors.cobalt, fontSize: 13 }}>{t("workout.substitute")}</Text>
                </Pressable>
              )}
            </View>

            {subOpen && currentExercise && (
              <View style={{ marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden" }}>
                <Text style={{ color: colors.steel, fontSize: 12, padding: 10 }}>{t("workout.substituteTitle")}</Text>
                {substitutes.length === 0 ? (
                  <Text style={{ color: colors.steel, padding: 12 }}>—</Text>
                ) : (
                  substitutes.map((e) => (
                    <Pressable key={e.id} onPress={() => { setCurrentExercise(e); setSubOpen(false); }}
                      style={{ padding: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
                      <Text style={{ color: colors.ink }}>{e.name}</Text>
                      <Text style={{ color: colors.steel, fontSize: 11 }}>{e.equipment}</Text>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {pickerOpen && (
              <View style={{ marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden" }}>
                <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <Input value={exQuery} onChangeText={setExQuery} placeholder="Search exercises…" autoFocus />
                </View>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {pickerList.length === 0 ? (
                    <Text style={{ color: colors.steel, padding: 12 }}>{t("nutrition.noResults", { q: exQuery })}</Text>
                  ) : (
                    pickerList.map((e) => (
                      <Pressable key={e.id} onPress={() => { setCurrentExercise(e); setPickerOpen(false); setExQuery(""); }}
                        style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.card }}>
                        <Text style={{ color: colors.ink }}>{e.name}</Text>
                        <Text style={{ color: colors.steel, fontSize: 11 }}>{e.muscle_group}</Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Label>{t("workout.reps")}</Label>
                <Input value={reps} onChangeText={setReps} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>{t("workout.weight", { unit: units === "imperial" ? "lb" : "kg" })}</Label>
                <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
            </View>
            <Button title={t("workout.logSet")} onPress={logSet} disabled={!currentExercise} />
          </Card>

          <RestTimer />

          {sets.length > 0 && (
            <>
              <Label>{t("workout.thisSession", { n: sets.length })}</Label>
              <Card>
                {sets.map((s) => (
                  <View key={s.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <Text style={{ color: colors.ink, flex: 1 }} numberOfLines={1}>
                      {exName(s.exercise_id)} · set {s.set_number}
                    </Text>
                    <Text style={{ color: colors.steel }}>
                      {s.reps} × {fmtWeight(Number(s.weight_kg), units)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          <Button title={t("workout.finishWorkout")} kind="primary" onPress={finish} disabled={sets.length === 0} />
        </>
      )}
    </Screen>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
      <Text style={{ color: colors.steel }}>{label}</Text>
      <Text style={{ color: colors.ink, fontFamily: type.displayMed }}>{value}</Text>
    </View>
  );
}

/** Simple rest timer with the standard presets. */
function RestTimer() {
  const { colors } = useTheme();
  const { t } = useT();
  const [remaining, setRemaining] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (secs: number) => {
    if (ref.current) clearInterval(ref.current);
    setRemaining(secs);
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1 && ref.current) { clearInterval(ref.current); return 0; }
        return r - 1;
      });
    }, 1000);
  };
  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);

  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Card style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontFamily: type.displayMed, color: colors.ink }}>{t("workout.restTimer")}</Text>
        <Text style={{
          fontFamily: type.display, fontSize: 24,
          color: remaining > 0 ? colors.cobalt : colors.steel,
        }}>
          {mm}:{ss}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        {[60, 90, 120, 180].map((s) => (
          <Pressable key={s} onPress={() => startTimer(s)}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}>
            <Text style={{ color: colors.ink, fontSize: 13 }}>{s >= 60 ? `${s / 60}:${String(s % 60).padStart(2, "0")}` : s}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
