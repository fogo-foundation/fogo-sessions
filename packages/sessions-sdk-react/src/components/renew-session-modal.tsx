import { useCallback } from "react";
import { Heading } from "react-aria-components";
import { useSession } from "../hooks/use-session.js";
import layerStyles from "../layer.module.css";
import { isCancelable, StateType } from "../session-state.js";
import { ModalDialog } from "./component-library/ModalDialog/index.js";
import styles from "./renew-session-modal.module.css";
import { SessionLimits } from "./session-limits.js";

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
      dialogClassName={styles.renewSessionModal}
      overlayClassName={layerStyles.layerModalDialog}
    >
      {isOpen && (
        <>
          <Heading slot="title" className={styles.heading ?? ""}>
            {isRequestingExtendedExpiry
              ? "Your session is expired"
              : "This trade exceeds your set limits"}
          </Heading>
          <div className={styles.message}>
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
