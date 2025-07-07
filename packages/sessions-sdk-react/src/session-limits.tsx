import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import type { ChangeEvent } from "react";
import { useCallback, useState, useMemo, useRef } from "react";
import { Button } from "react-aria-components";

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
}: {
  tokens: Token[];
  initialLimits: Map<Token, bigint>;
  onSubmit?: ((tokens: Map<Token, bigint>) => void) | undefined;
  buttonText?: string;
  error?: unknown;
  className?: string | undefined;
}) => {
  const doSubmit = useCallback(
    (data: FormData) => {
      if (onSubmit !== undefined) {
        const limits = new Map(
          tokens
            .map((mint) => {
              const value = data.get(mint.toBase58());
              return typeof value === "string"
                ? ([mint, BigInt(value)] as const)
                : undefined;
            })
            .filter((value) => value !== undefined),
        );
        onSubmit(limits);
      }
    },
    [tokens, onSubmit],
  );

  return (
    <form className={clsx(styles.sessionLimits, className)} action={doSubmit}>
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
    </form>
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateAmount = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDisplayAmount(event.target.value);
      try {
        setActualAmount(
          stringToAmount(event.target.value, metadata.decimals).toString(),
        );
        inputRef.current?.setCustomValidity("");
      } catch (error: unknown) {
        inputRef.current?.setCustomValidity(errorToString(error));
      }
      inputRef.current?.reportValidity();
    },
    [metadata.decimals],
  );

  return (
    <div className={styles.token}>
      <label className={styles.name} htmlFor={`visible-` + mintAsString}>
        {metadata.name ?? mintAsString}
      </label>
      <input type="hidden" name={mintAsString} value={actualAmount} />
      <input
        ref={inputRef}
        className={styles.input}
        id={`visible-` + mintAsString}
        value={displayAmount}
        onChange={updateAmount}
      />
      <span className={styles.symbol}>{metadata.symbol ?? "Tokens"}</span>
    </div>
  );
};
