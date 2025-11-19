import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useLocalStorageValue, useResizeObserver } from "@react-hookz/web";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { useState, useRef, useCallback, useMemo } from "react";
import { Heading } from "react-aria-components";

import type { SessionStates } from "../session-state.js";
import type { SolanaWallet } from "../solana-wallet.js";
import { Button } from "./button.js";
import { Disclaimer } from "./disclaimer.js";
import { ModalDialog } from "./modal-dialog.js";
import { SessionLimits } from "./session-limits.js";
import styles from "./sign-in-modal.module.css";
import { useSession, useSessionContext } from "../hooks/use-session.js";
import { isCancelable, StateType } from "../session-state.js";
import { Link } from "./link.js";

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
          className={styles.selectWalletAnimationContainer}
          animate={{ height }}
        >
          <SignInModalContents
            sessionState={sessionState}
            wallets={wallets}
            privacyPolicyUrl={privacyPolicyUrl}
            termsOfServiceUrl={termsOfServiceUrl}
            setHeight={setHeight}
            onClose={() => {
              onOpenChange(false);
            }}
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

  return (
    <AnimatePresence>
      {sessionState.type === StateType.SelectingWallet ||
      sessionState.type === StateType.WalletConnecting ||
      (sessionState.type === StateType.SettingLimits &&
        whitelistedTokens.length === 0) ? (
        didAcceptDisclaimer.value ? (
          <motion.div
            key="wallets"
            initial={initialDidAcceptDisclaimer.current ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
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
              wallets={wallets}
              selectWallet={
                sessionState.type === StateType.SelectingWallet
                  ? sessionState.selectWallet
                  : undefined
              }
              cancel={onClose}
              privacyPolicyUrl={privacyPolicyUrl}
              termsOfServiceUrl={termsOfServiceUrl}
            />
          </motion.div>
        ) : (
          <motion.div
            key="disclaimer"
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
            <DisclaimerPage
              onCancel={onClose}
              onAccept={handleDidAcceptDisclaimer}
            />
          </motion.div>
        )
      ) : (
        <motion.div
          key="limits"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
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
    const { otherWallets, installedWallets } = groupBy(wallets, (wallet) =>
      (wallet.readyState === WalletReadyState.Installed ||
        wallet.readyState === WalletReadyState.Loadable) &&
      !isLoadableSolflareWallet(wallet)
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
