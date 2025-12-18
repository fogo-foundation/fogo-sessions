import { createStyles } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";
import { theme } from "../css/theme.js";

type ToastState = "success" | "error";

const stateStyles: Record<ToastState, string> = {
  error: theme.color.states.error.foreground,
  success: theme.color.states.success.foreground,
};

export const { classes } = createStyles("Fogo-Toast", () => ({
  toastRegion: {
    ...resetAllLocalRules(),
    bottom: theme.spacing(4),
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(3.5),
    left: theme.spacing(4),
    outline: "none",
    position: "fixed",
    right: theme.spacing(4),
    zIndex: theme.layer.toast,

    ...theme.breakpointStyles("sm", {
      bottom: "unset",
      left: "unset",
      right: theme.spacing(6),
      top: theme.spacing(6),
      width: theme.spacing(92),
    }),
  },

  toast: {
    backgroundColor: theme.color.card,
    border: `1px solid ${theme.color["widget-border"]}`,
    borderRadius: theme.getBorderRadius(),
    boxShadow: theme.getShadow(),
    display: "grid",
    gap: `${theme.spacing(3)} ${theme.spacing(1)}`,
    gridTemplateColumns: "max-content 1fr max-content",
    outline: "none",
    padding: theme.spacing(1),
    width: "100%",

    "&::before": {
      borderRadius: theme.getBorderRadius("sm"),
      content: '""',
      display: "block",
      height: "100%",
      opacity: 0.4,
      width: theme.spacing(0.5),
    },

    ...Object.fromEntries(
      (Object.keys(stateStyles) as ToastState[]).map((variant) => [
        `&[data-variant="${variant}"]`,
        {
          "&::before": {
            background: stateStyles[variant],
          },
          $title: {
            color: stateStyles[variant],
          },
        },
      ]),
    ),
  },

  toastContent: {
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(3),
    padding: `${theme.spacing(2)} ${theme.spacing(1.5)}`,
  },

  dismissButton: {},

  title: {
    ...theme.textStyles("xs", "normal"),
  },

  description: {
    ...theme.textStyles("xxs", "normal"),
    color: theme.color.paragraph,
  },
}));
