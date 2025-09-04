"use client";

import { sendTransfer, TransactionResultType } from "@fogo/sessions-sdk";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { PaperPlaneIcon } from "@phosphor-icons/react/dist/ssr/PaperPlane";
import { TipJarIcon } from "@phosphor-icons/react/dist/ssr/TipJar";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import { PublicKey } from "@solana/web3.js";
import { Scanner } from "@yudiel/react-qr-scanner";
import { QRCodeSVG } from "qrcode.react";
import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  Button,
  Link,
  Dialog,
  OverlayArrow,
  Popover,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Heading,
  Form,
} from "react-aria-components";
import { mutate } from "swr";

import { amountToString, stringToAmount } from "./amount-to-string.js";
import { deserializePublicKeyMap } from "./deserialize-public-key.js";
import { errorToString } from "./error-to-string.js";
import { TextField } from "./field.js";
import { FogoWordmark } from "./fogo-wordmark.js";
import styles from "./session-button.module.css";
import { SessionLimits } from "./session-limits.js";
import type {
  EstablishedSessionState,
  SessionState,
} from "./session-provider.js";
import {
  StateType as SessionStateType,
  useSession,
  useSessionContext,
  isEstablished,
} from "./session-provider.js";
import { useToast } from "./toast.js";
import { TokenAmountInput } from "./token-amount-input.js";
import type { Token } from "./use-token-account-data.js";
import {
  getCacheKey,
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "./use-token-account-data.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const FAUCET_URL = "https://gas.zip/faucet/fogo";

export const SessionButton = ({
  requestedLimits,
}: {
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
}) => {
  const { whitelistedTokens, onStartSessionInit } = useSessionContext();
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
        prevSessionState.current.type !== SessionStateType.CheckingStoredSession
      ) {
        setSessionPanelOpen(true);
      }
      prevSessionState.current = sessionState;
    }
  }, [sessionState]);

  return (
    <>
      <Button
        ref={triggerRef}
        className={styles.sessionButton ?? ""}
        isDisabled={isLoading}
        isPending={isLoading}
        onPress={handlePress}
        data-session-panel-open={sessionPanelOpen ? "" : undefined}
      >
        {isEstablished(sessionState) ? (
          <>
            <TruncateKey keyValue={sessionState.walletPublicKey} />
            <svg
              width={8}
              height={8}
              viewBox="0 0 12 6"
              className={styles.chevron}
              fill="currentColor"
              stroke="currentColor"
            >
              <path d="M0 0 L6 6 L12 0" />
            </svg>
          </>
        ) : (
          <>
            Log in with <FogoWordmark className={styles.fogoWordmark} />
          </>
        )}
      </Button>
      <Popover
        className={styles.sessionPanelPopover ?? ""}
        offset={1}
        isOpen={sessionPanelOpen && isEstablished(sessionState)}
        triggerRef={triggerRef}
        onOpenChange={handleSessionPanelOpenChange}
      >
        <OverlayArrow>
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className={styles.overlayArrow}
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
        <Dialog className={styles.sessionPanel ?? ""}>
          <Heading slot="title" className={styles.heading}>
            <span>Your Wallet</span>
            <span>·</span>
            {isEstablished(sessionState) && (
              <CopyButton text={sessionState.walletPublicKey.toBase58()}>
                <code>
                  <TruncateKey keyValue={sessionState.walletPublicKey} />
                </code>
              </CopyButton>
            )}
          </Heading>
          {whitelistedTokens.length === 0 ? (
            <div className={styles.tabPanel}>
              {isEstablished(sessionState) && (
                <Tokens sessionState={sessionState} />
              )}
            </div>
          ) : (
            <Tabs className={styles.tabs ?? ""}>
              <TabList aria-label="Wallet" className={styles.tabList ?? ""}>
                <Tab className={styles.tab ?? ""} id="tokens">
                  Tokens
                </Tab>
                <Tab className={styles.tab ?? ""} id="session-limits">
                  Session
                </Tab>
              </TabList>
              <TabPanel className={styles.tabPanel ?? ""} id="tokens">
                {isEstablished(sessionState) && (
                  <Tokens sessionState={sessionState} />
                )}
              </TabPanel>
              <TabPanel
                className={styles.tabPanel ?? ""}
                id="session-limits"
                data-panel="session-limits"
              >
                {isEstablished(sessionState) && (
                  <SessionLimitsPanel sessionState={sessionState} />
                )}
              </TabPanel>
            </Tabs>
          )}
          <div className={styles.footer}>
            <FogoWordmark className={styles.fogoWordmark} />
            <LogoutButton
              sessionState={sessionState}
              onLogout={closeSessionPanel}
            />
          </div>
        </Dialog>
      </Popover>
    </>
  );
};

