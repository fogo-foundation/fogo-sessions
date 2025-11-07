import { bridgeIn } from "@fogo/sessions-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { TokenAmount } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { TransferState } from "@wormhole-foundation/sdk";
import type { FormEvent } from "react";
import { useState, useCallback } from "react";
import { Form } from "react-aria-components";

import { stringToAmount } from "../amount-to-string.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import { errorToString } from "../error-to-string.js";
import styles from "./deposit-page.module.css";
import { Link } from "./link.js";
import { useToast } from "./toast.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { UsdcIcon } from "./usdc-icon.js";
import { StateType, useData } from "../hooks/use-data.js";
import { useSessionContext } from "../hooks/use-session.js";

const FOGO_USDC = {
  chain: "Fogo" as const,
  mint: new PublicKey("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("GJVgi8cwwUuyjjzM19xnT3KNYoX4pXvpp8UAS3ikgZLB"),
};

const SOLANA_USDC = {
  chain: "Solana" as const,
  mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v"),
};

const USDC_DECIMALS = 6;

type Props = {
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const DepositPage = ({ onPressBack, ...props }: Props) => {
  const { getSessionContext } = useSessionContext();
  const balance = useData(
    ["solanaUsdcBalance"],
    async () => {
      const { getSolanaConnection } = await getSessionContext();
      const connection = await getSolanaConnection();
      return connection.getTokenAccountBalance(
        getAssociatedTokenAddressSync(
          SOLANA_USDC.mint,
          props.sessionState.walletPublicKey,
        ),
      );
    },
    {},
  );

  return (
    <div className={styles.depositPage ?? ""}>
      <Button
        onPress={onPressBack}
        variant="outline"
        className={styles.backButton ?? ""}
      >
        Back
      </Button>
      <DepositForm
        {...props}
        {...(balance.type === StateType.Loaded
          ? { amountAvailable: balance.data.value }
          : { isLoading: true })}
      />
    </div>
  );
};

const DepositForm = ({
  onSendComplete,
  sessionState,
  ...props
}: Omit<Props, "onPressBack"> &
  (
    | { isLoading?: false; amountAvailable: TokenAmount }
    | { isLoading: true }
  )) => {
  const { getSessionContext } = useSessionContext();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const doSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const amount = data.get("amount");
      if (amount === null || typeof amount !== "string") {
        throw new Error("Invalid input");
      }

      setIsSubmitting(true);
      getSessionContext()
        .then((context) =>
          bridgeIn({
            context,
            walletPublicKey: sessionState.walletPublicKey,
            solanaWallet: sessionState.solanaWallet,
            fromToken: SOLANA_USDC,
            toToken: FOGO_USDC,
            amount: stringToAmount(amount, USDC_DECIMALS),
          }),
        )
        .then((result) => {
          if (result.state === TransferState.Failed) {
            toast.error(
              "Failed to transfer tokens to Fogo",
              errorToString(result.error),
            );
          } else {
            toast.success("Tokens transferred to Fogo successfully!");
            onSendComplete();
          }
        })
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(error);
          toast.error(
            "Failed to transfer tokens to Fogo",
            errorToString(error),
          );
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [
      sessionState.solanaWallet,
      sessionState.walletPublicKey,
      toast,
      getSessionContext,
      onSendComplete,
    ],
  );

  return (
    <Form className={styles.depositForm ?? ""} onSubmit={doSubmit}>
      <div className={styles.header}>
        <UsdcIcon className={styles.tokenIcon} />
        <h2 className={styles.tokenName}>
          Transfer USD Coin from Solana to Fogo
        </h2>
        <div
          className={styles.amountInWallet}
          data-is-loading={props.isLoading ? "" : undefined}
        >
          {!props.isLoading &&
            `${props.amountAvailable.uiAmountString ?? "0"} USDC available`}
        </div>
      </div>
      <TokenAmountInput
        className={styles.field ?? ""}
        decimals={USDC_DECIMALS}
        label="Amount"
        name="amount"
        symbol="USDC"
        isRequired
        gt={0n}
        value={amount}
        onChange={setAmount}
        placeholder="Enter an amount"
        labelExtra={
          <Link
            className={styles.action ?? ""}
            {...(props.isLoading
              ? { isPending: true }
              : {
                  onPress: () => {
                    setAmount(props.amountAvailable.uiAmountString ?? "0");
                  },
                })}
          >
            Max
          </Link>
        }
        {...(props.isLoading
          ? { isPending: true }
          : {
              max: BigInt(props.amountAvailable.amount),
              isPending: isSubmitting,
            })}
      />
      <Button
        type="submit"
        variant="secondary"
        className={styles.submitButton ?? ""}
        isPending={props.isLoading === true || isSubmitting}
      >
        Transfer
      </Button>
    </Form>
  );
};
