// Coach Er — a simple, friendly cartoon face. Not detailed on purpose: a round
// head, a headband, eyes, and a smile. Colors come from the theme so it stays
// on-brand. `mood` lightly changes the expression.
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { View } from "react-native";
import { colors } from "../lib/theme";

export default function CoachMascot({ size = 72, mood = "happy" }: {
  size?: number;
  mood?: "happy" | "push" | "chill";
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        {/* head */}
        <Circle cx="50" cy="52" r="34" fill="#FFE0B2" stroke={colors.ink} strokeWidth="3" />
        {/* ears */}
        <Circle cx="16" cy="52" r="6" fill="#FFE0B2" stroke={colors.ink} strokeWidth="3" />
        <Circle cx="84" cy="52" r="6" fill="#FFE0B2" stroke={colors.ink} strokeWidth="3" />
        {/* headband */}
        <Path d="M18 34 Q50 20 82 34 L82 42 Q50 30 18 42 Z" fill={colors.cobalt} stroke={colors.ink} strokeWidth="3" strokeLinejoin="round" />
        <Rect x="46" y="24" width="8" height="8" rx="2" fill={colors.mint} stroke={colors.ink} strokeWidth="2" />
        {/* eyes */}
        {mood === "chill" ? (
          <>
            <Path d="M34 52 Q39 49 44 52" stroke={colors.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
            <Path d="M56 52 Q61 49 66 52" stroke={colors.ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <Circle cx="39" cy="52" r="4.5" fill={colors.ink} />
            <Circle cx="61" cy="52" r="4.5" fill={colors.ink} />
            <Circle cx="40.5" cy="50.5" r="1.5" fill="#fff" />
            <Circle cx="62.5" cy="50.5" r="1.5" fill="#fff" />
          </>
        )}
        {/* eyebrows for the "push" pep-talk mood */}
        {mood === "push" && (
          <>
            <Path d="M33 44 L45 47" stroke={colors.ink} strokeWidth="3" strokeLinecap="round" />
            <Path d="M67 44 L55 47" stroke={colors.ink} strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {/* mouth */}
        {mood === "push" ? (
          <Path d="M40 68 Q50 76 60 68" stroke={colors.ink} strokeWidth="3.5" fill="#fff" strokeLinecap="round" />
        ) : (
          <Path d="M39 66 Q50 74 61 66" stroke={colors.ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
      </Svg>
    </View>
  );
}