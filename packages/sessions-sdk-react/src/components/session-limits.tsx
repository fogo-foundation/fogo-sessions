import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  Button as UnstyledButton,
  Checkbox,
  Form,
  Select,
  Label,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from "react-aria-components";

import { stringToAmount, amountToString } from "../amount-to-string.js";
import { Button } from "./button.js";
import { TextField } from "./field.js";
import styles from "./session-limits.module.css";
import { TokenAmountInput } from "./token-amount-input.js";
import { StateType, useTokenMetadata } from "../hooks/use-token-metadata.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

export const SessionLimits = <Token extends PublicKey>({
  whitelistedTokens,
  userTokens,
  initialLimits,
  onSubmit,
  buttonText = "Log in",
  className,
  enableUnlimited,
  isSessionUnlimited,
  autoFocus,
  hideCancel,
  header,
  bodyClassName,
  footerClassName,
}: {
  whitelistedTokens: Token[];
  userTokens: Token[];
  initialLimits: Map<Token, bigint>;
  onSubmit?:
    | ((duration: number, tokens?: Map<Token, bigint>) => void)
    | undefined;
  buttonText?: string | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
  hideCancel?: boolean | undefined;
  header?: ReactNode | undefined;
  bodyClassName?: ReactNode | undefined;
  footerClassName?: ReactNode | undefined;
} & (
  | { enableUnlimited?: false | undefined; isSessionUnlimited?: undefined }
  | { enableUnlimited: true; isSessionUnlimited?: boolean }
)) => {
  const [applyLimits, setApplyLimits] = useState(
    !(isSessionUnlimited ?? enableUnlimited),
  );
  const whitelistedTokensThatUserHas = useMemo(() => {
    return whitelistedTokens.filter((mint) =>
      userTokens.some((userToken) => userToken.equals(mint)),
    );
  }, [whitelistedTokens, userTokens]);
  const doSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (onSubmit !== undefined) {
        const data = new FormData(event.currentTarget);
        const durationSelection = data.get("duration");
        onSubmit(
          DURATION[
            typeof durationSelection === "string" &&
            isDurationValue(durationSelection)
              ? durationSelection
              : "one-week"
          ].value,
          enableUnlimited && !data.get("applyLimits")
            ? undefined
            : new Map(
                whitelistedTokensThatUserHas
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
    [whitelistedTokensThatUserHas, onSubmit, enableUnlimited],
  );

  return (
    <Form className={clsx(styles.sessionLimits, className)} onSubmit={doSubmit}>
      <div className={clsx(styles.body, bodyClassName)}>
        {header}
        <Select
          name="duration"
          defaultSelectedKey="one-week"
          className={styles.sessionExpiry ?? ""}
        >
          <Label className={styles.label ?? ""}>Session duration</Label>
          <UnstyledButton className={styles.button ?? ""}>
            <SelectValue className={styles.value ?? ""} />
            <CaretDownIcon className={styles.arrow ?? ""} />
          </UnstyledButton>
          <Popover offset={4} className={styles.selectPopover ?? ""}>
            <ListBox items={Object.entries(DURATION)}>
              {([key, { label }]) => (
                <ListBoxItem id={key} className={styles.selectItem ?? ""}>
                  {label}
                </ListBoxItem>
              )}
            </ListBox>
          </Popover>
        </Select>
        <div>
          {enableUnlimited && (
            <Checkbox
              name="applyLimits"
              className={styles.applyLimits ?? ""}
              isSelected={applyLimits}
              onChange={setApplyLimits}
            >
              <div className={styles.checkbox}>
                <CheckIcon className={styles.check} weight="bold" />
              </div>
              {"Limit this app's access to tokens"}
            </Checkbox>
          )}
          <AnimatePresence>
            {applyLimits && (
              <motion.ul
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className={styles.tokenList}
              >
                {whitelistedTokensThatUserHas.map((mint) => (
                  <li key={mint.toBase58()}>
                    <Token
                      mint={mint}
                      initialAmount={
                        initialLimits
                          .entries()
                          .find(([limitMint]) => limitMint.equals(mint))?.[1] ??
                        0n
                      }
                    />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className={clsx(styles.footer, footerClassName)}>
        {!hideCancel && (
          <Button variant="outline" slot="close">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="secondary"
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
            className={styles.tokenAmountInput ?? ""}
            inputGroupClassName={styles.inputGroup}
            label={
              <div className={styles.label}>
                {metadata.data.image ? (
                  <img
                    alt=""
                    src={metadata.data.image}
                    className={styles.icon}
                  />
                ) : (
                  <div className={styles.icon} />
                )}
                <span className={styles.name}>
                  {"name" in metadata.data
                    ? metadata.data.name
                    : mint.toBase58()}
                </span>
              </div>
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
      return (
        <TextField
          className={styles.tokenAmountInput ?? ""}
          inputGroupClassName={styles.inputGroup}
          label={
            <div className={styles.label}>
              <div className={styles.icon} />
              <div className={styles.name} />
            </div>
          }
          isPending
        />
      );
    }
  }
};

const DURATION = {
  "30-seconds": {
    label: "30 Seconds",
    value: 30 * ONE_SECOND_IN_MS,
  },
  "one-hour": {
    label: "One Hour",
    value: ONE_HOUR_IN_MS,
  },
  "one-day": {
    label: "One Day",
    value: ONE_DAY_IN_MS,
  },
  "one-week": {
    label: "One Week",
    value: 7 * ONE_DAY_IN_MS,
  },
} as const;

const isDurationValue = (value: string): value is keyof typeof DURATION =>
  Object.keys(DURATION).includes(value);
