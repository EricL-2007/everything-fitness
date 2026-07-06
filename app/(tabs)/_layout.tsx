import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, type } from "../../lib/theme";

const icon = (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
  );

export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("◎") }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition", tabBarIcon: icon("🍗") }} />
      <Tabs.Screen name="workout" options={{ title: "Workout", tabBarIcon: icon("🏋️") }} />
      <Tabs.Screen name="coach" options={{ title: "Coach Er", tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("👤") }} />
    </Tabs>
  );
}
