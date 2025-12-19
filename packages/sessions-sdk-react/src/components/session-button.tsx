"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { LockIcon } from "@phosphor-icons/react/dist/ssr/Lock";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  Button as UnstyledButton,
  Dialog,
  Popover,
} from "react-aria-components";

import { deserializePublicKeyMap } from "../deserialize-public-key.js";
import {
  createStyles,
  keyframes,
  resetAllLocalRules,
} from "./component-library/css/index.js";
import { FogoLogo } from "./fogo-logo.js";
import { SessionPanel } from "./session-panel.js";
import { useSession, useSessionContext } from "../hooks/use-session.js";
import {
  StateType as SessionStateType,
  isEstablished,
} from "../session-state.js";
import { TruncateKey } from "./truncate-key.js";

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
              // eslint-disable-next-line no-console
              console.error("Error in `onStartSessionInit` callback", error);
            });
        } else if (callbackReturn !== false) {
          sessionState.establishSession(limits);
        }
      }
    }
  }, [sessionState, limits, onStartSessionInit]);
  const handleSessionPanelOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSessionPanelOpen(false);
      }
    },
    [setSessionPanelOpen],
  );
  const closeSessionPanel = useCallback(() => {
    setSessionPanelOpen(false);
  }, [setSessionPanelOpen]);
  const isLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

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
        className={classes.sessionButton}
        isDisabled={isLoading}
        isPending={isLoading}
        onPress={handlePress}
        data-session-panel-open={sessionPanelOpen ? "" : undefined}
        data-is-signed-in={isEstablished(sessionState) ? "" : undefined}
        data-compact={compact ? "" : undefined}
      >
        <div className={classes.fogoLogoContainer} aria-hidden={isLoading}>
          <FogoLogo className={classes.fogoLogo} />
        </div>
        {!compact && (
          <span className={classes.contents}>
            {isEstablished(sessionState) ? (
              <TruncateKey keyValue={sessionState.walletPublicKey} />
            ) : (
              "Sign in"
            )}
          </span>
        )}
        {compact && !isEstablished(sessionState) && (
          <LockIcon className={classes.lockIcon} />
        )}
        <div className={classes.arrowContainer}>
          <CaretDownIcon className={classes.arrow} />
        </div>
      </UnstyledButton>
      <Popover
        className={classes.sessionPanelPopover}
        offset={1}
        isOpen={sessionPanelOpen && isEstablished(sessionState)}
        triggerRef={triggerRef}
        onOpenChange={handleSessionPanelOpenChange}
      >
        <Dialog className={classes.sessionPanelDialog}>
          <SessionPanel
            className={classes.sessionPanel}
            onClose={closeSessionPanel}
          />
        </Dialog>
      </Popover>
    </>
  );
};

const { keyframe: spin } = keyframes("fogo-sessions-button-spin", () => ({
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

const { classes } = createStyles("fogo-session-button", (theme) => ({
  arrow: {
    color: theme.color.heading,
    transition: "transform 300ms",
    transformOrigin: "center",
  },
  arrowContainer: {
    display: "none",
    width: theme.spacing(6),
    "&[data-compact]": {
      paddingRight: theme.spacing(3),
      width: "auto",
    },
  },
  contents: {
    ...theme.textStyles("sm", "medium"),

    color: theme.color.heading,
    flexGrow: 1,
    textAlign: "center",
  },
  fogoLogo: {
    color: theme.colorPalette.white,
    height: theme.spacing(4),
    transition: "opacity 50ms linear",
  },
  fogoLogoContainer: {
    width: theme.spacing(8),
    height: theme.spacing(8),
    backgroundColor: theme.color.button.primary.background.normal,
    display: "grid",
    placeContent: "center",
    borderRadius: theme.borderRadius.sm,
    transition: "background-color 50ms linear",
  },
  lockIcon: {
    color: theme.color.foreground,
    fontSize: theme.fontSize.base,
  },
  sessionButton: {
    ...resetAllLocalRules(theme),
    width: theme.spacing(48),
    height: theme.spacing(10),
    padding: theme.spacing(1),
    display: "flex",
    flexFlow: "row nowrap",
    gap: theme.spacing(2),
    border: "none",
    borderRadius: theme.borderRadius.lg,
    cursor: "pointer",
    backgroundColor: theme.color["button-signin-bg"],
    outline: "2px solid transparent",
    outlineOffset: theme.spacing(0.5),
    alignItems: "center",
    transition: "background-color 50ms linear, outline-color 50ms linear",

    "&[data-hovered]": {
      backgroundColor: theme.color["button-hover"],
    },
    "&[data-pressed],&[data-session-panel-open]": {
      backgroundColor: theme.color["button-pressed"],
    },
    "&[data-is-signed-in]": {
      "& $arrowContainer": {
        display: "grid",
        placeContent: "center",

        "& $arrow": {
          fontSize: theme.spacing(4),
        },
      },

      "&[data-session-panel-open]": {
        "& $arrow": {
          transform: "rotateX(180deg)",
        },
      },
    },
    "&[data-focus-visible]": {
      "& $arrow": {
        transform: "rotateX(180deg)",
      },
    },
    "&[data-pending]": {
      backgroundColor: theme.color.button.disabled.background,
      cursor: "wait",

      "& $contents": {
        color: theme.color.button.disabled.foreground,
      },

      "& $fogoLogoContainer": {
        background: "transparent",
        position: "relative",

        "&::after": {
          content: "",
          display: "block",
          border: `1px solid ${theme.color.button.disabled.foreground}`,
          borderTopColor: "transparent",
          borderRadius: theme.borderRadius.full,
          animation: `${spin} 1s linear infinite`,
          transition: "opacity linear 100ms",
          position: "absolute",
          inset: theme.spacing(2),
        },
        "& $fogoLogo": {
          opacity: "0",
        },
      },
    },
  },
  sessionPanel: {
    boxShadow: theme.shadow.base,
  },
  sessionPanelDialog: {
    height: theme.spacing(148),
    maxHeight: "80dvh",
    outline: "none",
    width: "100%",

    ...theme.breakpointStyles("sm", {
      width: theme.spacing(88),
    }),
  },
  sessionPanelPopover: {
    ...resetAllLocalRules(theme),
    transition: "transform 400ms ease-in-out, opacity 200ms",
    zIndex: `${theme.layer.sessionPanel.toString()} !important`,

    [`@media (max-width: ${theme.breakpoints.sm})`]: {
      position: "fixed !important",
      bottom: "0 !important",
      left: "0 !important",
      right: "0 !important",
      top: "unset !important",
    },

    ...theme.breakpointStyles("sm", {
      transition: "transform 200ms, opacity 200ms",

      "&[data-entering], &[data-exiting]": {
        opacity: "0",
        transform: "var(--origin)",
      },
      '&[data-placement="bottom"]': {
        "--origin": "translateY(-8px)",
        marginTop: 6,
      },
      '&[data-placement="left"]': {
        "--origin": "translateX(8px)",
        marginRight: 6,
      },
      '&[data-placement="right"]': {
        "--origin": "translateX(-8px)",
        marginLeft: 6,
      },
      '&[data-placement="top"]': {
        "--origin": "translateY(8px)",
        marginBottom: 6,
      },
    }),

    "&[data-entering], &[data-exiting]": {
      transform: "translateY(100%)",
    },
  },
}));
