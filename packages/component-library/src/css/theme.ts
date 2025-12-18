import type { SimpleStyleRules } from "simplestyle-js";

type HexColor = `#${string}`;

function assertKey<
  T extends Record<PropertyKey, unknown>,
  K extends PropertyKey,
>(map: T, key: K): asserts key is K & keyof T {
  if (!(key in map)) {
    throw new Error(`Missing key "${String(key)}" in map`);
  }
}

function hexToRgb(hex: HexColor): { b: number; g: number; r: number } {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          // eslint-disable-next-line unicorn/prefer-spread
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex: HexColor, alpha = 1): string {
  const { b, g, r } = hexToRgb(hex);
  return `rgba(${r.toString()}, ${g.toString()}, ${b.toString()}, ${alpha.toString()})`;
}

function spacing(increment: number): string {
  return `${(increment * 0.25).toString()}rem`;
}

const fontWeight = {
  black: 900,
  bold: 700,
  extrabold: 800,
  extralight: 200,
  light: 300,
  medium: 500,
  normal: 400,
  semibold: 600,
  thin: 100,
} as const;

export type FontWeightKey = keyof typeof fontWeight;

function getFontWeight(weight: FontWeightKey): number {
  assertKey(fontWeight, weight);
  return fontWeight[weight];
}

const fontSize = {
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
  "9xl": "8rem",
  base: "1rem",
  lg: "1.125rem",
  sm: "0.875rem",
  xl: "1.25rem",
  xs: "0.75rem",
  xxs: "0.6875rem",
} as const;

export type FontSizeKey = keyof typeof fontSize;

function getFontSize(size: FontSizeKey = "base"): string {
  assertKey(fontSize, size);
  return fontSize[size];
}

const letterSpacing = {
  normal: "0em",
  tight: "-0.025em",
  tighter: "-0.05em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const;

export type LetterSpacingKey = keyof typeof letterSpacing;

function getLetterSpacing(spacingKey: LetterSpacingKey = "normal"): string {
  assertKey(letterSpacing, spacingKey);
  return letterSpacing[spacingKey];
}

const borderRadius = {
  "2xl": "1rem",
  "3xl": "1.5rem",
  base: "0.25rem",
  full: "9999px",
  lg: "0.5rem",
  md: "0.375rem",
  none: "0px",
  sm: "0.125rem",
  xl: "0.75rem",
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;

function getBorderRadius(radius: BorderRadiusKey = "base"): string {
  assertKey(borderRadius, radius);
  return borderRadius[radius];
}

const colorPalette = {
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  beige: {
    50: "#f7f4f4",
    100: "#f3eded",
    200: "#e9dfdf",
    300: "#d9c8c8",
    400: "#c1a8a8",
    500: "#a98a8a",
    600: "#927070",
    700: "#795c5c",
    800: "#664e4e",
    900: "#574545",
    950: "#2d2222",
  },
  black: "#000",
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  cyan: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#083344",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  fuchsia: {
    50: "#fdf4ff",
    100: "#fae8ff",
    200: "#f5d0fe",
    300: "#f0abfc",
    400: "#e879f9",
    500: "#d946ef",
    600: "#c026d3",
    700: "#a21caf",
    800: "#86198f",
    900: "#701a75",
    950: "#4a044e",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  indigo: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b",
  },
  lime: {
    50: "#f7fee7",
    100: "#ecfccb",
    200: "#d9f99d",
    300: "#bef264",
    400: "#a3e635",
    500: "#84cc16",
    600: "#65a30d",
    700: "#4d7c0f",
    800: "#3f6212",
    900: "#365314",
    950: "#1a2e05",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },
  orange: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
    950: "#431407",
  },
  pink: {
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8",
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#ec4899",
    600: "#db2777",
    700: "#be185d",
    800: "#9d174d",
    900: "#831843",
    950: "#500724",
  },
  purple: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
    950: "#3b0764",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
    950: "#4c0519",
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  steel: {
    50: "#f8f9fc",
    100: "#f1f2f9",
    200: "#e2e3f0",
    300: "#cbcee1",
    400: "#9497b8",
    500: "#64678b",
    600: "#474a69",
    700: "#333655",
    800: "#25253e",
    900: "#27253d",
    950: "#100e23",
  },
  stone: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
    950: "#0c0a09",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#042f2e",
  },
  violet: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
  },
  white: "#fff",
  yellow: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    300: "#fde047",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
    950: "#422006",
  },
  zinc: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
} as const;

function transparentFromBlack(alpha: number): string {
  return rgba(colorPalette.black, alpha);
}

