import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import type { FormEvent } from "react";
import { useCallback, useState, useMemo } from "react";
import {
  Button,
  FieldError,
  Input,
  Label,
  TextField,
  Text,
  Checkbox,
  Form,
} from "react-aria-components";

import { amountToString, stringToAmount } from "./amount-to-string.js";
import { errorToString } from "./error-to-string.js";
import styles from "./session-limits.module.css";
import type { Metadata } from "./use-token-metadata.js";
import { StateType, useTokenMetadata } from "./use-token-metadata.js";

export const SessionLimits = <Token extends PublicKey>({
  tokens,
  initialLimits,
  onSubmit,
  buttonText = "Log in",
  error,
  className,
  enableUnlimited,
  isSessionUnlimited,
}: {
  tokens: Token[];
  initialLimits: Map<Token, bigint>;
  onSubmit?: ((tokens?: Map<Token, bigint>) => void) | undefined;
  buttonText?: string;
  error?: unknown;
  className?: string | undefined;
} & (
  | { enableUnlimited?: false | undefined; isSessionUnlimited?: undefined }
  | { enableUnlimited: true; isSessionUnlimited?: boolean }
)) => {
  const [applyLimits, setApplyLimits] = useState(
    !(isSessionUnlimited ?? enableUnlimited),
  );
  const doSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (onSubmit !== undefined) {
        const data = new FormData(event.currentTarget);
        onSubmit(
          enableUnlimited && !data.get("applyLimits")
            ? undefined
            : new Map(
                tokens
                  .map((mint) => {
                    const value = data.get(mint.toBase58());
                    return typeof value === "string"
                      ? ([mint, BigInt(value)] as const)
                      : undefined;
                  })
                  .filter((value) => value !== undefined),
              ),
        );
      }
    },
    [tokens, onSubmit, enableUnlimited],
  );

  return (
    <Form className={clsx(styles.sessionLimits, className)} onSubmit={doSubmit}>
      {enableUnlimited && (
        <Checkbox
          name="applyLimits"
          className={styles.applyLimits ?? ""}
          isSelected={applyLimits}
          onChange={setApplyLimits}
        >
          <div className={styles.checkbox ?? ""}>
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <polyline points="1 9 7 14 15 4" />
            </svg>
          </div>
          {"Limit this app's access to tokens"}
        </Checkbox>
      )}
      {applyLimits ? (
        <ul className={styles.tokenList}>
          {tokens.map((mint) => (
            <li key={mint.toBase58()}>
              <Token
                mint={mint}
                initialAmount={
                  initialLimits
                    .entries()
                    .find(([limitMint]) => limitMint.equals(mint))?.[1] ?? 0n
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div />
      )}
      <div className={styles.footer}>
        <p className={styles.errorMessage}>
          {error !== undefined && errorToString(error)}
        </p>
        <Button
          className={styles.submitButton ?? ""}
          type="submit"
          isDisabled={onSubmit === undefined}
          isPending={onSubmit === undefined}
        >
          {buttonText}
        </Button>
      </div>
    </Form>
  );
};

const Token = ({
  mint,
  initialAmount,
}: {
  mint: PublicKey;
  initialAmount: bigint;
}) => {
  const metadata = useTokenMetadata(mint);

  switch (metadata.type) {
    case StateType.Error: {
      return <></>; // TODO
    }

    case StateType.Loaded: {
      return (
        <TokenInput
          mint={mint}
          initialAmount={initialAmount}
          metadata={metadata.data}
        />
      );
    }

    case StateType.Loading:
    case StateType.NotLoaded: {
      return "Loading..."; // TODO
    }
  }
};

const TokenInput = ({
  mint,
  initialAmount,
  metadata,
}: {
  mint: PublicKey;
  initialAmount: bigint;
  metadata: Metadata;
}) => {
  const [displayAmount, setDisplayAmount] = useState(
    amountToString(initialAmount, metadata.decimals),
  );
  const [actualAmount, setActualAmount] = useState(initialAmount.toString());
  const mintAsString = useMemo(() => mint.toBase58(), [mint]);
  const [error, setError] = useState<string | undefined>();

  const updateAmount = useCallback(
    (value: string) => {
      setDisplayAmount(value);
      try {
        setActualAmount(
          stringToAmount(value.toString(), metadata.decimals).toString(),
        );
        setError(undefined);
      } catch (error: unknown) {
        setError(errorToString(error));
      }
    },
    [metadata.decimals],
  );

  return (
    <>
      <input type="hidden" name={mintAsString} value={actualAmount} />
      <TextField
        className={styles.token ?? ""}
        value={displayAmount}
        onChange={updateAmount}
        isInvalid={error !== undefined}
      >
        <Label className={styles.name ?? ""}>
          {"name" in metadata ? metadata.name : mintAsString}
        </Label>
        <Input className={styles.input ?? ""} />
        <Text className={styles.symbol} slot="description">
          {"symbol" in metadata ? metadata.symbol : "Tokens"}
        </Text>
        <FieldError className={styles.error ?? ""}>
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className={styles.overlayArrow}
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
          {error}
        </FieldError>
      </TextField>
    </>
  );
};
