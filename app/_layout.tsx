import { useFonts, Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { type, ThemeProvider, useTheme } from "../lib/theme";
import { LanguageProvider } from "../lib/i18n";

type Profile = Record<string, any> | null;
const SessionCtx = createContext<{ session: Session | null; profile: Profile; refreshProfile: () => void }>({
  session: null, profile: null, refreshProfile: () => {},
});
export const useSession = () => useContext(SessionCtx);

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { colors, scheme } = useTheme();
  const [fontsLoaded] = useFonts({ Archivo_600SemiBold, Archivo_700Bold });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const refreshProfile = async (s?: Session | null) => {
    const sess = s ?? session;
    if (!sess) { setProfile(null); return; }
    let { data, error } = await supabase.from("profiles").select("*").eq("id", sess.user.id).maybeSingle();
    if (error) { setDbError(error.message); return; }
    if (!data) {
      // Self-heal: the signup trigger didn't create a row (or the account predates
      // the schema). Create it now so the app never hangs on a missing profile.
      const displayName = sess.user.user_metadata?.display_name ?? "Athlete";
      const { error: upErr } = await supabase.from("profiles").upsert(
        { id: sess.user.id, display_name: displayName },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (upErr) { setDbError(upErr.message); return; }
      const retry = await supabase.from("profiles").select("*").eq("id", sess.user.id).maybeSingle();
      data = retry.data;
    }
    setDbError(null);
    setProfile(data ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await refreshProfile(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await refreshProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Route guard: signed out → auth; signed in but not onboarded → onboarding; else tabs
  useEffect(() => {
    if (!ready || !fontsLoaded || dbError) return;
    const segs = segments as string[];
    const inAuth = segs[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/sign-in");
    else if (session && profile && !profile.onboarded && segs[1] !== "onboarding")
      router.replace("/(auth)/onboarding");
    else if (session && profile?.onboarded && inAuth) router.replace("/(tabs)");
  }, [ready, fontsLoaded, session, profile, segments, dbError]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  // If we have a session but the database calls error out, the schema almost
  // certainly hasn't been applied. Show a real message instead of hanging.
  if (session && dbError) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 28, backgroundColor: colors.paper }}>
        <Text style={{ fontFamily: type.display, fontSize: 22, color: colors.ink }}>Database not set up yet</Text>
        <Text style={{ color: colors.steel, marginTop: 12, lineHeight: 22 }}>
          Your account works, but the app can't reach its tables. This almost always means
          the schema hasn't been run in Supabase.
        </Text>
        <Text style={{ color: colors.ink, marginTop: 16, lineHeight: 22, fontFamily: type.displayMed }}>
          Fix it in 30 seconds:
        </Text>
        <Text style={{ color: colors.steel, marginTop: 8, lineHeight: 22 }}>
          1. Open your Supabase project{"\n"}
          2. SQL Editor → New query{"\n"}
          3. Paste all of supabase/schema.sql → Run{"\n"}
          4. Reload this page
        </Text>
        <View style={{ marginTop: 20, padding: 14, backgroundColor: "#FEF2E2", borderRadius: 12 }}>
          <Text style={{ color: "#B54708", fontSize: 12, fontFamily: type.displayMed, marginBottom: 4 }}>
            RAW ERROR
          </Text>
          <Text style={{ color: "#B54708", fontSize: 12 }}>{dbError}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SessionCtx.Provider value={{ session, profile, refreshProfile }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
    </SessionCtx.Provider>
  );
}
