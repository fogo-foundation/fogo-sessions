import { PublicKey } from "@solana/web3.js";
import type { FormEvent } from "react";
import { useState, useCallback } from "react";
import { Form } from "react-aria-components";

import { amountToString, stringToAmount } from "../amount-to-string.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import { errorToString } from "../error-to-string.js";
import { Link } from "./link.js";
import styles from "./withdraw-page.module.css";
import { useToast } from "./toast.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { useSessionContext } from "../hooks/use-session.js";
import { UsdcIcon } from "./usdc-icon.js";
import {
  StateType as TokenAccountStateType,
    useTokenAccountData,
    type Token,
} from "../hooks/use-token-account-data.js";
import { bridgeOut, TransactionResultType } from "@fogo/sessions-sdk";

const FOGO_USDC = {
  mint: new PublicKey("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v")
}

const SOLANA_USDC = {
  mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v")
}

const USDC_DECIMALS = 6;

type Props = {
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const WithdrawPage = ({ onPressBack, ...props }: Props) => {
  const tokenAccountState = useTokenAccountData(props.sessionState);

  return (
    <div className={styles.withdrawPage ?? ""}>
      <Button
        onPress={onPressBack}
        variant="outline"
        className={styles.backButton ?? ""}
      >
        Back
      </Button>
      <WithdrawForm
        {...props}
        {...tokenAccountState.type === TokenAccountStateType.Loaded
          ? { amountAvailable: getUsdcBalance(tokenAccountState.data.tokensInWallet) }
          : { isLoading: true }}
      />
    </div>
  )
};

const WithdrawForm = ({
  onSendComplete,
  sessionState,
  ...props
}: Omit<Props, "onPressBack"> & ({ isLoading?: false, amountAvailable: bigint } | { isLoading: true })) => {
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
          bridgeOut({
            context,
            sessionPublicKey: sessionState.sessionPublicKey,
            sessionKey: sessionState.sessionKey,
            walletPublicKey: sessionState.walletPublicKey,
            signMessage: sessionState.signMessage,
            fromToken: FOGO_USDC,
            toToken: SOLANA_USDC,
            amount: stringToAmount(amount, USDC_DECIMALS),
          }),
        )
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success("Tokens sent successfully!");
            onSendComplete();
          } else {
            toast.error("Failed to send tokens", errorToString(result.error));
          }
        })
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(error);
          toast.error("Failed to send tokens", errorToString(error));
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [
      sessionState.signMessage,
      sessionState.walletPublicKey,
      toast,
    ],
  );

  return (
    <Form
      className={styles.withdrawForm ?? ""}
      onSubmit={doSubmit}
    >
      <div className={styles.header}>
        <UsdcIcon className={styles.tokenIcon} />
        <h2 className={styles.tokenName}>
          Withdraw USD Coin to Solana
        </h2>
        <div className={styles.amountInWallet} data-is-loading={props.isLoading ? "" : undefined}>
          {!props.isLoading && (
            `${amountToString(props.amountAvailable, USDC_DECIMALS).toString()} USDC available`
          )}
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
            {...props.isLoading ? { isPending: true } : {
              onPress: () => {
                setAmount(amountToString(props.amountAvailable, USDC_DECIMALS));
              }
            }}
          >
            Max
          </Link>
        }
        {...props.isLoading ? { isPending: true } : {
          max: props.amountAvailable,
          isPending: isSubmitting,
        }}
      />
      <Button
        type="submit"
        variant="secondary"
        className={styles.submitButton ?? ""}
        isPending={props.isLoading || isSubmitting}
      >
        Withdraw
      </Button>
    </Form>
  )
}

const getUsdcBalance = (tokensInWallet: Token[]) =>
  tokensInWallet.find(token => token.mint.equals(FOGO_USDC.mint))?.amountInWallet ?? 0n;
