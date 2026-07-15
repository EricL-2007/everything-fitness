import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useT } from "../../lib/i18n";
import { type, useTheme } from "../../lib/theme";

const icon = (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
  );

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.steel,
        tabBarLabelStyle: { fontFamily: type.displayMed, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.today"), tabBarIcon: icon("◎") }} />
      <Tabs.Screen name="nutrition" options={{ title: t("tabs.nutrition"), tabBarIcon: icon("🍗") }} />
      <Tabs.Screen name="workout" options={{ title: t("tabs.workout"), tabBarIcon: icon("🏋️") }} />
      <Tabs.Screen name="coach" options={{ title: t("tabs.coach"), tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), tabBarIcon: icon("📈") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: icon("👤") }} />
    </Tabs>
  );
}
