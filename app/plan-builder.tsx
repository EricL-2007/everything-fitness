import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Alert, Text, View } from "react-native";
import { useSession } from "./_layout";
import { Button, Card, H1, Input, Label, Screen } from "../components/UI";
import { CUSTOM_DAY_OPTIONS } from "../lib/fitness";
import { supabase } from "../lib/supabase";
import { colors, type } from "../lib/theme";

const notify = (msg: string) =>
  Platform.OS === "web" ? window.alert(msg) : Alert.alert("Everything Fitness", msg);

export default function PlanBuilder() {
  const { session, refreshProfile } = useSession();
  const uid = session!.user.id;
  const router = useRouter();

  const [name, setName] = useState("");
  const [days, setDays] = useState<string[]>(["Push", "Pull", "Legs", "Upper", "Lower", "Rest", "Rest"]);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const setDay = (index: number, value: string) => {
    setDays((d) => d.map((x, i) => (i === index ? value : x)));
    setEditing(null);
  };

  const save = async () => {
    const planName = name.trim() || "My plan";
    setSaving(true);
    // 1. Save the plan
    const { data: plan, error } = await supabase.from("custom_plans")
      .insert({ user_id: uid, name: planName, days }).select("*").single();
    if (error || !plan) {
      setSaving(false);
      notify("Couldn't save the plan. Please try again.");
      return;
    }
    // 2. Make it the active split immediately
    await supabase.from("profiles").update({
      split: "CUSTOM", split_days: days, split_label: planName, split_day_index: 0,
    }).eq("id", uid);
    await refreshProfile();
    setSaving(false);
    router.back();
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: colors.cobalt, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
      </View>
      <H1>Build a plan</H1>
      <Text style={{ color: colors.steel, marginTop: 4 }}>
        Set each day of your week. Tap a day to change it — the plan advances one day
        every time you finish a session.
      </Text>

      <Label>Plan name</Label>
      <Input value={name} onChangeText={setName} placeholder="e.g. My PPL + Arms" />

      <Label>Your week</Label>
      <Card>
        {days.map((d, i) => (
          <View key={i}>
            <Pressable onPress={() => setEditing(editing === i ? null : i)}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: colors.line }}>
              <Text style={{ color: colors.steel, fontSize: 13 }}>Day {i + 1}</Text>
              <Text style={{ color: d === "Rest" ? colors.steel : colors.ink, fontFamily: type.displayMed }}>
                {d} {d === "Rest" ? "😴" : ""}
              </Text>
            </Pressable>
            {editing === i && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 10 }}>
                {CUSTOM_DAY_OPTIONS.map((opt) => {
                  const active = opt === d;
                  return (
                    <Pressable key={opt} onPress={() => setDay(i, opt)}
                      style={{ borderWidth: 1, borderColor: active ? colors.ink : colors.line, backgroundColor: active ? colors.ink : colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ color: active ? "#fff" : colors.ink, fontSize: 13 }}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </Card>

      <Button title={saving ? "Saving…" : "Save & use this plan"} onPress={save} disabled={saving} />
    </Screen>
  );
}