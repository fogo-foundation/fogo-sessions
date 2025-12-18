import { createStyles } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";
import { theme } from "../css/theme.js";

export const { classes } = createStyles("Fogo-Link", () => ({
  link: {
    ...resetAllLocalRules(),
    background: "transparent",
    border: "none",
    borderRadius: theme.getBorderRadius("sm"),
    color: theme.color.accent,
    cursor: "pointer",
    outline: "2px solid transparent",
    outlineOffset: theme.spacing(0.5),
    padding: 0,
    textDecoration: "none",
    transition: "color 50ms linear",

    "&[data-hovered]": {
      textDecoration: "underline",
    },

    "&[data-focus-visible]": {
      outlineColor: theme.color.accent,
    },

    "&[data-pending]": {
      color: theme.color.muted,
      cursor: "wait",
    },

    "&[data-disabled]": {
      color: theme.color.muted,
      cursor: "not-allowed",
    },
  },
}));
