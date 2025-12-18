import { bridgeIn, Network } from "@fogo/sessions-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Connection, PublicKey, TokenAmount } from "@solana/web3.js";
import { SolanaJSONRPCError } from "@solana/web3.js";
import { TransferState } from "@wormhole-foundation/sdk";
import type { FormEvent } from "react";
import { useState, useCallback } from "react";
import { Form } from "react-aria-components";
import type { KeyedMutator } from "swr";

import { stringToAmount } from "../amount-to-string.js";
import { errorToString } from "../error-to-string.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { EstablishedSessionState } from "../session-state.js";
import { USDC } from "../wormhole-routes.js";
import { Button } from "./component-library/Button/index.js";
import { Link } from "./component-library/Link/index.js";
import { useToast } from "./component-library/Toast/index.js";
import {
  createStyles,
  keyframes,
  theme,
} from "./component-library/css/index.js";
import { StateType, useData } from "./component-library/useData/index.js";
import { ExplorerLink, Chain } from "./explorer-link.js";
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
  <div className={classes.depositPage}>
    <Button
      onPress={onPressBack}
      variant="outline"
      className={classes.backButton}
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
    return { usdc, sol };
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
          className={classes.fetchError}
          headline="Failed to load Solana account balances"
          error={solanaBalances.error}
          reset={solanaBalances.reset}
        />
      );
    }
    case StateType.Loaded: {
      if (solanaBalances.data.sol === 0) {
        return (
          <FetchError
            className={classes.fetchError}
            headline="No SOL in your Solana wallet"
            error="You must have SOL in your Solana wallet to pay gas on Solana to transfer to Fogo."
          />
        );
      } else if (solanaBalances.data.usdc.amount === "0") {
        return (
          <FetchError
            className={classes.fetchError}
            headline="No USDC in your Solana wallet"
            error="You have no USDC on Solana to transfer to Fogo."
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
            context,
            walletPublicKey: sessionState.walletPublicKey,
            signTransaction: (tx) =>
              sessionState.solanaWallet.signTransaction(tx),
            fromToken: USDC.chains[network].solana,
            toToken: USDC.chains[network].fogo,
            amount: stringToAmount(amount, USDC.decimals),
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
                  network={network}
                  chain={Chain.Solana}
                  txHash={txHash}
                />
              ),
            );
            mutateAmountAvailable?.().catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to update Solana USDC balance", error);
            });
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
      mutateAmountAvailable,
      network,
    ],
  );

  return (
    <Form className={classes.depositForm} onSubmit={doSubmit}>
      <div className={classes.header}>
        <UsdcIcon className={classes.tokenIcon} />
        <h2 className={classes.tokenName}>
          Transfer USD Coin from Solana to Fogo
        </h2>
        <div
          className={classes.amountInWallet}
          data-is-loading={props.isLoading ? "" : undefined}
        >
          {!props.isLoading && (
            <>
              <span className={classes.amount}>
                {props.balances.usdc.uiAmountString ?? "0"}
              </span>{" "}
              USDC available
            </>
          )}
        </div>
      </div>
      <TokenAmountInput
        className={classes.field}
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
          <Link
            className={classes.action}
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
        {...(props.isLoading
          ? { isPending: true }
          : {
              max: BigInt(props.balances.usdc.amount),
              isPending: isSubmitting,
            })}
      />
      <Button
        type="submit"
        variant="secondary"
        className={classes.submitButton}
        isPending={props.isLoading === true || isSubmitting}
      >
        Transfer
      </Button>
      <Link
        className={classes.mayanLink}
        href="https://swap.mayan.finance/"
        target="_blank"
      >
        Transfer from other chains to Fogo
      </Link>
    </Form>
  );
};

const { keyframe: pulseKeyframes } = keyframes(
  "fogo-depoist-page-pulse-animation",
  () => ({
    "50%": {
      opacity: "0.5",
    },
  }),
);

const { classes } = createStyles("fogo-deposit-page", () => ({
  action: {
    whiteSpace: "nowrap",
  },
  amount: {
    wordBreak: "break-all",
  },
  amountInWallet: {
    ...theme.textStyles("sm"),
    color: theme.color.paragraph,
    height: "1em",

    "&[data-is-loading]": {
      display: "inline-block",
      background: theme.color.skeleton,
      width: theme.spacing(30),
      animation: `${pulseKeyframes} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
      borderRadius: theme.borderRadius.md,
    },
  },
  backButton: {
    left: theme.spacing(4),
    position: "absolute",
    top: theme.spacing(4),
  },
  depositForm: {
    alignItems: "center",
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(8),
    padding: `${theme.spacing(16)} ${theme.spacing(8)}`,
  },
  depositPage: {
    height: "100%",
    position: "relative",
  },
  fetchError: {
    height: "100%",
  },
  field: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(4),
    textAlign: "center",
  },
  mayanLink: {
    ...theme.textStyles("sm"),
    marginTop: `calc(${theme.spacing(2)} * -1)`,
  },
  submitButton: {},
  tokenIcon: {
    width: theme.spacing(12),
    height: theme.spacing(12),
    borderRadius: theme.borderRadius.full,
  },
  tokenName: {
    ...theme.textStyles("lg", "medium"),
    color: theme.color.heading,
  },
}));
