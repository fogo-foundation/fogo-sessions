import { createStyles } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";

export const { classes } = createStyles("Fogo-TextField", (theme) => ({
  labelLine: {
    ...theme.textStyles("xs", "medium"),
    display: "flex",
    flexFlow: "row nowrap",
    flexGrow: 1,
    justifyContent: "space-between",
  },

  label: {
    color: theme.color.paragraph,
    width: "100%",
  },

  labelExtra: {},

  inputGroup: {
    display: "grid",
    position: "relative",
  },

  input: {
    ...theme.textStyles("sm"),
    background: theme.color["input-bg"],
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.color.foreground,
    height: theme.spacing(8),
    outline: "3px solid transparent",
    overflow: "hidden",
    padding: theme.spacing(3),
    textBoxTrim: "none",
    textOverflow: "ellipsis",
    transition: "border-color 50ms linear, outline-color 50ms linear",
    width: "100%",

    "&::placeholder": {
      color: theme.color.muted,
      opacity: 0.5,
    },

    "&[data-hovered]": {
      borderColor: theme.color["border-hover"],
    },

    "&[data-focused]": {
      borderColor: theme.color.accent,
      outlineColor: theme.color["accent-opaque"],
    },
  },

  error: {
    ...theme.textStyles("sm", "normal"),
    background: theme.color["demo-bg"],
    border: `1px solid ${theme.color.states.error.foreground}`,
    borderRadius: theme.borderRadius.md,
    bottom: theme.spacing(10),
    boxShadow: theme.shadow.base,
    color: theme.color.states.error.foreground,
    display: "none",
    left: theme.spacing(4),
    padding: theme.spacing(3),
    position: "absolute",
  },

  overlayArrow: {
    bottom: `-${theme.spacing(3)}`,
    fill: theme.color["demo-bg"],
    left: theme.spacing(4),
    position: "absolute",
    stroke: theme.color.states.error.foreground,
  },

  textField: {
    ...resetAllLocalRules(theme),
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(3),

    "&[data-double] $input": {
      height: theme.spacing(14),
      overflow: "hidden",
      resize: "none",
      textOverflow: "unset",
    },

    "&[data-double] $error": {
      bottom: theme.spacing(16),
    },

    "&[data-disabled], &[data-pending]": {
      $input: {
        background: theme.color.button.disabled.background,

        "&::placeholder": {
          color: theme.color.button.disabled.foreground,
          opacity: 1,
        },

        "&, &[data-hovered]": {
          borderColor: theme.color.button.disabled.foreground,
        },
      },
    },

    "&[data-disabled]": {
      "&, $input": {
        cursor: "not-allowed",
      },
    },

    "&[data-pending]": {
      "&, $input": {
        cursor: "wait",
      },
    },

    "&[data-invalid] $input:not([data-focused])": {
      borderColor: theme.color.states.error.foreground,
    },

    "&[data-invalid] $inputGroup:has($input[data-hovered]), &[data-invalid] $inputGroup:has($input[data-focused])":
      {
        $error: {
          display: "block",
        },
      },
  },
}));