const CopyButton = ({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyAddress = useCallback(() => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }, [text]);

  return (
    <Button
      className={styles.copyWalletAddressButton ?? ""}
      onPress={copyAddress}
      isDisabled={isCopied}
      data-is-copied={isCopied ? "" : undefined}
    >
      {children}
      <div className={styles.iconContainer}>
        <CopyIcon className={styles.copyIcon} />
        <CheckIcon className={styles.checkIcon} />
      </div>
    </Button>
  );
};

const FaucetButton = ({
  sessionState,
  ...props
}: { sessionState: EstablishedSessionState } & Omit<
  ComponentProps<typeof Link>,
  "onPress"
>) => {
  const faucetUrl = useMemo(() => {
    const url = new URL(FAUCET_URL);
    url.searchParams.set("address", sessionState.walletPublicKey.toBase58());
    return url;
  }, [sessionState]);

  const showFaucet = useCallback(() => {
    const windowRef = window.open(
      faucetUrl,
      "Fogo Faucet",
      "height=800,width=700",
    );
    if (windowRef !== null) {
      const interval = setInterval(() => {
        if (windowRef.closed) {
          clearInterval(interval);
          mutate(getCacheKey(sessionState.walletPublicKey)).catch(
            (error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to update token account data", error);
            },
          );
        }
      }, 100);
    }
  }, [sessionState, faucetUrl]);
  return (
    <Link
      {...props}
      onPress={showFaucet}
      href={faucetUrl.toString()}
      target="_blank"
    />
  );
};

const LogoutButton = ({
  sessionState,
  onLogout,
}: {
  sessionState: SessionState;
  onLogout: () => void;
}) => {
  const handleLogOut = useCallback(() => {
    if (isEstablished(sessionState)) {
      sessionState.endSession();
      onLogout();
    }
  }, [sessionState, onLogout]);

  return (
    <Button
      className={styles.logoutButton ?? ""}
      onPress={handleLogOut}
      isDisabled={!isEstablished(sessionState)}
    >
      Log Out
    </Button>
  );
};

const TruncateKey = ({ keyValue }: { keyValue: PublicKey }) =>
  useMemo(() => {
    const strKey = keyValue.toBase58();
    return `${strKey.slice(0, 4)}...${strKey.slice(-4)}`;
  }, [keyValue]);

