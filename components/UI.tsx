// Shared primitives. The Screen component caps content width at 560 px so the
// same layout reads as a centered column on desktop web and full-bleed on phones.
import React from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, shadow, space, type, useTheme } from "../lib/theme";

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", padding: space(5), paddingTop: insets.top + space(4), paddingBottom: space(24) }}>
      {children}
    </View>
  );
  return scroll ? (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} keyboardShouldPersistTaps="handled">{inner}</ScrollView>
  ) : (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>{inner}</View>
  );
}

export const H1 = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <Text style={{ fontFamily: type.display, fontSize: 28, color: colors.ink, letterSpacing: -0.5 }}>{children}</Text>
  );
};

export const Label = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.steel, fontSize: 13, marginBottom: 6, marginTop: space(3) }}>{children}</Text>
  );
};

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.card, padding: space(4), borderWidth: 1, borderColor: colors.line, ...shadow.card }, style]}>
      {children}
    </View>
  );
};

export function Button({ title, onPress, kind = "primary", disabled }: {
  title: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg = kind === "primary" ? colors.cobalt : kind === "danger" ? colors.coral : "transparent";
  const fg = kind === "ghost" ? colors.cobalt : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        kind === "ghost" && { borderWidth: 1, borderColor: colors.cobalt },
      ]}
    >
      <Text style={{ color: fg, fontFamily: type.displayMed, fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export const Input = (p: TextInputProps) => {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.steel}
      {...p}
      style={[
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.ink },
        p.style,
      ]}
    />
  );
};

/** Horizontal pill selector, used for goals, splits, meals, units. */
export function Pills<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>>;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)}
            style={[
              { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
              active && { backgroundColor: colors.ink, borderColor: colors.ink },
            ]}>
            <Text style={{ color: active ? colors.paper : colors.ink, fontSize: 14 }}>
              {labels?.[o] ?? o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    borderRadius: radius.control, paddingVertical: 14, alignItems: "center",
    justifyContent: "center", marginTop: space(3),
  },
});
