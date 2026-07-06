import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSession } from "../_layout";
import { Button, Card, H1, Input, Label, Screen } from "../../components/UI";
import { DAY_MUSCLES, fmtWeight, lbToKg, splitDaysOf, splitLabelOf } from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { colors, type } from "../../lib/theme";
import { touchStreak } from "../../lib/useToday";

type Exercise = { id: string; name: string; muscle_group: string };
type LoggedSet = { id: string; exercise_id: string; set_number: number; reps: number; weight_kg: number };

export default function Workout() {
  const { session, profile, refreshProfile } = useSession();
  const uid = session!.user.id;
  const units = profile?.units ?? "imperial";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exQuery, setExQuery] = useState("");
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [reps, setReps] = useState("8");
  const [weight, setWeight] = useState("");

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

  const start = async () => {
    const { data } = await supabase.from("workouts")
      .insert({ user_id: uid, split_day: todayDay }).select("*").single();
    setActiveWorkout(data);
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
    await supabase.from("workouts").update({ ended_at: new Date().toISOString() })
      .eq("id", activeWorkout.id);
    // Advance the split to the next day
    const next = ((profile!.split_day_index ?? 0) + 1) % splitDays.length;
    await supabase.from("profiles").update({ split_day_index: next }).eq("id", uid);
    await touchStreak();
    await refreshProfile();
    setActiveWorkout(null); setSets([]); setCurrentExercise(null);
    load();
  };

  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "";

  // Picker list: when searching, match all exercises by name; otherwise show the
  // day's suggested muscles first, then everything else.
  const q = exQuery.trim().toLowerCase();
  const pickerList = q
    ? exercises.filter((e) => e.name.toLowerCase().includes(q))
    : [
        ...exercises.filter((e) => dayMuscles.includes(e.muscle_group)),
        ...exercises.filter((e) => !dayMuscles.includes(e.muscle_group)),
      ];

  return (
    <Screen>
      <H1>Workout</H1>
      <Text style={{ color: colors.steel, marginTop: 4 }}>
        {splitLabelOf(profile)} · today is {todayDay}
      </Text>

      {!activeWorkout ? (
        <>
          {todayDay === "Rest" ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={{ fontFamily: type.display, fontSize: 18, color: colors.ink }}>Rest day 😴</Text>
              <Text style={{ color: colors.steel, marginTop: 4 }}>
                Recovery is where the muscle gets built. You can still start a session if you want to train.
              </Text>
              <Button title="Train anyway" kind="ghost" onPress={start} />
            </Card>
          ) : (
            <Button title={`Start ${todayDay} session`} onPress={start} />
          )}

          {history.length > 0 && (
            <>
              <Label>History</Label>
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
              <Text style={{ color: colors.steel, fontSize: 12 }}>
                started {new Date(activeWorkout.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>

            {/* Exercise picker */}
            <Label>Exercise</Label>
            <Pressable onPress={() => setPickerOpen(!pickerOpen)}
              style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: colors.card }}>
              <Text style={{ color: currentExercise ? colors.ink : colors.steel }}>
                {currentExercise?.name ?? "Choose an exercise…"}
              </Text>
            </Pressable>
            {pickerOpen && (
              <View style={{ marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: "hidden" }}>
                <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <Input value={exQuery} onChangeText={setExQuery} placeholder="Search exercises…" autoFocus />
                </View>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {pickerList.length === 0 ? (
                    <Text style={{ color: colors.steel, padding: 12 }}>No exercises match “{exQuery}”.</Text>
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
                <Label>Reps</Label>
                <Input value={reps} onChangeText={setReps} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Weight ({units === "imperial" ? "lb" : "kg"})</Label>
                <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
            </View>
            <Button title="Log set" onPress={logSet} disabled={!currentExercise} />
          </Card>

          <RestTimer />

          {sets.length > 0 && (
            <>
              <Label>This session · {sets.length} sets</Label>
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

          <Button title="Finish workout" kind="primary" onPress={finish} disabled={sets.length === 0} />
        </>
      )}
    </Screen>
  );
}

/** Simple rest timer with the standard presets. */
function RestTimer() {
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
        <Text style={{ fontFamily: type.displayMed, color: colors.ink }}>⏱ Rest timer</Text>
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