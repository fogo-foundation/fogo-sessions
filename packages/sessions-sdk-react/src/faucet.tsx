import { PublicKey } from "@solana/web3.js";
import type { ComponentProps } from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "react-aria-components";
import { mutate } from "swr";
import { z } from "zod";

import { errorToString } from "./error-to-string.js";
import styles from "./faucet.module.css";
import { ModalDialog } from "./modal-dialog.js";
import { getCacheKey } from "./use-token-account-data.js";

const FAUCET_HOST = "https://faucet.fogo.io";

type Props = { walletPublicKey: PublicKey } & Omit<
  ComponentProps<typeof ModalDialog>,
  "heading" | "message" | "children"
>;

export const Faucet = ({ walletPublicKey, ...props }: Props) => (
  <ModalDialog
    heading="Faucet"
    message={
      <>
        <p>This will send 1 testnet FOGO and 10 testnet fUSD to your wallet.</p>
        <p>Note that requests are ratelimited.</p>
        <p>Testnet tokens have no financial value.</p>
      </>
    }
    {...props}
  >
    {({ state }) => (
      <FaucetContents
        walletPublicKey={walletPublicKey}
        onSuccess={() => {
          state.close();
        }}
      />
    )}
  </ModalDialog>
);

const FaucetContents = ({
  walletPublicKey,
  onSuccess,
}: {
  walletPublicKey: PublicKey;
  onSuccess: () => void;
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [state, setState] = useState<State>(NotReady());
  const requestTokens = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage("request", FAUCET_HOST);
  }, []);
  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.origin === FAUCET_HOST) {
        const state = stateSchema.parse(event.data);
        if (state.state === StateType.Success) {
          mutate(getCacheKey(walletPublicKey)).catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to update token account data", error);
          });
          onSuccess();
        } else {
          setState(state);
        }
      }
    };
    window.addEventListener("message", receiveMessage);
    return () => {
      window.removeEventListener("message", receiveMessage);
    };
  }, [onSuccess, walletPublicKey]);

  return (
    <div
      data-ready={state.state === StateType.NotReady ? undefined : ""}
      className={styles.faucetContents}
    >
      <iframe
        title="Faucet"
        className={styles.iframe}
        ref={iframeRef}
        src={new URL(
          `/embedded/${walletPublicKey.toString()}`,
          FAUCET_HOST,
        ).toString()}
      />
      <Button className={styles.closeButton ?? ""} slot="close">
        Close
      </Button>
      <Button
        className={styles.requestTokensButton ?? ""}
        onPress={requestTokens}
        isPending={[StateType.NotReady, StateType.Loading].includes(
          state.state,
        )}
      >
        Request Tokens
      </Button>
      {state.state === StateType.Error && (
        <p className={styles.error}>{errorToString(state.error)}</p>
      )}
    </div>
  );
};

enum StateType {
  NotReady,
  Ready,
  Loading,
  Success,
  Error,
}

const stateSchema = z.union([
  z
    .strictObject({ state: z.literal("ready") })
    .transform(() => ({ state: StateType.Ready as const })),
  z
    .strictObject({ state: z.literal("loading") })
    .transform(() => ({ state: StateType.Loading as const })),
  z
    .strictObject({ state: z.literal("success"), txId: z.string() })
    .transform(({ txId }) => ({ state: StateType.Success as const, txId })),
  z
    .strictObject({ state: z.literal("error"), error: z.unknown() })
    .transform(({ error }) => ({ state: StateType.Error as const, error })),
]);

const NotReady = () => ({ state: StateType.NotReady as const });

type State = ReturnType<typeof NotReady> | z.infer<typeof stateSchema>;
