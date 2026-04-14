import type { Network } from "@fogo/sessions-sdk";
import { bridgeIn } from "@fogo/sessions-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection, PublicKey, TokenAmount } from "@solana/web3.js";
import { SolanaJSONRPCError } from "@solana/web3.js";
import { TransferState } from "@wormhole-foundation/sdk";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { Form } from "react-aria-components";
import type { KeyedMutator } from "swr";
import { stringToAmount } from "../amount-to-string.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { EstablishedSessionState } from "../session-state.js";
import { USDC } from "../wormhole-routes.js";
import { Button } from "./component-library/Button/index.js";
import { errorToString } from "./component-library/error-to-string/index.js";
import { Link } from "./component-library/Link/index.js";
import { useToast } from "./component-library/Toast/index.js";
import { StateType, useData } from "./component-library/useData/index.js";
import styles from "./deposit-page.module.css";
import { Chain, ExplorerLink } from "./explorer-link.js";
import { FetchError } from "./fetch-error.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { UsdcIcon } from "./usdc-icon.js";

type Props = {
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

type SolanaBalances = {
  usdc: Pick<TokenAmount, "amount" | "uiAmountString">;
  sol: number;
};

const NO_ACCOUNT_MESSAGE =
  "failed to get token account balance: Invalid param: could not find account";

export const DepositPage = ({ onPressBack, ...props }: Props) => (
  <div className={styles.depositPage ?? ""}>
    <Button
      className={styles.backButton ?? ""}
      onPress={onPressBack}
      variant="outline"
    >
      Back
    </Button>
    <DepositPageContents {...props} />
  </div>
);

const DepositPageContents = (props: Omit<Props, "onPressBack">) => {
  const { getSessionContext, network } = useSessionContext();
  const getSolanaBalance = useCallback(async (): Promise<SolanaBalances> => {
    const { getSolanaConnection } = await getSessionContext();
    const connection = await getSolanaConnection();
    const [usdc, sol] = await Promise.all([
      getSolanaUsdcBalance(
        connection,
        network,
        props.sessionState.walletPublicKey,
      ),
      connection.getBalance(props.sessionState.walletPublicKey),
    ]);
    return { sol, usdc };
  }, [getSessionContext, props.sessionState.walletPublicKey, network]);
  const solanaBalances = useData(
    ["solanaBalances", network, props.sessionState.walletPublicKey],
    getSolanaBalance,
    {},
  );

  switch (solanaBalances.type) {
    case StateType.Error: {
      return (
        <FetchError
          className={styles.fetchError}
          error={solanaBalances.error}
          headline="Failed to load Solana account balances"
          reset={solanaBalances.reset}
        />
      );
    }
    case StateType.Loaded: {
      if (solanaBalances.data.sol === 0) {
        return (
          <FetchError
            className={styles.fetchError}
            error="You must have SOL in your Solana wallet to pay gas on Solana to transfer to Fogo."
            headline="No SOL in your Solana wallet"
          />
        );
      } else if (solanaBalances.data.usdc.amount === "0") {
        return (
          <FetchError
            className={styles.fetchError}
            error="You have no USDC on Solana to transfer to Fogo."
            headline="No USDC in your Solana wallet"
          />
        );
      } else {
        return (
          <DepositForm
            {...props}
            balances={solanaBalances.data}
            mutateAmountAvailable={solanaBalances.mutate}
          />
        );
      }
    }
    case StateType.Loading:
    case StateType.NotLoaded: {
      return <DepositForm {...props} isLoading />;
    }
  }
};

const getSolanaUsdcBalance = async (
  connection: Connection,
  network: Network,
  walletPublicKey: PublicKey,
) => {
  try {
    const result = await connection.getTokenAccountBalance(
      getAssociatedTokenAddressSync(
        USDC.chains[network].solana.mint,
        walletPublicKey,
      ),
    );
    return result.value;
  } catch (error: unknown) {
    if (
      error instanceof SolanaJSONRPCError &&
      error.message === NO_ACCOUNT_MESSAGE
    ) {
      return {
        amount: "0",
        uiAmountString: "0",
      };
    } else {
      throw error;
    }
  }
};

const DepositForm = ({
  onSendComplete,
  sessionState,
  mutateAmountAvailable,
  ...props
}: Omit<Props, "onPressBack"> &
  (
    | {
        isLoading?: false;
        balances: SolanaBalances;
        mutateAmountAvailable: KeyedMutator<SolanaBalances>;
      }
    | {
        isLoading: true;
        balances?: undefined;
        mutateAmountAvailable?: undefined;
      }
  )) => {
  const { getSessionContext, network } = useSessionContext();
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
            amount: stringToAmount(amount, USDC.decimals),
            context,
            fromToken: USDC.chains[network].solana,
            signTransaction: (tx) =>
              sessionState.solanaWallet.signTransaction(tx),
            toToken: USDC.chains[network].fogo,
            walletPublicKey: sessionState.walletPublicKey,
          }),
        )
        .then((result) => {
          if (result.state === TransferState.Failed) {
            toast.error(
              "Failed to transfer tokens to Fogo",
              errorToString(result.error),
            );
          } else {
            const txHash =
              "originTxs" in result ? result.originTxs[0]?.txid : undefined;
            toast.success(
              "Tokens transferred to Fogo successfully!",
              txHash === undefined ? undefined : (
                <ExplorerLink
                  chain={Chain.Solana}
                  network={network}
                  txHash={txHash}
                />
              ),
            );
            mutateAmountAvailable?.().catch((error: unknown) => {
              // biome-ignore lint/suspicious/noConsole: we want to log the error
              console.error("Failed to update Solana USDC balance", error);
            });
            onSendComplete();
          }
        })
        .catch((error: unknown) => {
          // biome-ignore lint/suspicious/noConsole: we want to log the error
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
      mutateAmountAvailable,
      network,
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
          {!props.isLoading && (
            <>
              <span className={styles.amount}>
                {props.balances.usdc.uiAmountString ?? "0"}
              </span>{" "}
              USDC available
            </>
          )}
        </div>
      </div>
      <TokenAmountInput
        className={styles.field ?? ""}
        decimals={USDC.decimals}
        gt={0n}
        isRequired
        label="Amount"
        labelExtra={
          <Link
            className={styles.action ?? ""}
            {...(props.isLoading
              ? { isPending: true }
              : {
                  onPress: () => {
                    setAmount(props.balances.usdc.uiAmountString ?? "0");
                  },
                })}
          >
            Max
          </Link>
        }
        name="amount"
        onChange={setAmount}
        placeholder="Enter an amount"
        symbol="USDC"
        value={amount}
        {...(props.isLoading
          ? { isPending: true }
          : {
              isPending: isSubmitting,
              max: BigInt(props.balances.usdc.amount),
            })}
      />
      <Button
        className={styles.submitButton ?? ""}
        isPending={props.isLoading === true || isSubmitting}
        type="submit"
        variant="secondary"
      >
        Transfer
      </Button>
      <Link
        className={styles.mayanLink ?? ""}
        href="https://swap.mayan.finance/"
        target="_blank"
      >
        Transfer from other chains to Fogo
      </Link>
    </Form>
  );
};
