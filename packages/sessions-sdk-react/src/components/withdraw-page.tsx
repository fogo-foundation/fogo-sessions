import { bridgeOut, TransactionResultType } from "@fogo/sessions-sdk";
import type { FormEvent } from "react";
import { useState, useCallback } from "react";
import { Form } from "react-aria-components";

import { amountToString, stringToAmount } from "../amount-to-string.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import { errorToString } from "../error-to-string.js";
import { Link } from "./link.js";
import { useToast } from "./toast.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { UsdcIcon } from "./usdc-icon.js";
import styles from "./withdraw-page.module.css";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenAccountStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";
import { FOGO_USDC, SOLANA_USDC, USDC_DECIMALS } from "../usdc-wormhole.js";

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
        {...(tokenAccountState.type === TokenAccountStateType.Loaded
          ? {
              amountAvailable: getUsdcBalance(
                tokenAccountState.data.tokensInWallet,
              ),
            }
          : { isLoading: true })}
      />
    </div>
  );
};

const WithdrawForm = ({
  onSendComplete,
  sessionState,
  ...props
}: Omit<Props, "onPressBack"> &
  ({ isLoading?: false; amountAvailable: bigint } | { isLoading: true })) => {
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
            solanaWallet: sessionState.solanaWallet,
            fromToken: FOGO_USDC,
            toToken: SOLANA_USDC,
            amount: stringToAmount(amount, USDC_DECIMALS),
          }),
        )
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success(
              "Successful transferred tokens to your Solana wallet!",
            );
            onSendComplete();
          } else {
            toast.error(
              "Failed to transfer tokens",
              errorToString(result.error),
            );
          }
        })
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(error);
          toast.error("Failed to withdraw tokens", errorToString(error));
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
      sessionState.sessionKey,
      sessionState.sessionPublicKey,
    ],
  );

  return (
    <Form className={styles.withdrawForm ?? ""} onSubmit={doSubmit}>
      <div className={styles.header}>
        <UsdcIcon className={styles.tokenIcon} />
        <h2 className={styles.tokenName}>Transfer USD Coin to Solana</h2>
        <div
          className={styles.amountInWallet}
          data-is-loading={props.isLoading ? "" : undefined}
        >
          {!props.isLoading &&
            `${amountToString(props.amountAvailable, USDC_DECIMALS).toString()} USDC available`}
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
                    setAmount(
                      amountToString(props.amountAvailable, USDC_DECIMALS),
                    );
                  },
                })}
          >
            Max
          </Link>
        }
        {...(props.isLoading
          ? { isPending: true }
          : {
              max: props.amountAvailable,
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

const getUsdcBalance = (tokensInWallet: Token[]) =>
  tokensInWallet.find((token) => token.mint.equals(FOGO_USDC.mint))
    ?.amountInWallet ?? 0n;
