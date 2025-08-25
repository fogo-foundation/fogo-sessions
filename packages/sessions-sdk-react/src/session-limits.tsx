import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { Button, Checkbox, Form } from "react-aria-components";

import { stringToAmount, amountToString } from "./amount-to-string.js";
import { errorToString } from "./error-to-string.js";
import styles from "./session-limits.module.css";
import { TokenAmountInput } from "./token-amount-input.js";
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
  autoFocus,
}: {
  tokens: Token[];
  initialLimits: Map<Token, bigint>;
  onSubmit?: ((tokens?: Map<Token, bigint>) => void) | undefined;
  buttonText?: string;
  error?: unknown;
  className?: string | undefined;
  autoFocus?: boolean;
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
                    const decimals = data.get(`${mint.toBase58()}-decimals`);
                    return typeof value === "string" &&
                      typeof decimals === "string"
                      ? ([
                          mint,
                          stringToAmount(value, Number.parseInt(decimals, 10)),
                        ] as const)
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
      {enableUnlimited ? (
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
      ) : (
        <div />
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
          {...(autoFocus && { autoFocus })}
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
        <>
          <input
            name={`${mint.toBase58()}-decimals`}
            type="hidden"
            value={metadata.data.decimals}
          />
          <TokenAmountInput
            className={styles.token ?? ""}
            label={
              "name" in metadata.data ? metadata.data.name : mint.toBase58()
            }
            decimals={metadata.data.decimals}
            symbol={metadata.data.symbol}
            name={mint.toBase58()}
            defaultValue={amountToString(initialAmount, metadata.data.decimals)}
            min={0n}
          />
        </>
      );
    }

    case StateType.Loading:
    case StateType.NotLoaded: {
      return "Loading..."; // TODO
    }
  }
};
