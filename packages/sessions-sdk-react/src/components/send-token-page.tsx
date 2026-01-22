import {
  getTransferFee,
  sendNativeTransfer,
  sendTransfer,
  TransactionResultType,
} from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";
import { Scanner } from "@yudiel/react-qr-scanner";
import clsx from "clsx";
import type {
  ComponentProps,
  FormEvent,
  FormEventHandler,
  ReactNode,
} from "react";
import { useCallback, useMemo, useState } from "react";
import { Form } from "react-aria-components";

import { amountToString, stringToAmount } from "../amount-to-string.js";
import { usePrice } from "../hooks/use-price.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import { useTokenAccountData } from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import { signWithWallet } from "../solana-wallet.js";
import { Button } from "./component-library/Button/index.js";
import { errorToString } from "./component-library/error-to-string/index.js";
import { Link } from "./component-library/Link/index.js";
import { TextField } from "./component-library/TextField/index.js";
import { useToast } from "./component-library/Toast/index.js";
import { StateType, useData } from "./component-library/useData/index.js";
import { ExplorerLink } from "./explorer-link.js";
import { FetchError as FetchErrorImpl } from "./fetch-error.js";
import { NotionalAmount } from "./notional-amount.js";
import styles from "./send-token-page.module.css";
import { TokenAmountInput } from "./token-amount-input.js";
import { TruncateKey } from "./truncate-key.js";

