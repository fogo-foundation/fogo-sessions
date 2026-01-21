import type { Network } from "@fogo/sessions-sdk";
import {
  bridgeOut,
  getBridgeOutFee,
  TransactionResultType,
} from "@fogo/sessions-sdk";
import type { FormEvent, FormEventHandler } from "react";
import { useCallback, useMemo, useState } from "react";
import { Form } from "react-aria-components";

import { amountToString, stringToAmount } from "../amount-to-string.js";
import { errorToString } from "../error-to-string.js";
import { usePrice } from "../hooks/use-price.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import { useTokenAccountData } from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import { signWithWallet } from "../solana-wallet.js";
import { USDC } from "../wormhole-routes.js";
import { Button } from "./component-library/Button/index.js";
import { Link } from "./component-library/Link/index.js";
import { useToast } from "./component-library/Toast/index.js";
import { StateType, useData } from "./component-library/useData/index.js";
import { ExplorerLink } from "./explorer-link.js";
import { FetchError } from "./fetch-error.js";
import { NotionalAmount } from "./notional-amount.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { UsdcIcon } from "./usdc-icon.js";
import styles from "./withdraw-page.module.css";

type Props = {
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const WithdrawPage = ({ onPressBack, ...props }: Props) => {
  const { network } = useSessionContext();
  const priceState = usePrice(USDC.chains[network].fogo.mint.toBase58());
  const price =
    priceState.type === StateType.Loaded ? priceState.data : undefined;

  return (
    <div className={styles.withdrawPage}>
      <Button
        onPress={onPressBack}
        variant="outline"
        className={styles.backButton ?? ""}
      >
        Back
      </Button>
      <WithdrawForm {...props} price={price} />
    </div>
  );
};

const WithdrawForm = (
  props: Omit<Props, "onPressBack"> & { price: number | undefined },
) => {
  const feeConfig = useFeeConfig();
  switch (feeConfig.type) {
    case StateType.Error: {
      return (
        <FetchError
          className={styles.fetchError}
          headline="Failed to load fee information"
          error={feeConfig.error}
          reset={feeConfig.reset}
        />
      );
    }
    case StateType.Loaded: {
      return (
        <WithdrawFormWithFeeConfig feeConfig={feeConfig.data} {...props} />
      );
    }
    case StateType.Loading:
    case StateType.NotLoaded: {
      return <WithdrawFormImpl {...props} isLoading />;
    }
  }
};

const useFeeConfig = () => {
  const { getSessionContext, network } = useSessionContext();
  const getFeeConfig = useCallback(
    async () => await getBridgeOutFee(await getSessionContext()),
    [getSessionContext],
  );
  return useData(["feeConfig", "bridge", network], getFeeConfig, {});
};

const WithdrawFormWithFeeConfig = (
  props: Omit<Props, "onPressBack"> & {
    feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>;
    price: number | undefined;
  },
) => {
  const { network } = useSessionContext();
  const tokenAccountState = useTokenAccountData(props.sessionState);

  switch (tokenAccountState.type) {
    case StateType.Error: {
      return (
        <FetchError
          className={styles.fetchError}
          headline="Failed to load token account balance"
          error={tokenAccountState.error}
          reset={tokenAccountState.reset}
        />
      );
    }
    case StateType.Loaded: {
      const feeTokenAccountBalance =
        tokenAccountState.data.tokensInWallet.find(
          (token) => !token.isNative && token.mint.equals(props.feeConfig.mint),
        )?.amountInWallet ?? 0n;

      return feeTokenAccountBalance < props.feeConfig.fee ? (
        <FetchError
          className={styles.fetchError}
          headline={`Not enough ${props.feeConfig.symbolOrMint}`}
          error={`You need at least ${amountToString(
            props.feeConfig.fee,
            props.feeConfig.decimals,
          )} ${
            props.feeConfig.symbolOrMint
          } to pay network fees to transfer tokens out.`}
        />
      ) : (
        <LoadedWithdrawForm
          amountAvailable={getUsdcBalance(
            network,
            tokenAccountState.data.tokensInWallet,
          )}
          {...props}
        />
      );
    }
    case StateType.Loading:
    case StateType.NotLoaded: {
      return <WithdrawFormImpl {...props} isLoading />;
    }
  }
};

const LoadedWithdrawForm = ({
  onSendComplete,
  sessionState,
  feeConfig,
  amountAvailable,
  price,
}: Omit<Props, "onPressBack"> & {
  amountAvailable: bigint;
  price: number | undefined;
  feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>;
}) => {
  const { getSessionContext, network } = useSessionContext();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const onSubmit = useCallback(
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
            signMessage: (message) =>
              signWithWallet(sessionState.solanaWallet, message),
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
          // biome-ignore lint/suspicious/noConsole: we want to log the error
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

  const maxWithdrawAmount = feeConfig.mint.equals(
    USDC.chains[network].fogo.mint,
  )
    ? amountAvailable - feeConfig.fee
    : amountAvailable;

  return (
    <WithdrawFormImpl
      isSubmitting={isSubmitting}
      amountAvailable={amountAvailable}
      price={price}
      feeConfig={feeConfig}
      onSubmit={onSubmit}
      amount={amount}
      onChangeAmount={setAmount}
      maxWithdrawAmount={maxWithdrawAmount}
    />
  );
};

const WithdrawFormImpl = (
  props:
    | { isLoading: true; amount?: undefined }
    | {
        isLoading?: false;
        isSubmitting: boolean;
        amountAvailable: bigint;
        price: number | undefined;
        feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>;
        onSubmit: FormEventHandler;
        amount: string;
        onChangeAmount: (newValue: string) => void;
        maxWithdrawAmount: bigint;
      },
) => {
  const notionalAmount = useMemo(() => {
    if (props.isLoading || !props.amount) {
      return;
    }
    try {
      return stringToAmount(props.amount, USDC.decimals);
    } catch {
      return;
    }
  }, [props.isLoading, props.amount]);

  return (
    <Form
      className={styles.withdrawForm ?? ""}
      {...(!props.isLoading && { onSubmit: props.onSubmit })}
    >
      <div className={styles.header}>
        <UsdcIcon className={styles.tokenIcon} />
        <h2 className={styles.tokenName}>Transfer USD Coin to Solana</h2>
        <div
          className={styles.amountInWallet}
          data-is-loading={props.isLoading ? "" : undefined}
        >
          {!props.isLoading && (
            <>
              <span className={styles.amount}>
                {amountToString(
                  props.amountAvailable,
                  USDC.decimals,
                ).toString()}
              </span>{" "}
              USDC available
            </>
          )}
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
        placeholder="Enter an amount"
        labelExtra={
          <Link
            className={styles.action ?? ""}
            {...(props.isLoading || props.isSubmitting
              ? { isPending: true }
              : {
                  onPress: () => {
                    props.onChangeAmount(
                      amountToString(
                        props.maxWithdrawAmount,
                        USDC.decimals,
                        false,
                      ),
                    );
                  },
                })}
          >
            Max
          </Link>
        }
        {...(props.isLoading || props.isSubmitting
          ? { isPending: true }
          : {
              max: props.maxWithdrawAmount,
              onChange: props.onChangeAmount,
            })}
        {...(!props.isLoading && {
          value: props.amount,
        })}
      />
      {!props.isLoading &&
        props.price !== undefined &&
        notionalAmount !== undefined && (
          <NotionalAmount
            amount={notionalAmount}
            decimals={USDC.decimals}
            price={props.price}
            className={styles.notionalAmount}
          />
        )}
      <Button
        type="submit"
        variant="secondary"
        className={styles.submitButton ?? ""}
        isPending={props.isLoading === true || props.isSubmitting}
      >
        Transfer
      </Button>
      <div
        className={styles.fee}
        data-is-loading={props.isLoading ? "" : undefined}
      >
        {!props.isLoading && (
          <>
            Fee: {amountToString(props.feeConfig.fee, props.feeConfig.decimals)}{" "}
            {props.feeConfig.symbolOrMint}
          </>
        )}
      </div>
    </Form>
  );
};

const getUsdcBalance = (network: Network, tokensInWallet: Token[]) =>
  tokensInWallet.find(
    (token) =>
      !token.isNative && token.mint.equals(USDC.chains[network].fogo.mint),
  )?.amountInWallet ?? 0n;
