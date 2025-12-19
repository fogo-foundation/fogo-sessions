import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
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
import type { WalletConnectedSessionState } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { TextField } from "./component-library/TextField/index.js";
import styles from "./session-limits.module.css";
import { TokenAmountInput } from "./token-amount-input.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { TokenAccountData } from "../hooks/use-token-account-data.js";
import {
  useTokenAccountData,
  StateType as TokenDataStateType,
} from "../hooks/use-token-account-data.js";
import {
  StateType as TokenMetadataStateType,
  useTokenMetadata,
} from "../hooks/use-token-metadata.js";
import layerStyles from "../layer.module.css";
import resetStyles from "../reset.module.css";
import { StateType, isEstablished, isUpdatable } from "../session-state.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

type Props = {
  buttonText?: string | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
  hideCancel?: boolean | undefined;
  header?: ReactNode | undefined;
  bodyClassName?: ReactNode | undefined;
  footerClassName?: ReactNode | undefined;
  sessionState: WalletConnectedSessionState;
};

export const SessionLimits = ({
  sessionState,
  className,
  bodyClassName,
  footerClassName,
  header,
  hideCancel,
  autoFocus,
  buttonText,
}: Props) => {
  const { enableUnlimited, whitelistedTokens } = useSessionContext();

  const [applyLimits, setApplyLimits] = useState(
    isEstablished(sessionState) ? sessionState.isLimited : !enableUnlimited,
  );

  const submitHandler = useMemo(() => {
    if (isUpdatable(sessionState)) {
      return (duration: number, limits?: Map<PublicKey, bigint>) => {
        sessionState.updateSession(sessionState.type, duration, limits);
      };
    } else if (sessionState.type === StateType.RequestingLimits) {
      return sessionState.submitLimits;
    } else {
      return;
    }
  }, [sessionState]);

  const onSubmit = useMemo(
    () =>
      submitHandler === undefined
        ? undefined
        : (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const data = new FormData(event.currentTarget);
            const durationSelection = data.get("duration");
            submitHandler(
              DURATION[
                typeof durationSelection === "string" &&
                isDurationValue(durationSelection)
                  ? durationSelection
                  : "one-week"
              ].value,
              enableUnlimited && !data.get("applyLimits")
                ? undefined
                : new Map(
                    whitelistedTokens
                      .map((mint) => {
                        const value = data.get(mint.toBase58());
                        const decimals = data.get(
                          `${mint.toBase58()}-decimals`,
                        );
                        return typeof value === "string" &&
                          typeof decimals === "string"
                          ? ([
                              mint,
                              stringToAmount(
                                value,
                                Number.parseInt(decimals, 10),
                              ),
                            ] as const)
                          : undefined;
                      })
                      .filter((value) => value !== undefined),
                  ),
            );
          },
    [whitelistedTokens, enableUnlimited, submitHandler],
  );

  return (
    <Form
      className={clsx(styles.sessionLimits, className)}
      {...(onSubmit !== undefined && { onSubmit })}
    >
      <div className={clsx(styles.body, bodyClassName)}>
        {header}
        <Select
          name="duration"
          defaultSelectedKey="one-week"
          isDisabled={onSubmit === undefined}
          className={styles.sessionExpiry ?? ""}
        >
          <Label className={styles.label ?? ""}>Session duration</Label>
          <UnstyledButton className={styles.button ?? ""}>
            <SelectValue className={styles.value ?? ""} />
            <CaretDownIcon className={styles.arrow ?? ""} />
          </UnstyledButton>
          <Popover
            offset={4}
            className={clsx(
              styles.selectPopover,
              resetStyles.reset,
              layerStyles.layerSelect,
            )}
          >
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
              isDisabled={onSubmit === undefined}
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
                initial={enableUnlimited ? { height: 0 } : false}
                animate={enableUnlimited ? { height: "auto" } : false}
                exit={enableUnlimited ? { height: 0 } : {}}
                className={styles.tokenList}
                data-enable-unlimited={enableUnlimited ? "" : undefined}
              >
                <TokenLimits sessionState={sessionState} />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className={clsx(styles.footer, footerClassName)}>
        {!hideCancel && (
          <Button
            variant="outline"
            slot="close"
            isDisabled={onSubmit === undefined}
          >
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

const TokenLimits = ({
  sessionState,
}: {
  sessionState: WalletConnectedSessionState;
}) => {
  const tokenAccountData = useTokenAccountData(sessionState);

  switch (tokenAccountData.type) {
    case TokenDataStateType.Error: {
      return <LoadedTokenLimits sessionState={sessionState} />;
    }

    case TokenDataStateType.Loaded: {
      return (
        <LoadedTokenLimits
          sessionState={sessionState}
          tokenAccountData={tokenAccountData.data}
        />
      );
    }

    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return (
        <li>
          <LoadingToken />
        </li>
      );
    }
  }
};

const LoadedTokenLimits = ({
  sessionState,
  tokenAccountData,
}: {
  sessionState: WalletConnectedSessionState;
  tokenAccountData?: TokenAccountData | undefined;
}) => {
  const { whitelistedTokens, defaultRequestedLimits } = useSessionContext();

  const userTokens = useMemo(
    () =>
      tokenAccountData === undefined
        ? []
        : [
            ...tokenAccountData.tokensInWallet,
            ...tokenAccountData.sessionLimits,
          ].map((token) => token.mint),
    [tokenAccountData],
  );

  const whitelistedTokensThatUserHas = useMemo(
    () =>
      whitelistedTokens.filter((mint) =>
        userTokens.some((token) => token.equals(mint)),
      ),
    [whitelistedTokens, userTokens],
  );

  const initialLimits = useMemo(() => {
    switch (sessionState.type) {
      case StateType.RequestingLimits: {
        return sessionState.requestedLimits ?? defaultRequestedLimits;
      }
      case StateType.SettingLimits: {
        return defaultRequestedLimits;
      }
      default: {
        return tokenAccountData === undefined
          ? undefined
          : new Map(
              tokenAccountData.sessionLimits.map(({ mint, sessionLimit }) => [
                mint,
                sessionLimit,
              ]),
            );
      }
    }
  }, [sessionState, defaultRequestedLimits, tokenAccountData]);

  return (
    <>
      {whitelistedTokensThatUserHas.map((mint) => (
        <li key={mint.toBase58()}>
          <Token
            mint={mint}
            initialAmount={
              initialLimits === undefined
                ? 0n
                : (initialLimits
                    .entries()
                    .find(([limitMint]) => limitMint.equals(mint))?.[1] ?? 0n)
            }
          />
        </li>
      ))}
    </>
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
    case TokenMetadataStateType.Error: {
      return <></>; // TODO
    }

    case TokenMetadataStateType.Loaded: {
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
            labelLineClassName={styles.labelLine}
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

    case TokenMetadataStateType.Loading:
    case TokenMetadataStateType.NotLoaded: {
      return <LoadingToken />;
    }
  }
};

const LoadingToken = () => (
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
