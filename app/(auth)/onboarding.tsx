import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSession } from "../_layout";
import { Button, Card, H1, Input, Label, Pills, Screen } from "../../components/UI";
import { useT } from "../../lib/i18n";
import {
  Activity, computeTargets, ftInToCm, Goal, lbToKg, SPLITS, SplitId,
} from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { type, useTheme } from "../../lib/theme";

const GOALS = ["fat_loss", "maintain", "muscle_gain", "recomp"] as const;
const ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"] as const;

export default function Onboarding() {
  const { refreshProfile } = useSession();
  const { colors } = useTheme();
  const { t } = useT();
  const router = useRouter();

  const GOAL_LABELS = { fat_loss: "Fat loss", maintain: "Maintain", muscle_gain: "Muscle gain", recomp: "Recomp" };
  const ACTIVITY_LABELS = { sedentary: "Sedentary", light: "Light", moderate: "Moderate", active: "Active", very_active: "Very active" };

  const [units, setUnits] = useState<"imperial" | "metric">("imperial");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [birthYear, setBirthYear] = useState("2006");
  const [ft, setFt] = useState("5"); const [inch, setInch] = useState("10");
  const [cm, setCm] = useState("178");
  const [weight, setWeight] = useState("165"); // lb or kg per units
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("muscle_gain");
  const [split, setSplit] = useState<SplitId>("PPL");
  const [busy, setBusy] = useState(false);

  const heightCm = units === "imperial" ? ftInToCm(Number(ft) || 0, Number(inch) || 0) : Number(cm) || 0;
  const weightKg = units === "imperial" ? lbToKg(Number(weight) || 0) : Number(weight) || 0;

  const targets = useMemo(() => {
    if (!heightCm || !weightKg || !Number(birthYear)) return null;
    return computeTargets({ sex, birthYear: Number(birthYear), heightCm, weightKg, activity, goal });
  }, [sex, birthYear, heightCm, weightKg, activity, goal]);

  const save = async () => {
    if (!targets) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").update({
      sex, birth_year: Number(birthYear), height_cm: heightCm, weight_kg: weightKg,
      activity_level: activity, goal, units, split,
      calorie_target: targets.calories, protein_target_g: targets.protein,
      carbs_target_g: targets.carbs, fat_target_g: targets.fat,
      water_target_ml: targets.waterMl, onboarded: true,
    }).eq("id", user!.id);
    await supabase.from("body_weight_logs").upsert(
      { user_id: user!.id, weight_kg: weightKg },
      { onConflict: "user_id,logged_on" },
    );
    await refreshProfile();
    setBusy(false);
    router.replace("/(tabs)");
  };

  return (
    <Screen>
      <View style={{ marginTop: 32, marginBottom: 16 }}>
        <H1>{t("onboarding.title")}</H1>
        <Text style={{ color: colors.steel, marginTop: 6 }}>
          {t("onboarding.subtitle")}
        </Text>
      </View>

      <Card>
        <Label>{t("onboarding.units")}</Label>
        <Pills options={["imperial", "metric"] as const} value={units} onChange={setUnits}
          labels={{ imperial: "lb / ft", metric: "kg / cm" }} />

        <Label>{t("onboarding.sex")}</Label>
        <Pills options={["male", "female"] as const} value={sex} onChange={setSex}
          labels={{ male: t("onboarding.male"), female: t("onboarding.female") }} />

        <Label>{t("onboarding.birthYear")}</Label>
        <Input value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" />

        <Label>{t("onboarding.height")}</Label>
        {units === "imperial" ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Input value={ft} onChangeText={setFt} keyboardType="number-pad" placeholder="ft" style={{ flex: 1 }} />
            <Input value={inch} onChangeText={setInch} keyboardType="number-pad" placeholder="in" style={{ flex: 1 }} />
          </View>
        ) : (
          <Input value={cm} onChangeText={setCm} keyboardType="number-pad" placeholder="cm" />
        )}

        <Label>{t("onboarding.weight")} ({units === "imperial" ? "lb" : "kg"})</Label>
        <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />

        <Label>{t("onboarding.activity")}</Label>
        <Pills options={ACTIVITIES} value={activity} onChange={setActivity} labels={ACTIVITY_LABELS} />

        <Label>{t("onboarding.goal")}</Label>
        <Pills options={GOALS} value={goal} onChange={setGoal} labels={GOAL_LABELS} />

        <Label>{t("onboarding.split")}</Label>
        <Pills options={Object.keys(SPLITS) as SplitId[]} value={split} onChange={setSplit}
          labels={Object.fromEntries(Object.entries(SPLITS).map(([k, v]) => [k, v.label])) as any} />
      </Card>

      {targets && (
        <Card style={{ marginTop: 16, backgroundColor: colors.cobaltSoft, borderColor: colors.cobaltSoft }}>
          <Text style={{ fontFamily: type.displayMed, color: colors.ink, fontSize: 15 }}>{t("onboarding.dailyTargets")}</Text>
          <Text style={{ fontFamily: type.display, fontSize: 26, color: colors.cobalt, marginTop: 4 }}>
            {targets.calories} kcal
          </Text>
          <Text style={{ color: colors.steel, marginTop: 2 }}>
            {targets.protein} g protein · {targets.carbs} g carbs · {targets.fat} g fat · {(targets.waterMl / 1000).toFixed(1)} L water
          </Text>
        </Card>
      )}

      <Button title={busy ? t("onboarding.saving") : t("onboarding.startLogging")} onPress={save} disabled={busy || !targets} />
    </Screen>
  );
}
