import { createStyles } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";

export const { classes } = createStyles("Fogo-CopyButton", (theme) => {
  const successForeground = theme.color.states.success.foreground;
  return {
    contents: {
      ...theme.textStyles("xs", "normal"),
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5),
      transition: "color 50ms linear",
      wordBreak: "break-all",
    },

    iconContainer: {
      height: theme.spacing(3),
      position: "relative",
      width: theme.spacing(3),
    },

    hintContainer: {
      height: theme.spacing(3),
      position: "relative",
    },

    copyIcon: {
      fontSize: theme.fontSize.xs,
      inset: 0,
      position: "absolute",
      transition: "opacity linear 50ms",
    },

    checkIcon: {
      color: successForeground,
      fontSize: theme.fontSize.xs,
      inset: 0,
      opacity: 0,
      position: "absolute",
      transition: "opacity linear 50ms",
    },

    copyHint: {
      fontSize: theme.fontSize.xs,
      inset: 0,
      position: "absolute",
      transition: "opacity linear 50ms",
    },

    checkHint: {
      color: successForeground,
      fontSize: theme.fontSize.xs,
      inset: 0,
      opacity: 0,
      position: "absolute",
      transition: "opacity linear 50ms",
    },

    copyButton: {
      ...resetAllLocalRules(theme),
      alignItems: "center",
      backgroundColor: theme.color["button-base"],
      border: "none",
      borderRadius: theme.borderRadius.sm,
      cursor: "copy",
      display: "grid",
      outline: "2px solid transparent",
      outlineOffset: theme.spacing(0.5),
      transition: "outline-color 50ms linear, background-color 50ms linear",

      '&[data-variant="inline"]': {
        color: theme.color.muted,
        gap: theme.spacing(0.5),
        gridTemplateColumns: "repeat(2, max-content)",
        height: theme.spacing(5),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),

        $hintContainer: {
          display: "none",
        },
      },

      '&[data-variant="expanded"]': {
        color: theme.color.paragraph,
        gap: theme.spacing(2),
        gridTemplateRows: "repeat(2, max-content)",
        padding: theme.spacing(3),

        $hintContainer: {
          $copyHint: {
            opacity: 0.5,
          },
        },

        $iconContainer: {
          display: "none",
        },
      },

      "&[data-hovered]": {
        backgroundColor: theme.color["button-hover"],
      },

      "&[data-pressed]": {
        backgroundColor: theme.color["button-pressed"],
      },

      "&[data-copied]": {
        cursor: "default",

        '&[data-variant="inline"]': {
          backgroundColor: theme.color.states.success.background,

          $contents: {
            color: successForeground,
          },
        },

        $iconContainer: {
          $checkIcon: {
            opacity: 1,
          },
          $copyIcon: {
            opacity: 0,
          },
        },

        $hintContainer: {
          $checkHint: {
            opacity: 1,
          },
          $copyHint: {
            opacity: 0,
          },
        },
      },

      "&[data-focus-visible]": {
        outlineColor: theme.color.accent,
      },
    },
  };
});
