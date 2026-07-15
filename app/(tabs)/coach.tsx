import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSession } from "../_layout";
import { Card, H1, Input, Screen } from "../../components/UI";
import CoachMascot from "../../components/CoachMascot";
import { coachEr } from "../../lib/coach";
import { useT } from "../../lib/i18n";
import { splitDaysOf } from "../../lib/fitness";
import { supabase } from "../../lib/supabase";
import { type, useTheme } from "../../lib/theme";
import { useToday } from "../../lib/useToday";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

export default function Coach() {
  const { session, profile } = useSession();
  const { colors } = useTheme();
  const { t } = useT();
  const today = useToday(session?.user.id);
  useFocusEffect(useCallback(() => { today.refresh(); }, [today.refresh]));

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from("coach_messages").select("id, role, content")
      .eq("user_id", session.user.id).order("created_at", { ascending: true }).limit(50);
    setMessages(data ?? []);
  }, [session]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  if (!profile) return <Screen><Text style={{ color: colors.steel }}>{t("common.loading")}</Text></Screen>;

  const splitDays = splitDaysOf(profile);
  const briefing = coachEr({
    hour: new Date().getHours(),
    kcal: today.kcal, kcalTarget: profile.calorie_target,
    protein: today.protein, proteinTarget: profile.protein_target_g,
    waterMl: today.waterMl, waterTarget: profile.water_target_ml,
    streak: profile.streak_count,
    workedOutToday: today.workedOutToday,
    workedOutYesterday: today.workedOutYesterday,
    todaySplitDay: splitDays[profile.split_day_index % splitDays.length],
  });

  const toneStyle = {
    push: { bg: colors.cobaltSoft, accent: colors.cobalt, label: t("coachRules.push") },
    praise: { bg: colors.mintSoft, accent: colors.mint, label: t("coachRules.praise") },
    warn: { bg: colors.amberSoft, accent: colors.amber, label: t("coachRules.warn") },
    info: { bg: colors.card, accent: colors.steel, label: t("coachRules.info") },
  } as const;

  // Pick the mascot mood from the strongest message tone present.
  const mood = briefing.some((m) => m.tone === "push")
    ? "push"
    : briefing.some((m) => m.tone === "warn")
      ? "chill"
      : "happy";

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setChatError(false);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);
    setSending(true);
    const { data, error } = await supabase.functions.invoke("coach-chat", { body: { message: text } });
    setSending(false);
    if (error || data?.error) { setChatError(true); return; }
    setMessages((m) => [...m, { id: `local-${Date.now()}-a`, role: "assistant", content: data.reply }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Screen>
      <H1>{t("coach.title")}</H1>

      {/* Mascot header */}
      <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.cobaltSoft, borderColor: colors.cobaltSoft }}>
        <CoachMascot size={72} mood={mood} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: type.display, fontSize: 18, color: colors.ink }}>{t("coach.title")}</Text>
          <Text style={{ color: colors.steel, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
            {t("coach.subtitle")}
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: 12, gap: 10 }}>
        {briefing.map((m) => {
          const s = toneStyle[m.tone];
          return (
            <Card key={m.id} style={{ backgroundColor: s.bg, borderColor: s.bg }}>
              <Text style={{ fontFamily: type.displayMed, fontSize: 12, color: s.accent, marginBottom: 4 }}>
                {s.label.toUpperCase()}
              </Text>
              <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 21 }}>
                {t(`coachRules.${m.key}`, m.params)}
              </Text>
            </Card>
          );
        })}
      </View>

      {/* LLM chat */}
      <Card style={{ marginTop: 16 }}>
        <Text style={{ fontFamily: type.displayMed, fontSize: 15, color: colors.ink, marginBottom: 8 }}>
          {t("coach.chatTitle")}
        </Text>
        <ScrollView ref={scrollRef} style={{ maxHeight: 320 }} nestedScrollEnabled>
          {messages.length === 0 ? (
            <Text style={{ color: colors.steel, fontSize: 13, lineHeight: 19 }}>{t("coach.chatEmpty")}</Text>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.role === "user" ? colors.cobalt : colors.paper,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, maxWidth: "85%",
              }}>
                <Text style={{ color: m.role === "user" ? "#fff" : colors.ink, fontSize: 14, lineHeight: 19 }}>
                  {m.content}
                </Text>
              </View>
            ))
          )}
          {sending && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
              <ActivityIndicator size="small" color={colors.cobalt} />
              <Text style={{ color: colors.steel, fontSize: 12 }}>{t("coach.thinking")}</Text>
            </View>
          )}
          {chatError && <Text style={{ color: colors.coral, fontSize: 12, marginTop: 4 }}>{t("coach.chatError")}</Text>}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Input value={input} onChangeText={setInput} placeholder={t("coach.chatPlaceholder")}
            style={{ flex: 1 }} onSubmitEditing={send} returnKeyType="send" />
          <Pressable onPress={send} disabled={!input.trim() || sending}
            style={{ paddingHorizontal: 18, justifyContent: "center", borderRadius: 12, backgroundColor: input.trim() ? colors.cobalt : colors.line }}>
            <Text style={{ color: "#fff", fontFamily: type.displayMed }}>{t("coach.send")}</Text>
          </Pressable>
        </View>
      </Card>

      <Text style={{ color: colors.steel, fontSize: 12, marginTop: 20, lineHeight: 17 }}>
        {t("coach.disclaimer")}
      </Text>
    </Screen>
  );
}