type Props = {
  token: Token;
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const SendTokenPage = (props: Props) => {
  const priceState = usePrice(
    props.token.isNative ? "native" : props.token.mint.toBase58(),
  );
  const price =
    priceState.type === StateType.Loaded ? priceState.data : undefined;

  const feeConfig = useFeeConfig();
  switch (feeConfig.type) {
    case StateType.Error: {
      return (
        <FetchError
          headline="Failed to load fee information"
          error={feeConfig.error}
          reset={feeConfig.reset}
          onPressBack={props.onPressBack}
        />
      );
    }
    case StateType.Loaded: {
      return (
        <SendTokenWithFeeConfig
          feeConfig={feeConfig.data}
          isNative={props.token.isNative}
          {...props}
          price={price}
        />
      );
    }
    case StateType.Loading:
    case StateType.NotLoaded: {
      return <SendTokenPageImpl {...props} isLoading />;
    }
  }
};

const useFeeConfig = () => {
  const { getSessionContext, network } = useSessionContext();
  const getFeeConfig = useCallback(
    async () => await getTransferFee(await getSessionContext()),
    [getSessionContext],
  );
  return useData(["feeConfig", "transfer", network], getFeeConfig, {});
};

const SendTokenWithFeeConfig = (
  props: Props & {
    sessionState: EstablishedSessionState;
    isNative: boolean;
    feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
    price: number | undefined;
  },
) => {
  const feeTokenAccountBalance = useFeeTokenAccountBalance(
    props.sessionState,
    props.feeConfig,
  );

  switch (feeTokenAccountBalance.type) {
    case StateType.Error: {
      return (
        <FetchError
          headline="Failed to load token account balance"
          error={feeTokenAccountBalance.error}
          reset={feeTokenAccountBalance.reset}
          onPressBack={props.onPressBack}
        />
      );
    }
    case StateType.Loaded: {
      return !props.isNative &&
        feeTokenAccountBalance.data < props.feeConfig.fee ? (
        <FetchError
          headline={`Not enough ${props.feeConfig.symbolOrMint}`}
          error={`You need at least ${amountToString(
            props.feeConfig.fee,
            props.feeConfig.decimals,
          )} ${
            props.feeConfig.symbolOrMint
          } to pay network fees to send tokens.`}
          onPressBack={props.onPressBack}
        />
      ) : (
        <LoadedSendTokenPage {...props} />
      );
    }
    case StateType.Loading:
    case StateType.NotLoaded: {
      return <SendTokenPageImpl {...props} isLoading />;
    }
  }
};

const useFeeTokenAccountBalance = (
  sessionState: EstablishedSessionState,
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>,
) => {
  const accountData = useTokenAccountData(sessionState);
  switch (accountData.type) {
    case StateType.Error:
    case StateType.Loading:
    case StateType.NotLoaded: {
      return accountData;
    }
    case StateType.Loaded: {
      return {
        ...accountData,
        data:
          accountData.data.tokensInWallet.find(
            (token) => !token.isNative && token.mint.equals(feeConfig.mint),
          )?.amountInWallet ?? 0n,
      };
    }
  }
};

const LoadedSendTokenPage = ({
  sessionState,
  onSendComplete,
  feeConfig,
  price,
  ...props
}: Props & {
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
  price: number | undefined;
}) => {
  const { getSessionContext, network } = useSessionContext();
  const [amount, setAmount] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const recipient = data.get("recipient");
      const amount = data.get("amount");
      if (
        recipient === null ||
        amount === null ||
        typeof recipient !== "string" ||
        typeof amount !== "string"
      ) {
        throw new Error("Invalid input");
      }

      setIsSubmitting(true);
      getSessionContext()
        .then((context) => {
          const args = {
            context,
            walletPublicKey: sessionState.walletPublicKey,
            signMessage: (message: Uint8Array) =>
              signWithWallet(sessionState.solanaWallet, message),
            amount: stringToAmount(amount, props.token.decimals),
            recipient: new PublicKey(recipient),
            feeConfig,
          };
          return props.token.isNative
            ? sendNativeTransfer(args)
            : sendTransfer({ ...args, mint: props.token.mint });
        })
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success(
              "Tokens sent successfully!",
              <ExplorerLink network={network} txHash={result.signature} />,
            );
            onSendComplete();
          } else {
            toast.error("Failed to send tokens", errorToString(result.error));
          }
        })
        .catch((error: unknown) => {
          toast.error("Failed to send tokens", errorToString(error));
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    },
    [
      props.token,
      getSessionContext,
      sessionState.walletPublicKey,
      sessionState.solanaWallet,
      onSendComplete,
      toast,
      feeConfig,
      network,
    ],
  );

  // if the token being sent is the same as the fee token, we need to account for the fee when calculating the max amount to send
  const maxSendAmount =
    props.token.isNative || !feeConfig.mint.equals(props.token.mint)
      ? props.token.amountInWallet
      : props.token.amountInWallet - feeConfig.fee;

  return (
    <SendTokenPageImpl
      {...props}
      sessionState={sessionState}
      onSendComplete={onSendComplete}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      recipient={recipient}
      amount={amount}
      maxSendAmount={maxSendAmount}
      price={price}
      onChangeRecipient={setRecipient}
      onPressScanner={() => {
        setShowScanner(true);
      }}
      onChangeAmount={setAmount}
      feeConfig={feeConfig}
      scanner={
        showScanner ? (
          <div className={styles.qrCodeScanner}>
            <Button
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              variant="solid"
              className={styles.closeButton ?? ""}
              onPress={() => {
                setShowScanner(false);
              }}
            >
              <span className={styles.label}>Close</span>
            </Button>
            <Scanner
              classNames={{ container: styles.camera ?? "" }}
              onScan={(results) => {
                const value = results[0]?.rawValue;
                if (value) {
                  setShowScanner(false);
                  setRecipient(value);
                }
              }}
            />
          </div>
        ) : undefined
      }
    />
  );
};

