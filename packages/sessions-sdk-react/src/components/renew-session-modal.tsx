import { useCallback } from "react";
import { Heading } from "react-aria-components";

import { ModalDialog } from "./component-library/ModalDialog/index.js";
import { createStyles } from "./component-library/css/index.js";
import styles from "./renew-session-modal.module.css";
import { SessionLimits } from "./session-limits.js";
import { useSession } from "../hooks/use-session.js";
import { isCancelable, StateType } from "../session-state.js";

export const RenewSessionModal = () => {
  const sessionState = useSession();

  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && isCancelable(sessionState)) {
        sessionState.cancel();
      }
    },
    [sessionState],
  );

  const isRequestingExtendedExpiry =
    sessionState.type === StateType.RequestingExtendedExpiry ||
    (sessionState.type === StateType.UpdatingSession &&
      sessionState.previousState === StateType.RequestingExtendedExpiry);

  const isRequestingIncreasedLimits =
    sessionState.type === StateType.RequestingIncreasedLimits ||
    (sessionState.type === StateType.UpdatingSession &&
      sessionState.previousState === StateType.RequestingIncreasedLimits);

  const isOpen = isRequestingExtendedExpiry || isRequestingIncreasedLimits;

  return (
    <ModalDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      dialogClassName={classes.renewSessionModal}
    >
      {isOpen && (
        <>
          <Heading slot="title" className={classes.heading}>
            {isRequestingExtendedExpiry
              ? "Your session is expired"
              : "This trade exceeds your set limits"}
          </Heading>
          <div className={classes.message}>
            {isRequestingExtendedExpiry
              ? "Would you like to extend your session?"
              : "Would you like to increase your session limits?"}
          </div>
          <SessionLimits
            buttonText="Extend Session"
            sessionState={sessionState}
          />
        </>
      )}
    </ModalDialog>
  );
};

const { classes } = createStyles("fogo-renew-session-modal", (theme) => ({
  heading: {
    ...theme.textStyles("lg", "medium"),
    color: theme.color.heading,
  },
  message: {
    ...theme.textStyles("sm", "normal"),

    color: theme.color.paragraph,
    lineHeight: "140%",
    marginBottom: theme.spacing(4),
  },
  renewSessionModal: {
    display: "grid",
    gap: theme.spacing(6),
  },
}));
