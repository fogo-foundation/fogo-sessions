import { createStyles } from "../css/index.js";
import { resetAllLocalRules } from "../css/reset.js";
import { theme } from "../css/theme.js";

export const { classes } = createStyles("Fogo-ModalDialog", () => ({
  modalOverlay: {
    ...resetAllLocalRules(),
    alignItems: "start",
    backdropFilter: "blur(8px)",
    background: theme.color["modal-overlay"],
    display: "grid",
    height: "100dvh",
    justifyContent: "center",
    left: 0,
    overflow: "auto",
    position: "fixed",
    top: 0,
    width: "100dvw",
    zIndex: theme.layer.modalDialog,
  },

  modal: {
    backgroundColor: theme.color.card,
    border: `1px solid ${theme.color["widget-border"]}`,
    borderRadius: theme.getBorderRadius("xl"),
    boxShadow: theme.getShadow(),
    marginBottom: `min(10dvh, ${theme.spacing(40)})`,
    marginTop: `min(10dvh, ${theme.spacing(40)})`,
    maxWidth: "90dvw",
    outline: "none",
    padding: theme.spacing(6),
    width: theme.spacing(94),
  },

  dialog: {
    outline: "none",
  },
}));