const Tokens = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const [currentScreen, setCurrentScreen] = useState<TokenScreen>(
    TokenScreen.Wallet(),
  );
  const showWallet = useCallback(() => {
    setCurrentScreen(TokenScreen.Wallet());
  }, [setCurrentScreen]);
  const showSend = useCallback(
    (opts: Parameters<typeof TokenScreen.Send>[0]) => {
      setCurrentScreen(TokenScreen.Send(opts));
    },
    [setCurrentScreen],
  );
  const showReceive = useCallback(() => {
    setCurrentScreen(TokenScreen.Receive());
  }, [setCurrentScreen]);
  const showSelectTokenToSend = useCallback(() => {
    setCurrentScreen(TokenScreen.SelectTokenToSend());
  }, [setCurrentScreen]);
  switch (currentScreen.type) {
    case TokenScreenType.SelectTokenToSend: {
      return (
        <div className={styles.selectTokenPage}>
          <Button onPress={showWallet} className={styles.backButton ?? ""}>
            <ArrowLeftIcon />
            Back
          </Button>
          <TokenList
            sessionState={sessionState}
            onPressToken={(token) => {
              showSend({
                prevScreen: TokenScreenType.SelectTokenToSend,
                amountAvailable: token.amountInWallet,
                decimals: token.decimals,
                tokenMint: token.mint,
                icon: token.image,
                symbol: token.symbol,
                tokenName: token.name,
              });
            }}
          />
        </div>
      );
    }
    case TokenScreenType.Send: {
      {
        return (
          <SendTokenScreen
            sessionState={sessionState}
            onBack={() => {
              if (
                currentScreen.prevScreen === TokenScreenType.SelectTokenToSend
              ) {
                showSelectTokenToSend();
              } else {
                showWallet();
              }
            }}
            decimals={currentScreen.decimals}
            tokenMint={currentScreen.tokenMint}
            tokenName={currentScreen.tokenName}
            icon={currentScreen.icon}
            symbol={currentScreen.symbol}
            amountAvailable={currentScreen.amountAvailable}
            onSendComplete={showWallet}
          />
        );
      }
    }
    case TokenScreenType.Receive: {
      return (
        <div className={styles.receivePage}>
          <Button onPress={showWallet} className={styles.backButton ?? ""}>
            <ArrowLeftIcon />
            Back
          </Button>
          <div className={styles.walletKey}>
            <h1 className={styles.header}>Receive Tokens</h1>
            <QRCodeSVG
              className={styles.qrCode}
              value={sessionState.walletPublicKey.toBase58()}
            />
            <CopyButton text={sessionState.walletPublicKey.toBase58()}>
              <code className={styles.walletAddress}>
                {sessionState.walletPublicKey.toBase58()}
              </code>
            </CopyButton>
          </div>
        </div>
      );
    }
    case TokenScreenType.Wallet: {
      return (
        <div className={styles.walletPage}>
          <div className={styles.topButtons}>
            <Button className={styles.topButton ?? ""} onPress={showReceive}>
              <TipJarIcon className={styles.icon} />
              <span className={styles.text}>Receive tokens</span>
            </Button>
            <Button
              className={styles.topButton ?? ""}
              onPress={showSelectTokenToSend}
            >
              <PaperPlaneIcon className={styles.icon} />
              <span className={styles.text}>Send tokens</span>
            </Button>
            <FaucetButton
              sessionState={sessionState}
              className={styles.topButton ?? ""}
            >
              <CoinsIcon className={styles.icon} />
              <span className={styles.text}>Get tokens</span>
            </FaucetButton>
          </div>
          <TokenList
            sessionState={sessionState}
            onPressSend={(token) => {
              showSend({
                prevScreen: TokenScreenType.Wallet,
                amountAvailable: token.amountInWallet,
                decimals: token.decimals,
                tokenMint: token.mint,
                icon: token.image,
                symbol: token.symbol,
                tokenName: token.name,
              });
            }}
          />
        </div>
      );
    }
  }
};

enum TokenScreenType {
  SelectTokenToSend,
  Send,
  Receive,
  Wallet,
}

const TokenScreen = {
  SelectTokenToSend: () => ({
    type: TokenScreenType.SelectTokenToSend as const,
  }),
  Send: (opts: {
    prevScreen: TokenScreenType;
    icon?: string | undefined;
    tokenName?: string | undefined;
    tokenMint: PublicKey;
    decimals: number;
    symbol?: string | undefined;
    amountAvailable: bigint;
  }) => ({ type: TokenScreenType.Send as const, ...opts }),
  Receive: () => ({ type: TokenScreenType.Receive as const }),
  Wallet: () => ({ type: TokenScreenType.Wallet as const }),
};
type TokenScreen = ReturnType<(typeof TokenScreen)[keyof typeof TokenScreen]>;

