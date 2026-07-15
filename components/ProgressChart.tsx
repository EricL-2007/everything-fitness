// Strength-progression line — a minimal, card-sized SVG chart (not a full
// dashboard): one series, cobalt throughout, a direct label only on the
// current (last) point, muted date captions instead of a full axis.
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { fmtWeight } from "../lib/fitness";
import { type, useTheme } from "../lib/theme";
import type { StrengthPoint } from "../lib/useWeekly";

export default function ProgressChart({ points, units }: {
  points: StrengthPoint[];
  units: "imperial" | "metric";
}) {
  const { colors } = useTheme();
  const width = 280;
  const height = 120;
  const padX = 14;
  const padY = 16;

  const values = points.map((p) => p.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? padX + (i / (points.length - 1)) * (width - padX * 2) : width / 2;
    const y = height - padY - ((p.weightKg - min) / span) * (height - padY * 2);
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];
  const lastPoint = points[points.length - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* recessive baseline */}
        <Line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke={colors.line} strokeWidth={1} />
        {coords.length > 1 && (
          <Polyline points={polylinePoints} fill="none" stroke={colors.cobalt} strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 5 : 4}
            fill={colors.cobalt} stroke={colors.card} strokeWidth={2} />
        ))}
      </Svg>
      {last && lastPoint && (
        <Text style={{ position: "absolute", left: Math.min(width - 60, Math.max(0, last.x - 20)), top: Math.max(0, last.y - 26), color: colors.ink, fontFamily: type.displayMed, fontSize: 13 }}>
          {fmtWeight(lastPoint.weightKg, units)}
        </Text>
      )}
      {points.length > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ color: colors.steel, fontSize: 11 }}>{points[0].date}</Text>
          <Text style={{ color: colors.steel, fontSize: 11 }}>{points[points.length - 1].date}</Text>
        </View>
      )}
    </View>
  );
}
