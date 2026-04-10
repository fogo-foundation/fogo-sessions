import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useLocalStorageValue, useResizeObserver } from "@react-hookz/web";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Heading } from "react-aria-components";

import { useSession, useSessionContext } from "../hooks/use-session.js";
import type { SessionStates } from "../session-state.js";
import { isCancelable, StateType } from "../session-state.js";
import type { SolanaWallet } from "../solana-wallet.js";
import { Button } from "./component-library/Button/index.js";
import { Link } from "./component-library/Link/index.js";
import { ModalDialog } from "./component-library/ModalDialog/index.js";
import { Disclaimer } from "./disclaimer.js";
import { SessionLimits } from "./session-limits.js";
import styles from "./sign-in-modal.module.css";

type Props = Omit<
  ComponentProps<typeof ModalDialog>,
  "isOpen" | "onOpenChange" | "children"
> & {
  wallets: SolanaWallet[];
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
};

export const SignInModal = ({
  wallets,
  termsOfServiceUrl,
  privacyPolicyUrl,
  ...props
}: Props) => {
  const sessionState = useSession();
  const [height, setHeight] = useState(0);

  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && isCancelable(sessionState)) {
        setHeight(0);
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
          animate={{ height }}
          className={styles.selectWalletAnimationContainer}
        >
          <SignInModalContents
            onClose={() => {
              onOpenChange(false);
            }}
            privacyPolicyUrl={privacyPolicyUrl}
            sessionState={sessionState}
            setHeight={setHeight}
            termsOfServiceUrl={termsOfServiceUrl}
            wallets={wallets}
          />
        </motion.div>
      )}
    </ModalDialog>
  );
};

