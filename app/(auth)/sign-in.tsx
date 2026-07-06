import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { Button, Card, H1, Input, Label, Screen } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import { colors, type } from "../../lib/theme";

const notify = (msg: string) =>
  Platform.OS === "web" ? window.alert(msg) : Alert.alert("Everything Fitness", msg);

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) notify(error.message);
    // Success: the root layout's auth listener routes to tabs/onboarding.
  };

  return (
    <Screen>
      <View style={{ marginTop: 48, marginBottom: 24 }}>
        <H1>Everything Fitness</H1>
        <Text style={{ color: colors.steel, marginTop: 6, fontSize: 15 }}>
          Log it. Every day. That's the whole trick.
        </Text>
      </View>
      <Card>
        <Label>Email</Label>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Label>Password</Label>
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        <Button title={busy ? "Signing in…" : "Sign in"} onPress={signIn} disabled={busy || !email || !password} />
      </Card>
      <Link href="/(auth)/sign-up" style={{ marginTop: 20, alignSelf: "center" }}>
        <Text style={{ color: colors.cobalt, fontFamily: type.displayMed }}>New here? Create an account</Text>
      </Link>
    </Screen>
  );
}