function transparentFromWhite(alpha: number): string {
  return rgba(colorPalette.white, alpha);
}

const color = {
  accent: "#66ceff",
  "accent-opaque": rgba("#66ceff", 0.1),
  background: "#27272c",
  border: "#3e3e47",
  "border-hover": "#565662",
  button: {
    disabled: {
      background: rgba("#b9bad9", 0.25),
      foreground: rgba("#b9bad9", 0.45),
    },
    ghost: {
      background: {
        hover: rgba("#b9bad9", 0.1),
        normal: "transparent",
        pressed: rgba("#c3c4d5", 0.05),
      },
      foreground: colorPalette.white,
    },
    outline: {
      background: {
        hover: rgba("#b9bad9", 0.1),
        normal: "transparent",
        pressed: rgba("#c3c4d5", 0.05),
      },
      border: rgba("#c3c4d5", 0.3),
      foreground: colorPalette.white,
    },
    primary: {
      background: {
        hover: "#f3582b",
        normal: "#ff3d00",
        pressed: "#cc3100",
      },
      foreground: colorPalette.white,
    },
    secondary: {
      background: {
        hover: "#79ccf7",
        normal: "#66ceff",
        pressed: "#52a5cc",
      },
      foreground: colorPalette.black,
    },
    solid: {
      background: {
        hover: "#f3f3f7",
        normal: colorPalette.white,
        pressed: "#ccc",
      },
      foreground: colorPalette.black,
    },
  },
  "button-base": transparentFromWhite(0.05),
  "button-hover": "#404144",
  "button-pressed": "#3a3a3b",
  "button-signin-bg": "#333",
  card: "#1f1f24",
  "card-opaque": rgba("#1f1f24", 0.6),
  "checkbox-hover": "#24252b",
  "demo-bg": "#141418",
  foreground: colorPalette.white,
  heading: transparentFromWhite(0.9),
  "image-placeholder": transparentFromWhite(0.3),
  "input-bg": "#151519",
  "modal-overlay": transparentFromBlack(0.4),
  muted: transparentFromWhite(0.65),
  paragraph: transparentFromWhite(0.8),
  "qr-code-scanner-overlay": transparentFromBlack(0.6),
  skeleton: transparentFromWhite(0.1),
  spinner: "#b9bad9",
  states: {
    error: {
      background: rgba("#ff5227", 0.3),
      foreground: "#ff5227",
    },
    success: {
      background: rgba("#38e97c", 0.15),
      foreground: "#38e97c",
    },
  },
  "utils-widget-shadow": transparentFromBlack(0.5),
  "widget-border": "#33333d",
} as const;

const breakpoints = {
  "2xl": "1536px",
  lg: "1024px",
  md: "768px",
  sm: "640px",
  xl: "1280px",
} as const;

export type BreakpointKey = keyof typeof breakpoints;

function breakpointQuery(point: BreakpointKey): string {
  return `(min-width: ${breakpoints[point]})`;
}

function breakpointStyles<T extends Record<string, unknown>>(
  point: BreakpointKey,
  styles: T,
) {
  return {
    [`@media ${breakpointQuery(point)}`]: styles,
  };
}

const shadow = {
  base: `0 4px 12px 0 ${color["utils-widget-shadow"]}`,
} as const;

export type ShadowKey = keyof typeof shadow;

function getShadow(size: ShadowKey = "base"): string {
  assertKey(shadow, size);
  return shadow[size];
}

const srOnlyStyles = {
  borderWidth: 0,
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const;

function textStyles(
  size: FontSizeKey = "base",
  weight: FontWeightKey = "normal",
): SimpleStyleRules["key"] {
  return {
    fontSize: getFontSize(size),
    fontStyle: "normal",
    fontWeight: getFontWeight(weight),
    margin: 0,
    textBoxEdge: "cap alphabetic",
    textBoxTrim: "trim-both",
  };
}

let baseLayer = 999_996;
const layer = {
  sessionPanel: baseLayer,
  modalDialog: baseLayer++,
  select: baseLayer++,
  toast: baseLayer++,
};

export const theme = {
  borderRadius,
  breakpointQuery,
  breakpointStyles,
  breakpoints,
  color,
  colorPalette,
  fontSize,
  fontWeight,
  getBorderRadius,
  getFontSize,
  getFontWeight,
  getLetterSpacing,
  getShadow,
  letterSpacing,
  layer,
  rgba,
  shadow,
  spacing,
  srOnlyStyles,
  textStyles,
} as const;

export type Theme = typeof theme;
