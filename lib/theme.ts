// Everything Fitness design tokens — clean + minimal, athletic.
// The v4 RPG section will get its own dark sub-theme; keep it out of here.

export const colors = {
  paper: "#FAFAF8",   // app background
  card: "#FFFFFF",
  ink: "#16181D",     // primary text
  steel: "#667085",   // secondary text
  line: "#E8E8E4",    // hairline borders
  cobalt: "#2447F0",  // primary action
  cobaltSoft: "#E9EDFE",
  mint: "#17B26A",    // success, streaks, protein
  mintSoft: "#E4F7EE",
  amber: "#F79009",   // warnings, carbs
  amberSoft: "#FEF2E2",
  coral: "#F04438",   // over-target, destructive
  fat: "#8B5CF6",     // fat macro accent
  water: "#0BA5EC",
};

export const type = {
  display: "Archivo_700Bold",       // big numbers, screen titles
  displayMed: "Archivo_600SemiBold",
  body: undefined as string | undefined, // system font
};

export const space = (n: number) => n * 4;

export const radius = { card: 16, pill: 999, control: 12 };

export const shadow = {
  card: {
    shadowColor: "#16181D",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
