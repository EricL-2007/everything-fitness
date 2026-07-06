// Signature element: one large calorie ring with three thin macro arcs
// orbiting it. The whole day's status reads in half a second.
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, type } from "../lib/theme";

function Arc({ r, stroke, progress, size, width }: {
  r: number; stroke: string; progress: number; size: number; width: number;
}) {
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <Circle
      cx={size / 2} cy={size / 2} r={r}
      stroke={stroke} strokeWidth={width} fill="none"
      strokeDasharray={`${c * clamped} ${c}`}
      strokeLinecap="round"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  );
}

export default function TodayRing({ kcal, kcalTarget, protein, proteinTarget, carbs, carbsTarget, fat, fatTarget }: {
  kcal: number; kcalTarget: number;
  protein: number; proteinTarget: number;
  carbs: number; carbsTarget: number;
  fat: number; fatTarget: number;
}) {
  const size = 220;
  const over = kcal > kcalTarget;
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* track */}
        <Circle cx={size / 2} cy={size / 2} r={92} stroke={colors.line} strokeWidth={12} fill="none" />
        {/* calories */}
        <Arc r={92} size={size} width={12} progress={kcal / kcalTarget} stroke={over ? colors.coral : colors.cobalt} />
        {/* macro orbit arcs */}
        <Arc r={76} size={size} width={5} progress={protein / proteinTarget} stroke={colors.mint} />
        <Arc r={68} size={size} width={5} progress={carbs / carbsTarget} stroke={colors.amber} />
        <Arc r={60} size={size} width={5} progress={fat / fatTarget} stroke={colors.fat} />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontFamily: type.display, fontSize: 34, color: over ? colors.coral : colors.ink }}>
          {Math.round(kcal)}
        </Text>
        <Text style={{ color: colors.steel, fontSize: 13 }}>of {kcalTarget} kcal</Text>
      </View>
    </View>
  );
}

export function MacroLegend({ protein, proteinTarget, carbs, carbsTarget, fat, fatTarget }: {
  protein: number; proteinTarget: number; carbs: number; carbsTarget: number; fat: number; fatTarget: number;
}) {
  const Item = ({ dot, name, val, target }: { dot: string; name: string; val: number; target: number }) => (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
        <Text style={{ color: colors.steel, fontSize: 12 }}>{name}</Text>
      </View>
      <Text style={{ fontFamily: type.displayMed, fontSize: 16, color: colors.ink }}>
        {Math.round(val)}<Text style={{ color: colors.steel, fontSize: 12 }}> / {target} g</Text>
      </Text>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", marginTop: 12 }}>
      <Item dot={colors.mint} name="Protein" val={protein} target={proteinTarget} />
      <Item dot={colors.amber} name="Carbs" val={carbs} target={carbsTarget} />
      <Item dot={colors.fat} name="Fat" val={fat} target={fatTarget} />
    </View>
  );
}
