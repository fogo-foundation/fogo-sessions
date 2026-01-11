import type { SimpleStyleRules } from "simplestyle-js";
import { createStyles, keyframes } from "../styles/style-funcs.js";
import type { Variant } from "./types.js";

const buttonVariants: Variant[] = [
  "ghost",
  "outline",
  "primary",
  "secondary",
  "solid",
];

const { keyframe: spinKeyframe } = keyframes("fogo-sessions-button", () => ({
  "0%": {
    transform: "rotate(0deg)",
  },

  "20%": {
    transform: "rotate(40deg)",
  },

  "80%": {
    transform: "rotate(320deg)",
  },

  "100%": {
    transform: "rotate(360deg)",
  },
}));

export const { classes } = createStyles("fogo-sessions-button", (theme) => {
  const variantStyles: SimpleStyleRules = {};

  for (const variant of buttonVariants) {
    const styles: SimpleStyleRules["key"] = {
      backgroundColor: theme.color.button[variant].background.normal,
      color: theme.color.button[variant].foreground,

      "&[data-hovered]": {
        backgroundColor: theme.color.button[variant].background.hover,
      },
      "&[data-pressed]": {
        backgroundColor: theme.color.button[variant].background.pressed,
      },
    };

    if (variant === "outline") {
      styles.border = `1px solid ${theme.color.border}`;
    }

    variantStyles[`&[data-variant="${variant}"]`] = styles;
  }

  return {
    buttonRoot: {
      ...theme.resetStyles("local"),
      alignItems: "center",
      border: "none",
      cursor: "pointer",
      display: "inline-flex",
      justifyContent: "center",
      outline: "2px solid transparent",
      outlineOffset: theme.spacing(0.5),
      textAlign: "center",
      textDecoration: "none",
      transition: "background-color 50ms linear, outline-color 50ms linear",

      '&[data-size="sm"]': {
        ...theme.text("xs", "medium"),
        borderRadius: theme.borderRadius.base,
        gap: theme.spacing(1),
        height: theme.spacing(6),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
      },
      '&[data-size="md"]': {
        ...theme.text("sm", "semibold"),
        borderRadius: theme.borderRadius.md,
        height: theme.spacing(8),
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
        gap: theme.spacing(1),
      },
      '&[data-size="lg"]': {
        ...theme.text("base", "semibold"),
        borderRadius: theme.borderRadius.lg,
        height: theme.spacing(10),
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(4),
        gap: theme.spacing(2),
      },
      ...variantStyles,
      "&[data-focus-visible]": {
        outlineColor: theme.color.accent,
      },
      "&[data-pending], &[data-disabled]": {
        border: "none",
        backgroundColor: theme.color.button.disabled.background,
        color: theme.color.button.disabled.foreground,
      },
      "&[data-disabled]": {
        cursor: "not-allowed",
      },
      "&[data-pending]": {
        cursor: "wait",

        "&::after": {
          content: "",
          display: "block",
          width: theme.spacing(4),
          height: theme.spacing(4),
          border: `1px solid ${theme.color.spinner}`,
          borderTopColor: "transparent",
          borderRadius: theme.borderRadius.full,
          animation: `${spinKeyframe} 1s linear infinite`,
          transition: "opacity linear 100ms",
          marginLeft: theme.spacing(1),
        },
      },
    },
  };
});
