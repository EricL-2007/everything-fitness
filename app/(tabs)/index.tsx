import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSession } from "../_layout";
import TodayRing, { MacroLegend } from "../../components/TodayRing";
import { Card, H1, Input, Screen } from "../../components/UI";
import { useT } from "../../lib/i18n";
import { splitDaysOf, splitLabelOf } from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { type, useTheme } from "../../lib/theme";
import { touchStreak, useToday } from "../../lib/useToday";

export default function Today() {
  const { session, profile, refreshProfile } = useSession();
  const { colors } = useTheme();
  const { t } = useT();
  const t_ = useToday(session?.user.id);
  const router = useRouter();
  const [customWater, setCustomWater] = useState("");

  useFocusEffect(useCallback(() => { t_.refresh(); }, [t_.refresh]));

  if (!profile) return <Screen><Text style={{ color: colors.steel }}>{t("common.loading")}</Text></Screen>;

  const splitDays = splitDaysOf(profile);
  const todaySplitDay = splitDays[profile.split_day_index % splitDays.length];

  const addWater = async (ml: number) => {
    if (!ml || ml <= 0) return;
    await supabase.from("water_logs").insert({ user_id: session!.user.id, ml });
    await touchStreak();
    await Promise.all([t_.refresh(), refreshProfile()]);
  };

  const addCustomWater = async () => {
    const ml = Math.round(Number(customWater));
    if (!ml || ml <= 0) return;
    setCustomWater("");
    await addWater(ml);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H1>{t("tabs.today")}</H1>
        <View style={{ backgroundColor: profile.streak_count > 0 ? colors.mintSoft : colors.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontFamily: type.displayMed, color: profile.streak_count > 0 ? colors.mint : colors.steel }}>
            🔥 {t("today.streak", { n: profile.streak_count })}
          </Text>
        </View>
      </View>

      <Card style={{ marginTop: 16, alignItems: "center" }}>
        <TodayRing
          kcal={t_.kcal} kcalTarget={profile.calorie_target}
          protein={t_.protein} proteinTarget={profile.protein_target_g}
          carbs={t_.carbs} carbsTarget={profile.carbs_target_g}
          fat={t_.fat} fatTarget={profile.fat_target_g}
        />
        <MacroLegend
          protein={t_.protein} proteinTarget={profile.protein_target_g}
          carbs={t_.carbs} carbsTarget={profile.carbs_target_g}
          fat={t_.fat} fatTarget={profile.fat_target_g}
        />
      </Card>

      {/* Water */}
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: type.displayMed, fontSize: 15, color: colors.ink }}>💧 {t("today.water")}</Text>
          <Text style={{ color: colors.steel }}>
            {(t_.waterMl / 1000).toFixed(1)} / {(profile.water_target_ml / 1000).toFixed(1)} L
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: colors.line, borderRadius: 4, marginTop: 10, overflow: "hidden" }}>
          <View style={{
            height: 8, borderRadius: 4, backgroundColor: colors.water,
            width: `${Math.min(100, (t_.waterMl / profile.water_target_ml) * 100)}%`,
          }} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {[250, 500, 750].map((ml) => (
            <Pressable key={ml} onPress={() => addWater(ml)}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 10, alignItems: "center", backgroundColor: colors.card }}>
              <Text style={{ color: colors.water, fontFamily: type.displayMed }}>+{ml} ml</Text>
            </Pressable>
          ))}
        </View>
        {/* Custom amount */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Input
            value={customWater}
            onChangeText={setCustomWater}
            keyboardType="number-pad"
            placeholder={t("today.customMl")}
            style={{ flex: 1 }}
          />
          <Pressable onPress={addCustomWater}
            style={{ paddingHorizontal: 18, justifyContent: "center", borderRadius: 12, backgroundColor: customWater.trim() ? colors.water : colors.line }}>
            <Text style={{ color: "#fff", fontFamily: type.displayMed }}>{t("common.add")}</Text>
          </Pressable>
        </View>
      </Card>

      {/* Today's session */}
      <Pressable onPress={() => router.push("/(tabs)/workout")}>
        <Card style={{ marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: colors.steel, fontSize: 12 }}>{t("today.todaysSession")} · {splitLabelOf(profile)}</Text>
            <Text style={{ fontFamily: type.display, fontSize: 20, color: colors.ink, marginTop: 2 }}>
              {todaySplitDay} {todaySplitDay === "Rest" ? "😴" : ""}
            </Text>
          </View>
          <Text style={{
            color: t_.workedOutToday ? colors.mint : colors.cobalt,
            fontFamily: type.displayMed,
          }}>
            {t_.workedOutToday ? t("today.logged") : todaySplitDay === "Rest" ? t("today.recover") : t("today.start")}
          </Text>
        </Card>
      </Pressable>
    </Screen>
  );
}
