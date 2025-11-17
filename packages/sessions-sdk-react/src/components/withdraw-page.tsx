import {
  bridgeOut,
  Network,
  TransactionResultType,
  getBridgeOutFee,
} from "@fogo/sessions-sdk";
import type { FormEvent } from "react";
import { Suspense, useState, useCallback, useMemo, use } from "react";
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
import { USDC } from "../wormhole-routes.js";
import { ExplorerLink } from "./explorer-link.js";

type Props = {
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const WithdrawPage = ({ onPressBack, ...props }: Props) => {
  const { network } = useSessionContext();
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
                network,
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
  const { getSessionContext, network } = useSessionContext();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const feeConfig = useMemo(
    () => getSessionContext().then((context) => getBridgeOutFee(context)),
    [getSessionContext],
  );

  const doSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const amount = data.get("amount");
      if (amount === null || typeof amount !== "string") {
        throw new Error("Invalid input");
      }

      setIsSubmitting(true);
      Promise.all([getSessionContext(), feeConfig])
        .then(([context, feeConfig]) =>
          bridgeOut({
            context,
            sessionPublicKey: sessionState.sessionPublicKey,
            sessionKey: sessionState.sessionKey,
            walletPublicKey: sessionState.walletPublicKey,
            solanaWallet: sessionState.solanaWallet,
            fromToken: USDC.chains[network].fogo,
            toToken: USDC.chains[network].solana,
            amount: stringToAmount(amount, USDC.decimals),
            feeConfig,
          }),
        )
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success(
              "Successful transferred tokens to your Solana wallet!",
              <ExplorerLink network={network} txHash={result.signature} />,
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
      feeConfig,
      network,
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
            `${amountToString(props.amountAvailable, USDC.decimals).toString()} USDC available`}
        </div>
      </div>
      <TokenAmountInput
        className={styles.field ?? ""}
        decimals={USDC.decimals}
        label="Amount"
        name="amount"
        symbol="USDC"
        isRequired
        gt={0n}
        value={amount}
        onChange={setAmount}
        placeholder="Enter an amount"
        labelExtra={
          <Suspense
            fallback={
              <Link className={styles.action ?? ""} isDisabled>
                Max
              </Link>
            }
          >
            <MaxButton
              feeConfig={feeConfig}
              {...(props.isLoading
                ? { isPending: true }
                : {
                    setAmount: ({ fee, mint: feeMint }) => {
                      setAmount(
                        amountToString(
                          feeMint.equals(USDC.chains[network].fogo.mint)
                            ? props.amountAvailable - fee
                            : props.amountAvailable,
                          USDC.decimals,
                        ),
                      );
                    },
                  })}
            />
          </Suspense>
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
      <div className={styles.fee}>
        Fee:{" "}
        <Suspense fallback={<span className={styles.skeleton} />}>
          <FeeAmount feeConfig={feeConfig} />
        </Suspense>
      </div>
    </Form>
  );
};

const getUsdcBalance = (network: Network, tokensInWallet: Token[]) =>
  tokensInWallet.find((token) =>
    token.mint.equals(USDC.chains[network].fogo.mint),
  )?.amountInWallet ?? 0n;

const MaxButton = ({
  feeConfig,
  ...props
}: {
  feeConfig: ReturnType<typeof getBridgeOutFee>;
} & (
  | { isPending: true }
  | {
      isPending?: false | undefined;
      setAmount: (
        feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>,
      ) => void;
    }
)) => {
  const resolvedConfig = use(feeConfig);
  return (
    <Link
      className={styles.action ?? ""}
      {...(props.isPending
        ? { isPending: true }
        : {
            onPress: () => {
              props.setAmount(resolvedConfig);
            },
          })}
    >
      Max
    </Link>
  );
};

const FeeAmount = ({
  feeConfig,
}: {
  feeConfig: ReturnType<typeof getBridgeOutFee>;
}) => {
  const { fee, decimals, symbolOrMint } = use(feeConfig);
  return `${amountToString(fee, decimals)} ${symbolOrMint}`;
};
