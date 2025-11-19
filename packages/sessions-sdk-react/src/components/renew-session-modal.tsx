import { useCallback } from "react";
import { Heading } from "react-aria-components";

import type { EstablishedSessionState } from "../session-state.js";
import { ModalDialog } from "./modal-dialog.js";
import styles from "./renew-session-modal.module.css";
import { SessionLimits } from "./session-limits.js";
import { Spinner } from "./spinner.js";
import { useSessionContext, useSession } from "../hooks/use-session.js";
import {
  useTokenAccountData,
  StateType as TokenDataStateType,
} from "../hooks/use-token-account-data.js";
import { isCancelable, isUpdatable, StateType } from "../session-state.js";

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
          <RenewSessionsContents sessionState={sessionState} />
        </>
      )}
    </ModalDialog>
  );
};

const RenewSessionsContents = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const state = useTokenAccountData(sessionState);
  const { enableUnlimited, whitelistedTokens } = useSessionContext();

  switch (state.type) {
    case TokenDataStateType.Error:
    case TokenDataStateType.Loaded: {
      return (
        <SessionLimits
        whitelistedTokens={
          whitelistedTokens
        }
        userTokens={
        state.type === TokenDataStateType.Error
        ? []
        : [...state.data.tokensInWallet.map((token) => token.mint), ...state.data.sessionLimits.map((token) => token.mint)]
        }
          initialLimits={
            new Map(
              state.type === TokenDataStateType.Error
                ? undefined
                : state.data.sessionLimits.map(({ mint, sessionLimit }) => [
                    mint,
                    sessionLimit,
                  ]),
            )
          }
          onSubmit={
            isUpdatable(sessionState)
              ? (duration, limits) => {
                  sessionState.updateSession(
                    sessionState.type,
                    duration,
                    limits,
                  );
                }
              : undefined
          }
          buttonText="Extend Session"
          {...(enableUnlimited && {
            enableUnlimited: true,
            isSessionUnlimited: !sessionState.isLimited,
          })}
        />
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return <Spinner />;
    }
  }
};