const SignInModalContents = ({
  sessionState,
  setHeight,
  wallets,
  termsOfServiceUrl,
  privacyPolicyUrl,
  onClose,
}: {
  sessionState:
    | SessionStates["SelectingWallet"]
    | SessionStates["WalletConnecting"]
    | SessionStates["RequestingLimits"]
    | SessionStates["SettingLimits"];
  setHeight: (newHeight: number) => void;
  wallets: SolanaWallet[];
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
  onClose: () => void;
}) => {
  const { whitelistedTokens } = useSessionContext();
  const didAcceptDisclaimer = useLocalStorageValue<boolean>(
    "fogo-sessions-disclaimer-accepted",
    { defaultValue: false },
  );
  const initialDidAcceptDisclaimer = useRef(didAcceptDisclaimer.value);
  const step1 = useRef<HTMLDivElement | null>(null);
  const step2 = useRef<HTMLDivElement | null>(null);
  const step3 = useRef<HTMLDivElement | null>(null);

  useResizeObserver(step1, (elem) => {
    if (step2.current === null && step3.current === null) {
      setHeight(elem.target.scrollHeight);
    }
  });
  useResizeObserver(step2, (elem) => {
    if (step1.current === null && step3.current === null) {
      setHeight(elem.target.scrollHeight);
    }
  });
  useResizeObserver(step3, (elem) => {
    if (step1.current === null && step2.current === null) {
      setHeight(elem.target.scrollHeight);
    }
  });

  const handleDidAcceptDisclaimer = useCallback(() => {
    didAcceptDisclaimer.set(true);
  }, [didAcceptDisclaimer]);

  const selectWalletOrDisclaimer = didAcceptDisclaimer.value ? (
    <motion.div
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      initial={initialDidAcceptDisclaimer.current ? false : { x: "100%" }}
      key="wallets"
      ref={(elem) => {
        step2.current = elem;
        if (elem) {
          if (elem.parentElement !== null) {
            elem.parentElement.style.height = `${elem.offsetHeight.toString()}px`;
          }
          setHeight(elem.offsetHeight);
        }
      }}
    >
      <WalletsPage
        cancel={onClose}
        privacyPolicyUrl={privacyPolicyUrl}
        selectWallet={
          sessionState.type === StateType.SelectingWallet
            ? sessionState.selectWallet
            : undefined
        }
        termsOfServiceUrl={termsOfServiceUrl}
        wallets={wallets}
      />
    </motion.div>
  ) : (
    <motion.div
      exit={{ x: "-100%" }}
      key="disclaimer"
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
      <DisclaimerPage onAccept={handleDidAcceptDisclaimer} onCancel={onClose} />
    </motion.div>
  );

  return (
    <AnimatePresence>
      {sessionState.type === StateType.SelectingWallet ||
      sessionState.type === StateType.WalletConnecting ||
      (sessionState.type === StateType.SettingLimits &&
        whitelistedTokens.length === 0) ? (
        selectWalletOrDisclaimer
      ) : (
        <motion.div
          animate={{ x: 0 }}
          initial={{ x: "100%" }}
          key="limits"
          ref={(elem) => {
            step3.current = elem;
            setHeight(elem?.offsetHeight ?? 0);
          }}
        >
          <LimitsPage sessionState={sessionState} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DisclaimerPage = (props: {
  onCancel: () => void;
  onAccept: () => void;
}) => (
  <Page
    heading="Welcome to Fogo Sessions!"
    message="By continuing you agree to the Fogo Sessions disclaimer."
  >
    <Disclaimer className={styles.disclaimer} />
    <div className={styles.buttons}>
      <Button onPress={props.onCancel} variant="outline">
        Close
      </Button>
      <Button onPress={props.onAccept} variant="secondary">
        Accept
      </Button>
    </div>
  </Page>
);

/**
 * Solflare wallet is always present in the available wallets even if it's not installed, but with the ready state of Loadable.
 * This is used to filter it out to avoid showing it in the list of installed wallets.
 */
const isLoadableSolflareWallet = (wallet: SolanaWallet) =>
  wallet.name === "Solflare" && wallet.readyState === WalletReadyState.Loadable;

const WalletsPage = ({
  wallets,
  selectWallet,
  cancel,
  termsOfServiceUrl,
  privacyPolicyUrl,
}: {
  wallets: SolanaWallet[];
  selectWallet?: ((wallet: SolanaWallet) => void) | undefined;
  cancel: () => void;
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
}) => {
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const { otherWallets, installedWallets } = useMemo(() => {
    const { otherWallets, installedWallets } = groupBy(wallets, (wallet) => {
      const isSolflareWalletInstalled = !isLoadableSolflareWallet(wallet);
      return (wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable) &&
        isSolflareWalletInstalled
        ? "installedWallets"
        : "otherWallets";
    });
    return {
      installedWallets: installedWallets ?? [],
      otherWallets: otherWallets ?? [],
    };
  }, [wallets]);
  return (
    <Page heading="Select a wallet" message="Select a Solana wallet to connect">
      <Button
        className={styles.closeButton ?? ""}
        onPress={cancel}
        variant="ghost"
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
            className={styles.hint ?? ""}
            href="https://solana.com/solana-wallets"
            target="_blank"
          >
            Get an SVM wallet
          </Link>
        </div>
      ) : (
        <div className={styles.wallets}>
          {installedWallets.map((wallet) => (
            <Button
              className={styles.wallet ?? ""}
              isPending={selectWallet === undefined}
              key={wallet.name}
              onPress={() => selectWallet?.(wallet)}
              variant="outline"
            >
              <div className={styles.walletNameAndIcon}>
                <img alt="" className={styles.walletIcon} src={wallet.icon} />
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
            className={styles.moreOptions ?? ""}
            data-more-options-open={moreOptionsOpen ? "" : undefined}
            onPress={() => {
              setMoreOptionsOpen((value) => !value);
            }}
            variant="ghost"
          >
            More Options <CaretDownIcon className={styles.arrow} />
          </Button>
          <AnimatePresence>
            {moreOptionsOpen && (
              <motion.div
                animate={{ height: "auto" }}
                className={styles.wallets}
                exit={{ height: 0 }}
                initial={{ height: 0 }}
              >
                {otherWallets.map((wallet) => (
                  <Button
                    className={styles.wallet ?? ""}
                    href={wallet.url}
                    isPending={selectWallet === undefined}
                    key={wallet.name}
                    target="_blank"
                    variant="outline"
                  >
                    <div className={styles.walletNameAndIcon}>
                      <img
                        alt=""
                        className={styles.walletIcon}
                        src={wallet.icon}
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
            <Link href={termsOfServiceUrl} target="_blank">
              Terms of Service
            </Link>
          )}
          {termsOfServiceUrl !== undefined &&
            privacyPolicyUrl !== undefined &&
            " and "}
          {privacyPolicyUrl !== undefined && (
            <Link href={privacyPolicyUrl} target="_blank">
              Privacy Policy
            </Link>
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
}) => (
  <Page
    heading="Session Limits"
    message="Limit how many tokens this app is allowed to interact with"
  >
    <SessionLimits
      autoFocus
      buttonText="Log in"
      className={styles.sessionLimits}
      // eslint-disable-next-line jsx-a11y/no-autofocus
      sessionState={sessionState}
    />
  </Page>
);

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
    <Heading className={styles.heading ?? ""} slot="title">
      {heading}
    </Heading>
    <div className={styles.message}>{message}</div>
    {children}
  </>
);

// Object.groupBy is not supported in iOS 14.  We don't really need many
// polyfills usually and this isn't used in a hot path, so rather setting up a
// polyfilling library let's just use a manual implementation.
const groupBy = <T, U extends string>(items: T[], match: (value: T) => U) => {
  const result: Partial<Record<U, T[]>> = {};
  for (const item of items) {
    const matchResult = match(item);
    if (result[matchResult]) {
      result[matchResult].push(item);
    } else {
      result[matchResult] = [item];
    }
  }
  return result;
};