const SendTokenPageImpl = ({
  onPressBack,
  sessionState,
  token,
  ...props
}: Props &
  (
    | { isLoading: true; amount?: undefined }
    | {
        isLoading?: false;
        isSubmitting: boolean;
        scanner: ReactNode | undefined;
        onSubmit: FormEventHandler;
        recipient: string;
        amount: string;
        price: number | undefined;
        onChangeRecipient: (newRecipient: string) => void;
        onPressScanner: () => void;
        onChangeAmount: (newAmount: string) => void;
        feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
        maxSendAmount: bigint;
      }
  )) => {
  const scannerShowing = !props.isLoading && props.scanner !== undefined;

  const notionalAmount = useMemo(() => {
    if (props.isLoading || !props.amount) {
      return;
    }
    try {
      return stringToAmount(props.amount, token.decimals);
    } catch {
      return;
    }
  }, [props.isLoading, props.amount, token.decimals]);

  return (
    <div className={styles.sendTokenPage ?? ""}>
      <Button
        excludeFromTabOrder={scannerShowing}
        onPress={onPressBack}
        variant="outline"
        className={styles.backButton ?? ""}
      >
        Back
      </Button>
      <Form
        aria-hidden={scannerShowing ? "true" : undefined}
        className={styles.sendTokenForm ?? ""}
        {...(!props.isLoading &&
          !props.isSubmitting && { onSubmit: props.onSubmit })}
      >
        <div className={styles.header}>
          {token.image ? (
            <img alt="" src={token.image} className={styles.tokenIcon} />
          ) : (
            <div className={styles.tokenIcon} />
          )}
          <h2 className={styles.tokenName}>
            Send{" "}
            {token.isNative
              ? token.name
              : (token.name ?? <TruncateKey keyValue={token.mint} />)}
          </h2>
          <div className={styles.amountInWallet}>
            <span className={styles.amount}>
              {amountToString(token.amountInWallet, token.decimals)}
            </span>{" "}
            {token.symbol} available
          </div>
        </div>
        <TextField
          excludeFromTabOrder={scannerShowing}
          className={styles.field ?? ""}
          name="recipient"
          label="Recipient"
          isRequired
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder="Enter recipient address"
          double
          labelExtra={
            <Link
              excludeFromTabOrder={scannerShowing}
              className={styles.action ?? ""}
              {...(props.isLoading || props.isSubmitting
                ? { isPending: true }
                : {
                    onPress: props.onPressScanner,
                  })}
            >
              Scan QR
            </Link>
          }
          validate={(value) => {
            if (value) {
              try {
                return new PublicKey(value).equals(sessionState.walletPublicKey)
                  ? "You cannot send tokens to yourself"
                  : undefined;
              } catch {
                return "This is not a valid public key address.";
              }
            } else {
              return;
            }
          }}
          {...(props.isLoading || props.isSubmitting
            ? { isPending: true }
            : {
                onChange: props.onChangeRecipient,
              })}
          {...(!props.isLoading && {
            value: props.recipient,
          })}
        />
        <TokenAmountInput
          excludeFromTabOrder={scannerShowing}
          className={styles.field ?? ""}
          decimals={token.decimals}
          label="Amount"
          name="amount"
          symbol={token.symbol}
          isRequired
          gt={0n}
          placeholder="Enter an amount"
          labelExtra={
            <Link
              excludeFromTabOrder={scannerShowing}
              className={styles.action ?? ""}
              {...(props.isLoading || props.isSubmitting
                ? { isPending: true }
                : {
                    onPress: () => {
                      props.onChangeAmount(
                        amountToString(
                          props.maxSendAmount,
                          token.decimals,
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
                max: props.maxSendAmount,
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
              decimals={token.decimals}
              price={props.price}
              className={styles.notionalAmount}
            />
          )}
        <Button
          excludeFromTabOrder={scannerShowing}
          type="submit"
          variant="secondary"
          className={styles.submitButton ?? ""}
          isPending={props.isLoading === true || props.isSubmitting}
        >
          Send
        </Button>
        {!token.isNative && (
          <div
            className={styles.fee}
            data-is-loading={props.isLoading ? "" : undefined}
          >
            {!props.isLoading && (
              <>
                Fee:{" "}
                {amountToString(props.feeConfig.fee, props.feeConfig.decimals)}{" "}
                {props.feeConfig.symbolOrMint}
              </>
            )}
          </div>
        )}
      </Form>
      {!props.isLoading && props.scanner}
    </div>
  );
};

const FetchError = ({
  onPressBack,
  className,
  ...props
}: ComponentProps<typeof FetchErrorImpl> & {
  onPressBack: () => void;
}) => (
  <div className={clsx(styles.sendTokenPage, className)}>
    <Button
      onPress={onPressBack}
      variant="outline"
      className={styles.backButton ?? ""}
    >
      Back
    </Button>
    <FetchErrorImpl className={styles.fetchError} {...props} />
  </div>
);
