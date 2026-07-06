import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { useSession } from "../_layout";
import { Card, H1, Screen } from "../../components/UI";
import CoachMascot from "../../components/CoachMascot";
import { coachEr } from "../../lib/coach";
import { splitDaysOf } from "../../lib/fitness";
import { colors, type } from "../../lib/theme";
import { useToday } from "../../lib/useToday";

const TONE_STYLE = {
  push:   { bg: "#E9EDFE", accent: "#2447F0", label: "Push" },
  praise: { bg: "#E4F7EE", accent: "#17B26A", label: "Nice" },
  warn:   { bg: "#FEF2E2", accent: "#F79009", label: "Heads up" },
  info:   { bg: "#F4F4F2", accent: "#667085", label: "Note" },
} as const;

export default function Coach() {
  const { session, profile } = useSession();
  const t = useToday(session?.user.id);
  useFocusEffect(useCallback(() => { t.refresh(); }, [t.refresh]));

  if (!profile) return <Screen><Text style={{ color: colors.steel }}>Loading…</Text></Screen>;

  const splitDays = splitDaysOf(profile);
  const messages = coachEr({
    hour: new Date().getHours(),
    kcal: t.kcal, kcalTarget: profile.calorie_target,
    protein: t.protein, proteinTarget: profile.protein_target_g,
    waterMl: t.waterMl, waterTarget: profile.water_target_ml,
    streak: profile.streak_count,
    workedOutToday: t.workedOutToday,
    workedOutYesterday: t.workedOutYesterday,
    todaySplitDay: splitDays[profile.split_day_index % splitDays.length],
  });

  // Pick the mascot mood from the strongest message tone present.
  const mood = messages.some((m) => m.tone === "push")
    ? "push"
    : messages.some((m) => m.tone === "warn")
      ? "chill"
      : "happy";

  return (
    <Screen>
      <H1>Coach Er</H1>

      {/* Mascot header */}
      <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.cobaltSoft, borderColor: colors.cobaltSoft }}>
        <CoachMascot size={72} mood={mood} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: type.display, fontSize: 18, color: colors.ink }}>Coach Er</Text>
          <Text style={{ color: colors.steel, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
            Reading today's numbers — I update live as you log.
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: 12, gap: 10 }}>
        {messages.map((m) => {
          const s = TONE_STYLE[m.tone];
          return (
            <Card key={m.id} style={{ backgroundColor: s.bg, borderColor: s.bg }}>
              <Text style={{ fontFamily: type.displayMed, fontSize: 12, color: s.accent, marginBottom: 4 }}>
                {s.label.toUpperCase()}
              </Text>
              <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
            </Card>
          );
        })}
      </View>

      <Text style={{ color: colors.steel, fontSize: 12, marginTop: 20, lineHeight: 17 }}>
        Coach Er offers general fitness guidance based on your logs — it isn't medical
        advice. In v2, Coach Er becomes a full conversation.
      </Text>
    </Screen>
  );
}