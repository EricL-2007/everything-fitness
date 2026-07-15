import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { useSession } from "../_layout";
import ProgressChart from "../../components/ProgressChart";
import { Card, H1, Label, Screen } from "../../components/UI";
import { useT } from "../../lib/i18n";
import { type, useTheme } from "../../lib/theme";
import { useWeekly } from "../../lib/useWeekly";

export default function Progress() {
  const { session, profile } = useSession();
  const { colors } = useTheme();
  const { t } = useT();
  const w = useWeekly(session?.user.id);
  useFocusEffect(useCallback(() => { w.refresh(); }, [w.refresh]));

  if (!profile) return <Screen><Text style={{ color: colors.steel }}>{t("common.loading")}</Text></Screen>;

  const units = profile.units ?? "imperial";

  const Tile = ({ label, value }: { label: string; value: string }) => (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontFamily: type.display, fontSize: 22, color: colors.ink }}>{value}</Text>
      <Text style={{ color: colors.steel, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );

  return (
    <Screen>
      <H1>{t("progress.title")}</H1>

      <Label>{t("progress.weeklyReport")}</Label>
      <Card style={{ flexDirection: "row" }}>
        <Tile label={t("progress.workouts")} value={String(w.workouts)} />
        <Tile label={t("progress.avgCalories")} value={String(Math.round(w.avgKcal))} />
        <Tile label={t("progress.avgProtein")} value={`${Math.round(w.avgProtein)}g`} />
        <Tile label={t("progress.streak")} value={`🔥${profile.streak_count}`} />
      </Card>

      <Label>{t("progress.strength")}</Label>
      <Card style={{ alignItems: "center" }}>
        {w.strengthPoints.length < 2 ? (
          <Text style={{ color: colors.steel, fontSize: 13, paddingVertical: 20 }}>{t("progress.noData")}</Text>
        ) : (
          <>
            <Text style={{ color: colors.steel, fontSize: 12, alignSelf: "flex-start", marginBottom: 8 }}>
              {t("progress.topSet")} · {w.topExercise}
            </Text>
            <ProgressChart points={w.strengthPoints} units={units} />
          </>
        )}
      </Card>
    </Screen>
  );
}
