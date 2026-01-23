"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { LockIcon } from "@phosphor-icons/react/dist/ssr/Lock";
import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  Popover,
  Button as UnstyledButton,
} from "react-aria-components";

import { deserializePublicKeyMap } from "../deserialize-public-key.js";
import { useSession, useSessionContext } from "../hooks/use-session.js";
import {
  isEstablished,
  isWalletLoading,
  StateType as SessionStateType,
} from "../session-state.js";
import { DisplayAddress } from "./display-address.js";
import { FogoLogo } from "./fogo-logo.js";
import styles from "./session-button.module.css";
import { SessionPanel } from "./session-panel.js";

type Props = {
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
  compact?: boolean | undefined;
};

export const SessionButton = ({ requestedLimits, compact }: Props) => {
  const { onStartSessionInit, showBridgeIn } = useSessionContext();
  const sessionState = useSession();
  const prevSessionState = useRef(sessionState);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const limits = useMemo(
    () =>
      requestedLimits === undefined
        ? undefined
        : deserializePublicKeyMap(requestedLimits),
    [requestedLimits],
  );
  const handlePress = useCallback(() => {
    if (isEstablished(sessionState)) {
      setSessionPanelOpen(true);
    } else if (sessionState.type === SessionStateType.NotEstablished) {
      if (onStartSessionInit === undefined) {
        sessionState.establishSession(limits);
      } else {
        const callbackReturn = onStartSessionInit();
        if (callbackReturn instanceof Promise) {
          callbackReturn
            .then((shouldStartSession) => {
              if (shouldStartSession !== false) {
                sessionState.establishSession(limits);
              }
            })
            .catch((error: unknown) => {
              // biome-ignore lint/suspicious/noConsole: we want to log the error
              console.error("Error in `onStartSessionInit` callback", error);
            });
        } else if (callbackReturn !== false) {
          sessionState.establishSession(limits);
        }
      }
    }
  }, [sessionState, limits, onStartSessionInit]);

  const handleSessionPanelOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSessionPanelOpen(false);
    }
  }, []);

  const closeSessionPanel = useCallback(() => {
    setSessionPanelOpen(false);
  }, []);
  const isLoading = isWalletLoading(sessionState);

  useEffect(() => {
    if (sessionState.type !== prevSessionState.current.type) {
      if (
        isEstablished(sessionState) &&
        !isEstablished(prevSessionState.current) &&
        prevSessionState.current.type !==
          SessionStateType.CheckingStoredSession &&
        !localStorage.getItem("fogo-session-widget-shown")
      ) {
        // Only show the widget automatically on first connection
        setSessionPanelOpen(true);
        localStorage.setItem("fogo-session-widget-shown", "true");
      }
      prevSessionState.current = sessionState;
    }
  }, [sessionState]);

  useEffect(() => {
    if (showBridgeIn) {
      setSessionPanelOpen(true);
    }
  }, [showBridgeIn]);

  return (
    <>
      <UnstyledButton
        ref={triggerRef}
        className={styles.sessionButton ?? ""}
        isDisabled={isLoading}
        isPending={isLoading}
        onPress={handlePress}
        data-session-panel-open={sessionPanelOpen ? "" : undefined}
        data-is-signed-in={isEstablished(sessionState) ? "" : undefined}
        data-compact={compact ? "" : undefined}
      >
        <div className={styles.fogoLogoContainer} aria-hidden={isLoading}>
          <FogoLogo className={styles.fogoLogo} />
        </div>
        {!compact && (
          <span className={styles.contents}>
            {isEstablished(sessionState) ? (
              <DisplayAddress address={sessionState.walletPublicKey} />
            ) : (
              "Sign in"
            )}
          </span>
        )}
        {compact && !isEstablished(sessionState) && (
          <LockIcon className={styles.lockIcon} />
        )}
        <div className={styles.arrowContainer}>
          <CaretDownIcon className={styles.arrow} />
        </div>
      </UnstyledButton>
      <Popover
        className={styles.sessionPanelPopover ?? ""}
        offset={1}
        isOpen={sessionPanelOpen && isEstablished(sessionState)}
        triggerRef={triggerRef}
        onOpenChange={handleSessionPanelOpenChange}
      >
        <Dialog className={styles.sessionPanelDialog ?? ""}>
          <SessionPanel
            className={styles.sessionPanel}
            onClose={closeSessionPanel}
          />
        </Dialog>
      </Popover>
    </>
  );
};
