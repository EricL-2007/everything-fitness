import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { Button, Card, H1, Input, Label, Screen } from "../../components/UI";
import { supabase } from "../../lib/supabase";
import { colors, type } from "../../lib/theme";

const notify = (msg: string) =>
  Platform.OS === "web" ? window.alert(msg) : Alert.alert("Everything Fitness", msg);

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() || "Athlete" } },
    });
    setBusy(false);
    if (error) return notify(error.message);
    notify("Account created. If email confirmation is on, check your inbox — otherwise you're in.");
  };

  return (
    <Screen>
      <View style={{ marginTop: 48, marginBottom: 24 }}>
        <H1>Create your account</H1>
      </View>
      <Card>
        <Label>Name</Label>
        <Input value={name} onChangeText={setName} placeholder="Eric" />
        <Label>Email</Label>
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Label>Password</Label>
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="8+ characters" />

        <Pressable onPress={() => setAgreed(!agreed)} style={{ flexDirection: "row", gap: 10, marginTop: 16, alignItems: "flex-start" }}>
          <View style={{
            width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, marginTop: 1,
            borderColor: agreed ? colors.cobalt : colors.line,
            backgroundColor: agreed ? colors.cobalt : "transparent",
            alignItems: "center", justifyContent: "center",
          }}>
            {agreed && <Text style={{ color: "#fff", fontSize: 13 }}>✓</Text>}
          </View>
          <Text style={{ color: colors.steel, fontSize: 13, flex: 1, lineHeight: 18 }}>
            I'm 13 or older and understand Everything Fitness provides general fitness
            information, not medical advice. Consult a physician before starting a new
            diet or training program.
          </Text>
        </Pressable>

        <Button title={busy ? "Creating…" : "Create account"} onPress={signUp}
          disabled={busy || !email || password.length < 8 || !agreed} />
      </Card>
      <Link href="/(auth)/sign-in" style={{ marginTop: 20, alignSelf: "center" }}>
        <Text style={{ color: colors.cobalt, fontFamily: type.displayMed }}>Already have an account? Sign in</Text>
      </Link>
    </Screen>
  );
}
