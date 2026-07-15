import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useSession } from "../_layout";
import { Button, Card, H1, Input, Label, Pills, Screen } from "../../components/UI";
import { LANGS, useT } from "../../lib/i18n";
import { fmtWeight, kgToLb, lbToKg, splitLabelOf, SPLITS, SplitId } from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { Scheme, type, useTheme } from "../../lib/theme";
import { touchStreak } from "../../lib/useToday";

const notify = (msg: string) =>
  Platform.OS === "web" ? window.alert(msg) : Alert.alert("Everything Fitness", msg);

export default function Profile() {
  const { session, profile, refreshProfile } = useSession();
  const { colors, scheme, setScheme } = useTheme();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const uid = session!.user.id;
  const units = profile?.units ?? "imperial";

  const [weightInput, setWeightInput] = useState("");
  const [weights, setWeights] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadData = useCallback(async () => {
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from("body_weight_logs").select("*").eq("user_id", uid)
        .order("logged_on", { ascending: false }).limit(14),
      supabase.from("custom_plans").select("*").eq("user_id", uid)
        .order("created_at", { ascending: false }),
    ]);
    setWeights(w ?? []);
    setPlans(p ?? []);
  }, [uid]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  if (!profile) return <Screen><Text style={{ color: colors.steel }}>{t("common.loading")}</Text></Screen>;

  const logWeight = async () => {
    const kg = units === "imperial" ? lbToKg(Number(weightInput)) : Number(weightInput);
    if (!kg) return;
    await supabase.from("body_weight_logs").upsert(
      { user_id: uid, weight_kg: kg }, { onConflict: "user_id,logged_on" });
    await supabase.from("profiles").update({ weight_kg: kg }).eq("id", uid);
    await touchStreak();
    setWeightInput("");
    await Promise.all([loadData(), refreshProfile()]);
  };

  const redeem = async () => {
    setRedeeming(true);
    const { data, error } = await supabase.functions.invoke("redeem-code", {
      body: { code: code.trim() },
    });
    setRedeeming(false);
    if (error || data?.error) return notify(data?.error ?? "Invalid code.");
    setCode("");
    await refreshProfile();
    notify("Code redeemed — premium unlocked, forever. 🏆");
  };

  // Choosing a built-in split clears any active custom plan.
  const setSplit = async (split: SplitId) => {
    await supabase.from("profiles").update({
      split, split_days: null, split_label: null, split_day_index: 0,
    }).eq("id", uid);
    refreshProfile();
  };

  const useCustomPlan = async (plan: any) => {
    await supabase.from("profiles").update({
      split: "CUSTOM", split_days: plan.days, split_label: plan.name, split_day_index: 0,
    }).eq("id", uid);
    refreshProfile();
  };

  const deletePlan = async (plan: any) => {
    await supabase.from("custom_plans").delete().eq("id", plan.id);
    // If it was the active plan, fall back to PPL.
    if (profile.split === "CUSTOM" && profile.split_label === plan.name) {
      await supabase.from("profiles").update({
        split: "PPL", split_days: null, split_label: null, split_day_index: 0,
      }).eq("id", uid);
      refreshProfile();
    }
    loadData();
  };

  const setUnits = async (u: "imperial" | "metric") => {
    await supabase.from("profiles").update({ units: u }).eq("id", uid);
    refreshProfile();
  };

  const setTrainingMode = async (m: "gym" | "home") => {
    const { error } = await supabase.from("profiles").update({ training_mode: m }).eq("id", uid);
    if (error) return notify(`Couldn't update training mode: ${error.message}`);
    refreshProfile();
  };

  const trend = weights.length >= 2
    ? Number(weights[0].weight_kg) - Number(weights[weights.length - 1].weight_kg)
    : 0;

  const usingCustom = profile.split === "CUSTOM";

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H1>{profile.display_name}</H1>
        {profile.premium_forever && (
          <View style={{ backgroundColor: "#FDF3D0", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: type.displayMed, color: "#A97B08" }}>👑 Premium</Text>
          </View>
        )}
      </View>

      {/* Daily targets */}
      <Card style={{ marginTop: 16 }}>
        <Text style={{ fontFamily: type.displayMed, color: colors.ink }}>{t("profile.dailyTargets")}</Text>
        <Text style={{ color: colors.steel, marginTop: 6, lineHeight: 20 }}>
          {profile.calorie_target} kcal · {profile.protein_target_g} g protein ·{" "}
          {profile.carbs_target_g} g carbs · {profile.fat_target_g} g fat ·{" "}
          {(profile.water_target_ml / 1000).toFixed(1)} L water
        </Text>
        <Text style={{ color: colors.steel, fontSize: 12, marginTop: 6 }}>
          {t("profile.goalLabel", { goal: String(profile.goal).replace("_", " ") })}
        </Text>
      </Card>

      {/* Body weight */}
      <Label>{t("profile.bodyWeight")}</Label>
      <Card>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Input value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad"
            placeholder={units === "imperial" ? `${kgToLb(Number(profile.weight_kg)).toFixed(1)} lb` : `${Number(profile.weight_kg).toFixed(1)} kg`}
            style={{ flex: 1 }} />
          <Button title={t("profile.log")} onPress={logWeight} />
        </View>
        {weights.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {weights.slice(0, 5).map((w) => (
              <View key={w.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                <Text style={{ color: colors.steel }}>{w.logged_on}</Text>
                <Text style={{ color: colors.ink }}>{fmtWeight(Number(w.weight_kg), units)}</Text>
              </View>
            ))}
            {weights.length >= 2 && (
              <Text style={{ color: trend <= 0 ? colors.mint : colors.amber, marginTop: 6, fontSize: 13 }}>
                {t("profile.trend", { arrow: trend <= 0 ? "▼" : "▲", amount: fmtWeight(Math.abs(trend), units), n: weights.length })}
              </Text>
            )}
          </View>
        )}
      </Card>

      {/* Active plan summary */}
      <Label>{t("profile.workoutSplit")}</Label>
      <Card style={{ marginBottom: 4 }}>
        <Text style={{ color: colors.steel, fontSize: 12 }}>{t("profile.active")}</Text>
        <Text style={{ fontFamily: type.displayMed, color: colors.ink, marginTop: 2 }}>
          {splitLabelOf(profile)}
        </Text>
      </Card>

      {/* Built-in splits */}
      <Pills options={Object.keys(SPLITS) as SplitId[]} value={usingCustom ? ("" as any) : profile.split} onChange={setSplit}
        labels={Object.fromEntries(Object.entries(SPLITS).map(([k, v]) => [k, v.label])) as any} />

      {/* Custom plans */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 6 }}>
        <Text style={{ color: colors.steel, fontSize: 13 }}>{t("profile.yourPlans")}</Text>
        <Pressable onPress={() => router.push("/plan-builder")}>
          <Text style={{ color: colors.cobalt, fontFamily: type.displayMed, fontSize: 14 }}>{t("profile.createPlan")}</Text>
        </Pressable>
      </View>
      {plans.length === 0 ? (
        <Card>
          <Text style={{ color: colors.steel, fontSize: 13 }}>{t("profile.noPlans")}</Text>
        </Card>
      ) : (
        <Card>
          {plans.map((p, i) => {
            const active = usingCustom && profile.split_label === p.name;
            return (
              <View key={p.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: i < plans.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: colors.ink, fontFamily: type.displayMed }}>{p.name}</Text>
                  <Text style={{ color: colors.steel, fontSize: 12 }} numberOfLines={1}>
                    {(p.days as string[]).join(" · ")}
                  </Text>
                </View>
                {active ? (
                  <Text style={{ color: colors.mint, fontFamily: type.displayMed, fontSize: 13 }}>{t("profile.active")} ✓</Text>
                ) : (
                  <Pressable onPress={() => useCustomPlan(p)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.cobalt, borderRadius: 999 }}>
                    <Text style={{ color: colors.cobalt, fontSize: 13 }}>{t("profile.use")}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => deletePlan(p)} hitSlop={8} style={{ marginLeft: 10 }}>
                  <Text style={{ color: colors.coral, fontSize: 16 }}>✕</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}

      <Label>{t("profile.units")}</Label>
      <Pills options={["imperial", "metric"] as const} value={units} onChange={setUnits}
        labels={{ imperial: "lb / ft", metric: "kg / cm" }} />

      {/* Preferences: language, appearance, training mode */}
      <Label>{t("profile.preferences")}</Label>
      <Card style={{ gap: 4 }}>
        <Text style={{ color: colors.steel, fontSize: 13, marginBottom: 6 }}>{t("profile.language")}</Text>
        <Pills options={LANGS.map((l) => l.id)} value={lang} onChange={setLang}
          labels={Object.fromEntries(LANGS.map((l) => [l.id, l.label])) as any} />

        <Text style={{ color: colors.steel, fontSize: 13, marginTop: 16, marginBottom: 6 }}>{t("profile.appearance")}</Text>
        <Pills options={["light", "dark"] as Scheme[]} value={scheme} onChange={setScheme}
          labels={{ light: t("profile.light"), dark: t("profile.dark") }} />

        <Text style={{ color: colors.steel, fontSize: 13, marginTop: 16, marginBottom: 6 }}>{t("profile.trainingMode")}</Text>
        <Pills options={["gym", "home"] as const} value={profile.training_mode ?? "gym"} onChange={setTrainingMode}
          labels={{ gym: t("workout.gym"), home: t("workout.home") }} />
      </Card>

      {/* Redeem code */}
      {!profile.premium_forever && (
        <>
          <Label>{t("profile.redeemCode")}</Label>
          <Card>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Input value={code} onChangeText={setCode} autoCapitalize="characters"
                placeholder={t("profile.enterCode")} style={{ flex: 1 }} />
              <Button title={redeeming ? t("profile.redeeming") : t("profile.redeem")} onPress={redeem} disabled={redeeming || !code.trim()} />
            </View>
          </Card>
        </>
      )}

      <Button title={t("common.signOut")} kind="danger" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
