import { sendTransfer, TransactionResultType } from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { FormEvent } from "react";
import { useState, useCallback } from "react";
import { Form } from "react-aria-components";

import { amountToString, stringToAmount } from "./amount-to-string.js";
import { Button } from "./button.js";
import { errorToString } from "./error-to-string.js";
import { TextField } from "./field.js";
import { Link } from "./link.js";
import styles from "./send-token-page.module.css";
import type { EstablishedSessionState } from "./session-provider.js";
import { useToast } from "./toast.js";
import { TokenAmountInput } from "./token-amount-input.js";
import { TruncateKey } from "./truncate-key.js";

type Props = {
  icon?: string | undefined;
  tokenName?: string | undefined;
  tokenMint: PublicKey;
  decimals: number;
  symbol?: string | undefined;
  amountAvailable: bigint;
  sessionState: EstablishedSessionState;
  onPressBack: () => void;
  onSendComplete: () => void;
};

export const SendTokenPage = ({
  onPressBack,
  sessionState,
  tokenName,
  tokenMint,
  decimals,
  icon,
  symbol,
  amountAvailable,
  onSendComplete,
}: Props) => {
  const [amount, setAmount] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const doSubmit = useCallback(
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

      setIsLoading(true);
      sendTransfer({
        adapter: sessionState.adapter,
        walletPublicKey: sessionState.walletPublicKey,
        signMessage: sessionState.signMessage,
        mint: tokenMint,
        amount: stringToAmount(amount, decimals),
        recipient: new PublicKey(recipient),
      })
        .then((result) => {
          if (result.type === TransactionResultType.Success) {
            toast.success("Tokens sent successfully!");
            onSendComplete();
          } else {
            toast.error("Failed to send tokens", errorToString(result.error));
          }
        })
        .catch((error: unknown) => {
          toast.error("Failed to send tokens", errorToString(error));
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [
      decimals,
      sessionState.adapter,
      sessionState.signMessage,
      sessionState.walletPublicKey,
      tokenMint,
      onSendComplete,
      toast,
    ],
  );

  return (
    <div className={styles.sendTokenPage ?? ""}>
      <Form
        aria-hidden={showScanner ? "true" : undefined}
        className={styles.sendTokenForm ?? ""}
        onSubmit={doSubmit}
      >
        <Button
          excludeFromTabOrder={showScanner}
          onPress={onPressBack}
          variant="outline"
          className={styles.backButton ?? ""}
        >
          Back
        </Button>
        <div className={styles.header}>
          {icon ? (
            <img alt="" src={icon} className={styles.tokenIcon} />
          ) : (
            <div className={styles.tokenIcon} />
          )}
          <h2 className={styles.tokenName}>
            Send {tokenName ?? <TruncateKey keyValue={tokenMint} />}
          </h2>
          <div className={styles.amountInWallet}>
            {amountToString(amountAvailable, decimals)} {symbol} available
          </div>
        </div>
        <TextField
          excludeFromTabOrder={showScanner}
          className={styles.field ?? ""}
          name="recipient"
          label="Recipient"
          isRequired
          value={recipient}
          onChange={setRecipient}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder="Enter recipient address"
          double
          data-1p-ignore
          labelExtra={
            <Link
              excludeFromTabOrder={showScanner}
              className={styles.action ?? ""}
              onPress={() => {
                setShowScanner(true);
              }}
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
        />
        <TokenAmountInput
          excludeFromTabOrder={showScanner}
          className={styles.field ?? ""}
          decimals={decimals}
          label="Amount"
          name="amount"
          symbol={symbol}
          isRequired
          gt={0n}
          max={amountAvailable}
          value={amount}
          onChange={setAmount}
          placeholder="Enter an amount"
          labelExtra={
            <Link
              excludeFromTabOrder={showScanner}
              className={styles.action ?? ""}
              onPress={() => {
                setAmount(amountToString(amountAvailable, decimals));
              }}
            >
              Max
            </Link>
          }
        />
        <Button
          excludeFromTabOrder={showScanner}
          type="submit"
          variant="secondary"
          className={styles.submitButton ?? ""}
          isPending={isLoading}
        >
          Send
        </Button>
      </Form>
      {showScanner && (
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
      )}
    </div>
  );
};
