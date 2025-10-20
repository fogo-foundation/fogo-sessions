import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useResizeObserver } from "@react-hookz/web";
import type { MessageSignerWalletAdapterProps } from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { useState, useRef, useCallback, useMemo } from "react";
import { Heading } from "react-aria-components";

import type { SessionStates } from "../session-state.js";
import { Button } from "./button.js";
import { ModalDialog } from "./modal-dialog.js";
import { SessionLimits } from "./session-limits.js";
import styles from "./sign-in-modal.module.css";
import { useSessionContext } from "../hooks/use-session.js";
import { isCancelable, StateType } from "../session-state.js";
import { Link } from "./link.js";

type Props = Omit<
  ComponentProps<typeof ModalDialog>,
  "isOpen" | "onOpenChange" | "children"
> & {
  wallets: MessageSignerWalletAdapterProps[];
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
};

export const SignInModal = ({
  wallets,
  termsOfServiceUrl,
  privacyPolicyUrl,
  ...props
}: Props) => {
  const { sessionState, whitelistedTokens } = useSessionContext();
  const [height, setHeight] = useState(0);
  const step1 = useRef<HTMLDivElement | null>(null);
  const step2 = useRef<HTMLDivElement | null>(null);

  useResizeObserver(step1, (elem) => {
    if (step2.current === null) {
      setHeight(elem.target.scrollHeight);
    }
  });
  useResizeObserver(step2, (elem) => {
    setHeight(elem.target.scrollHeight);
  });

  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && isCancelable(sessionState)) {
        sessionState.cancel();
      }
    },
    [sessionState],
  );

  const isOpen =
    sessionState.type === StateType.SelectingWallet ||
    sessionState.type === StateType.WalletConnecting ||
    sessionState.type === StateType.RequestingLimits ||
    sessionState.type === StateType.SettingLimits;

  return (
    <ModalDialog isOpen={isOpen} onOpenChange={onOpenChange} {...props}>
      {isOpen && (
        <motion.div
          className={styles.selectWalletAnimationContainer}
          initial={false}
          {...(height !== 0 && { animate: { height } })}
        >
          <AnimatePresence>
            {sessionState.type === StateType.SelectingWallet ||
            sessionState.type === StateType.WalletConnecting ||
            (sessionState.type === StateType.SettingLimits &&
              whitelistedTokens.length === 0) ? (
              <motion.div
                key="wallets"
                exit={{ x: "-100%" }}
                ref={(elem) => {
                  step1.current = elem;
                  if (elem) {
                    if (elem.parentElement !== null) {
                      elem.parentElement.style.height = `${elem.offsetHeight.toString()}px`;
                    }
                    setHeight(elem.offsetHeight);
                  }
                }}
              >
                <WalletsPage
                  wallets={wallets}
                  selectWallet={
                    sessionState.type === StateType.SelectingWallet
                      ? sessionState.selectWallet
                      : undefined
                  }
                  cancel={sessionState.cancel}
                  privacyPolicyUrl={privacyPolicyUrl}
                  termsOfServiceUrl={termsOfServiceUrl}
                />
              </motion.div>
            ) : (
              <motion.div
                key="limits"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                ref={(elem) => {
                  step2.current = elem;
                  setHeight(elem?.offsetHeight ?? 0);
                }}
              >
                <LimitsPage sessionState={sessionState} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </ModalDialog>
  );
};

const WalletsPage = ({
  wallets,
  selectWallet,
  cancel,
  termsOfServiceUrl,
  privacyPolicyUrl,
}: {
  wallets: MessageSignerWalletAdapterProps[];
  selectWallet?:
    | ((wallet: MessageSignerWalletAdapterProps) => void)
    | undefined;
  cancel: () => void;
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
}) => {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const { otherWallets, installedWallets } = useMemo(() => {
    const { otherWallets, installedWallets } = Object.groupBy(
      wallets,
      (wallet) =>
        wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable
          ? "installedWallets"
          : "otherWallets",
    );
    return {
      otherWallets: otherWallets ?? [],
      installedWallets: installedWallets ?? [],
    };
  }, [wallets]);

  return (
    <Page heading="Select a wallet" message="Select a Solana wallet to connect">
      <Button
        variant="ghost"
        onPress={cancel}
        className={styles.closeButton ?? ""}
      >
        <XIcon />
      </Button>
      {installedWallets.length === 0 ? (
        <div className={styles.noInstalledWallets}>
          <WalletIcon className={styles.icon} />
          <span className={styles.text}>
            {"We couldn't find any available installed wallets."}
          </span>
          <Link
            href="https://solana.com/solana-wallets"
            className={styles.hint ?? ""}
            target="_blank"
          >
            Get an SVM wallet
          </Link>
        </div>
      ) : (
        <div className={styles.wallets}>
          {installedWallets.map((wallet) => (
            <Button
              key={wallet.name}
              onPress={() => selectWallet?.(wallet)}
              variant="outline"
              className={styles.wallet ?? ""}
              isPending={selectWallet === undefined}
            >
              <div className={styles.walletNameAndIcon}>
                <img src={wallet.icon} alt="" className={styles.walletIcon} />
                {wallet.name}
              </div>
              <div />
            </Button>
          ))}
        </div>
      )}
      {otherWallets.length > 0 && (
        <div className={styles.moreOptionsContainer}>
          <Button
            variant="ghost"
            className={styles.moreOptions ?? ""}
            onPress={() => {
              setMoreOptionsOpen((value) => !value);
            }}
            data-more-options-open={moreOptionsOpen ? "" : undefined}
          >
            More Options <CaretDownIcon className={styles.arrow} />
          </Button>
          <AnimatePresence>
            {moreOptionsOpen && (
              <motion.div
                className={styles.wallets}
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
              >
                {otherWallets.map((wallet) => (
                  <Button
                    key={wallet.name}
                    href={wallet.url}
                    target="_blank"
                    variant="outline"
                    className={styles.wallet ?? ""}
                    isPending={selectWallet === undefined}
                  >
                    <div className={styles.walletNameAndIcon}>
                      <img
                        src={wallet.icon}
                        alt=""
                        className={styles.walletIcon}
                      />
                      {wallet.name}
                    </div>
                    <div />
                  </Button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {(termsOfServiceUrl !== undefined || privacyPolicyUrl !== undefined) && (
        <div className={styles.legal}>
          By connecting your wallet, you agree to our{" "}
          {termsOfServiceUrl !== undefined && (
            <Link href={termsOfServiceUrl}>Terms of Service</Link>
          )}
          {termsOfServiceUrl !== undefined &&
            privacyPolicyUrl !== undefined &&
            " and "}
          {privacyPolicyUrl !== undefined && (
            <Link href={privacyPolicyUrl}>Privacy Policy</Link>
          )}
        </div>
      )}
    </Page>
  );
};

const LimitsPage = ({
  sessionState,
}: {
  sessionState:
    | SessionStates["RequestingLimits"]
    | SessionStates["SettingLimits"];
}) => {
  const { whitelistedTokens, enableUnlimited, defaultRequestedLimits } =
    useSessionContext();

  return (
    <Page
      heading="Session Limits"
      message="Limit how many tokens this app is allowed to interact with"
    >
      <SessionLimits
        enableUnlimited={enableUnlimited}
        tokens={whitelistedTokens}
        onSubmit={
          sessionState.type === StateType.RequestingLimits
            ? sessionState.submitLimits
            : undefined
        }
        initialLimits={
          (sessionState.type === StateType.RequestingLimits
            ? sessionState.requestedLimits
            : undefined) ??
          defaultRequestedLimits ??
          new Map()
        }
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
    </Page>
  );
};

const Page = ({
  heading,
  message,
  children,
}: {
  heading: ReactNode;
  message: ReactNode;
  children: ReactNode;
}) => (
  <>
    <Heading slot="title" className={styles.heading ?? ""}>
      {heading}
    </Heading>
    <div className={styles.message}>{message}</div>
    {children}
  </>
);
