import type { SimpleStyleRules } from "simplestyle-js";

import { createStyles, keyframes } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";

const spinAnimation = keyframes("Fogo-Button-Spin", () => ({
  "0%": { transform: "rotate(0deg)" },
  "20%": { transform: "rotate(40deg)" },
  "80%": { transform: "rotate(320deg)" },
  "100%": { transform: "rotate(360deg)" },
})).keyframe;

export const { classes } = createStyles("Fogo-Button", (theme) => {
  type Variant = "primary" | "secondary" | "solid" | "ghost" | "outline";

  const variantStyles = {
    ghost: {
      backgroundColor: theme.color.button.ghost.background.normal,
      color: theme.color.button.ghost.foreground,
      "&[data-hovered]": {
        backgroundColor: theme.color.button.ghost.background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button.ghost.background.pressed,
      },
    },
    outline: {
      backgroundColor: theme.color.button.outline.background.normal,
      border: `1px solid ${theme.color.button.outline.border}`,
      color: theme.color.button.outline.foreground,
      "&[data-hovered]": {
        backgroundColor: theme.color.button.outline.background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button.outline.background.pressed,
      },
    },
    primary: {
      backgroundColor: theme.color.button.primary.background.normal,
      color: theme.color.button.primary.foreground,
      "&[data-hovered]": {
        backgroundColor: theme.color.button.primary.background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button.primary.background.pressed,
      },
    },
    secondary: {
      backgroundColor: theme.color.button.secondary.background.normal,
      color: theme.color.button.secondary.foreground,
      "&[data-hovered]": {
        backgroundColor: theme.color.button.secondary.background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button.secondary.background.pressed,
      },
    },
    solid: {
      backgroundColor: theme.color.button.solid.background.normal,
      color: theme.color.button.solid.foreground,
      "&[data-hovered]": {
        backgroundColor: theme.color.button.solid.background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button.solid.background.pressed,
      },
    },
  } satisfies Record<Variant, SimpleStyleRules[string]>;
  return {
    button: {
      ...resetAllLocalRules(theme),
      alignItems: "center",
      border: "none",
      cursor: "pointer",
      display: "inline-flex",
      gap: theme.spacing(1),
      justifyContent: "center",
      outline: "2px solid transparent",
      outlineOffset: theme.spacing(0.5),
      textAlign: "center",
      textDecoration: "none",
      transition: "background-color 50ms linear, outline-color 50ms linear",

      '&[data-size="sm"]': {
        ...theme.textStyles("xs", "medium"),
        borderRadius: theme.borderRadius.sm,
        gap: theme.spacing(1),
        height: theme.spacing(6),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
      },

      '&[data-size="md"]': {
        ...theme.textStyles("sm", "semibold"),
        borderRadius: theme.borderRadius.md,
        gap: theme.spacing(1),
        height: theme.spacing(8),
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
      },

      '&[data-size="lg"]': {
        ...theme.textStyles("base", "semibold"),
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing(2),
        height: theme.spacing(10),
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(4),
      },

      ...Object.fromEntries(
        (Object.keys(variantStyles) as Variant[]).map((variant) => [
          `&[data-variant="${variant}"]`,
          variantStyles[variant],
        ]),
      ),

      "&[data-focus-visible]": {
        outlineColor: theme.color.accent,
      },

      "&[data-pending], &[data-disabled]": {
        backgroundColor: theme.color.button.disabled.background,
        border: "none",
        color: theme.color.button.disabled.foreground,
      },

      "&[data-disabled]": {
        cursor: "not-allowed",
      },

      "&[data-pending]": {
        cursor: "wait",

        "&::after": {
          animation: `${spinAnimation} 1s linear infinite`,
          border: `1px solid ${theme.color.spinner}`,
          borderRadius: theme.borderRadius.full,
          borderTopColor: "transparent",
          content: '""',
          display: "block",
          height: theme.spacing(4),
          marginLeft: theme.spacing(1),
          transition: "opacity linear 100ms",
          width: theme.spacing(4),
        },
      },
    },
  };
});