const SendTokenScreen = ({
  onBack,
  sessionState,
  tokenName,
  tokenMint,
  decimals,
  icon,
  symbol,
  amountAvailable,
  onSendComplete,
}: Omit<Parameters<typeof TokenScreen.Send>[0], "prevScreen"> & {
  sessionState: EstablishedSessionState;
  onBack: () => void;
  onSendComplete: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const doSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const recipient = data.get("recipient");
      const amount = data.get("amount");
      if (
        recipient === null ||
        amount === null ||
        typeof recipient !== "string" ||
        typeof amount !== "string"
      ) {
        throw new Error("Invalid input");
      }

      setIsLoading(true);
      sendTransfer({
        adapter: sessionState.adapter,
        walletPublicKey: sessionState.walletPublicKey,
        signMessage: sessionState.signMessage,
        mint: tokenMint,
        amount: stringToAmount(amount, decimals),
        recipient: new PublicKey(recipient),
      })
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success("Tokens sent successfully!");
            onSendComplete();
          } else {
            toast.error(
              `Failed to send tokens: ${errorToString(result.error)}`,
            );
          }
        })
        .catch((error: unknown) => {
          toast.error(`Failed to send tokens: ${errorToString(error)}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [
      decimals,
      sessionState.adapter,
      sessionState.signMessage,
      sessionState.walletPublicKey,
      tokenMint,
      onSendComplete,
      toast,
    ],
  );

  return (
    <Form onSubmit={doSubmit} className={styles.sendPage ?? ""}>
      <Button onPress={onBack} className={styles.backButton ?? ""}>
        <ArrowLeftIcon />
        Back
      </Button>
      <h2 className={styles.header}>
        {icon ? (
          <img alt="" src={icon} className={styles.tokenIcon} />
        ) : (
          <div className={styles.tokenIcon} />
        )}
        Send {tokenName ?? <TruncateKey keyValue={tokenMint} />}
      </h2>
      <div className={styles.amountInWallet}>
        {amountToString(amountAvailable, decimals)} {symbol} available
      </div>
      <TextField
        className={styles.field ?? ""}
        name="recipient"
        label="Recipient"
        isRequired
        value={recipient}
        onChange={setRecipient}
        controls={
          <Button
            className={styles.cameraButton ?? ""}
            onPress={() => {
              setShowScanner(true);
            }}
          >
            <CameraIcon weight="bold" />
            <span className={styles.label}>Scan QR Code</span>
          </Button>
        }
        validate={(value) => {
          if (value) {
            try {
              return new PublicKey(value).equals(sessionState.walletPublicKey)
                ? "You cannot send tokens to yourself"
                : undefined;
            } catch {
              return "This is not a valid public key address.";
            }
          } else {
            return;
          }
        }}
      />
      <TokenAmountInput
        className={styles.field ?? ""}
        decimals={decimals}
        label="Amount"
        name="amount"
        symbol={symbol}
        isRequired
        gt={0n}
        max={amountAvailable}
        value={amount}
        onChange={setAmount}
        controls={
          <Button
            className={styles.maxButton ?? ""}
            onPress={() => {
              setAmount(amountToString(amountAvailable, decimals));
            }}
          >
            Max
          </Button>
        }
      />
      <Button
        type="submit"
        className={styles.submitButton ?? ""}
        isPending={isLoading}
      >
        Send
      </Button>
      {showScanner && (
        <div className={styles.qrCodeScanner}>
          <Button
            className={styles.closeButton ?? ""}
            onPress={() => {
              setShowScanner(false);
            }}
          >
            <XCircleIcon weight="bold" />
            <span className={styles.label}>Close</span>
          </Button>
          <div className={styles.camera}>
            <Scanner
              classNames={{ container: styles.camera ?? "" }}
              onScan={(results) => {
                const value = results[0]?.rawValue;
                if (value) {
                  setRecipient(value);
                  setShowScanner(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </Form>
  );
};

const TokenList = ({
  sessionState,
  ...props
}: {
  sessionState: EstablishedSessionState;
} & (
  | { onPressToken: (token: Token) => void }
  | { onPressSend: (token: Token) => void }
)) => {
  const state = useTokenAccountData(sessionState);
  switch (state.type) {
    case TokenDataStateType.Error: {
      return <p>{errorToString(state.error)}</p>;
    }
    case TokenDataStateType.Loaded: {
      return state.data.tokensInWallet.length === 0 ? (
        <div className={styles.tokenListEmpty}>Your wallet is empty</div>
      ) : (
        <dl className={styles.tokenList}>
          {state.data.tokensInWallet
            .sort((a, b) => {
              if (a.name === undefined) {
                return b.name === undefined
                  ? a.mint.toString().localeCompare(b.mint.toString())
                  : 1;
              } else if (b.name === undefined) {
                return -1;
              } else {
                return a.name.toString().localeCompare(b.name.toString());
              }
            })
            .map((token) => {
              const { mint, amountInWallet, decimals, image, name, symbol } =
                token;
              const amountAsString = amountToString(amountInWallet, decimals);
              const contents = (
                <>
                  {image ? (
                    <img alt="" src={image} className={styles.tokenIcon} />
                  ) : (
                    <div className={styles.tokenIcon} />
                  )}
                  <dt className={styles.tokenName}>
                    {name ?? mint.toBase58()}
                  </dt>
                  <dd className={styles.amount}>
                    {amountAsString}{" "}
                    {symbol ?? (amountAsString === "1" ? "Token" : "Tokens")}
                  </dd>
                </>
              );
              return "onPressSend" in props ? (
                <div key={mint.toString()} className={styles.token}>
                  {contents}
                  <Button
                    className={styles.sendButton ?? ""}
                    onPress={() => {
                      props.onPressSend(token);
                    }}
                  >
                    Send
                  </Button>
                </div>
              ) : (
                <Button
                  key={mint.toString()}
                  className={styles.tokenButton ?? ""}
                  onPress={() => {
                    props.onPressToken(token);
                  }}
                >
                  {contents}
                </Button>
              );
            })}
        </dl>
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return (
        <dl className={styles.tokenList}>
          <LoadingToken />
        </dl>
      );
    }
  }
};

const LoadingToken = () => (
  <div data-is-loading="" className={styles.token}>
    <div className={styles.tokenIcon} />
    <dt className={styles.tokenName} />
    <dd className={styles.amount} />
  </div>
);

const SessionLimitsPanel = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const state = useTokenAccountData(sessionState);
  const { whitelistedTokens, enableUnlimited } = useSessionContext();

  switch (state.type) {
    case TokenDataStateType.Error: {
      return (
        <div className={styles.sessionLimitsError}>
          {errorToString(state.error)}
        </div>
      );
    }
    case TokenDataStateType.Loaded: {
      return (
        <div className={styles.sessionLimitsPanel}>
          <TimeUntilExpiration expiration={sessionState.expiration} />
          <SessionLimits
            className={styles.sessionLimits}
            tokens={whitelistedTokens}
            initialLimits={
              new Map(
                state.data.sessionLimits.map(({ mint, sessionLimit }) => [
                  mint,
                  sessionLimit,
                ]),
              )
            }
            onSubmit={
              "updateSession" in sessionState
                ? sessionState.updateSession
                : undefined
            }
            buttonText="Update limits"
            error={
              "updateSessionError" in sessionState
                ? sessionState.updateSessionError
                : undefined
            }
            {...(enableUnlimited && {
              enableUnlimited: true,
              isSessionUnlimited: !sessionState.isLimited,
            })}
          />
        </div>
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return <div className={styles.sessionLimitsLoading}>Loading...</div>;
    }
  }
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { style: "long" });

const TimeUntilExpiration = ({ expiration }: { expiration: Date }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [expired, setExpired] = useState(false);
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const update = () => {
      const interval = expiration.getTime() - Date.now();
      const args = getRelativeTimeFormatArgs(interval);
      if (args === undefined) {
        setExpired(true);
        setFormatted("Session is expired");
      } else {
        setExpired(false);
        setFormatted(
          `Session expires ${relativeTimeFormat.format(Math.floor(interval / args[0]), args[1])}`,
        );
        timeoutRef.current = setTimeout(update, args[0]);
      }
    };
    clearTimeout(timeoutRef.current);
    update();
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [expiration]);

  return (
    <div
      className={styles.sessionExpiryBanner}
      data-expired={expired ? "" : undefined}
    >
      {formatted}
    </div>
  );
};

const getRelativeTimeFormatArgs = (interval: number) => {
  if (interval > ONE_DAY_IN_MS) {
    return [ONE_DAY_IN_MS, "day"] as const;
  } else if (interval > ONE_HOUR_IN_MS) {
    return [ONE_HOUR_IN_MS, "hour"] as const;
  } else if (interval > ONE_MINUTE_IN_MS) {
    return [ONE_MINUTE_IN_MS, "minute"] as const;
  } else if (interval > ONE_SECOND_IN_MS) {
    return [ONE_SECOND_IN_MS, "second"] as const;
  } else {
    return;
  }
};
