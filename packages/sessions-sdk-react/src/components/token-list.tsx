import { TransactionResultType } from "@fogo/sessions-sdk";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { NATIVE_MINT } from "@solana/spl-token";
import { motion } from "motion/react";
import { type ComponentProps, useCallback } from "react";
import { GridList, GridListItem } from "react-aria-components";
import { amountToString } from "../amount-to-string.js";
import { usePrice } from "../hooks/use-price.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as PriceDataStateType,
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { CopyButton } from "./component-library/CopyButton/index.js";
import { Link } from "./component-library/Link/index.js";
import {
  StateType as AsyncStateType,
  useAsync,
} from "./component-library/useAsync/index.js";
import { FetchError } from "./fetch-error.js";
import { NotionalAmount } from "./notional-amount.js";
import styles from "./token-list.module.css";
import { TruncateKey } from "./truncate-key.js";
import { useToast } from "./component-library/Toast/index.js";
import { ExplorerLink } from "./explorer-link.js";
import { useSessionContext } from "../hooks/use-session.js";
import { errorToString } from "../error-to-string.js";

export const SESSIONS_INTERNAL_PAYMASTER_DOMAIN = "sessions";

const MotionGridListItem = motion.create(GridListItem<Token>);

type Props = {
  sessionState: EstablishedSessionState;
  onPressTransferIn: () => void;
} & (
  | { onPressToken: (token: Token) => void }
  | { onPressSend: (token: Token) => void }
);

export const TokenList = ({
  sessionState,
  onPressTransferIn,
  ...props
}: Props) => {
  const state = useTokenAccountData(sessionState);
  switch (state.type) {
    case TokenDataStateType.Error: {
      return (
        <FetchError
          headline="Failed to fetch your wallet balances"
          error={state.error}
          reset={state.reset}
          className={styles.tokenListError}
        />
      );
    }
    case TokenDataStateType.Loaded: {
      return state.data.tokensInWallet.length === 0 ? (
        <div className={styles.tokenListEmpty}>
          <WalletIcon className={styles.emptyIcon} />
          <span className={styles.message}>Your wallet is empty</span>
          <span className={styles.hints}>
            <Link onPress={onPressTransferIn}>Transfer USDC to Fogo</Link>
          </span>
        </div>
      ) : (
        <GridList
          className={styles.tokenList ?? ""}
          selectionMode="none"
          aria-label="Tokens"
          items={state.data.tokensInWallet.map((token) => ({
            id: token.isNative ? "native" : token.mint.toBase58(),
            token,
          }))}
        >
          {(item) => (
            <TokenItem
              sessionState={sessionState}
              {...item}
              {...("onPressToken" in props
                ? {
                    onPressToken: props.onPressToken,
                  }
                : {
                    onPressSend: props.onPressSend,
                  })}
            />
          )}
        </GridList>
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return (
        <ul className={styles.tokenList}>
          <LoadingToken />
        </ul>
      );
    }
  }
};

type TokenItemProps = {
  id: string;
  token: Token;
  sessionState: EstablishedSessionState;
} & (
  | { onPressToken: (token: Token) => void }
  | { onPressSend: (token: Token) => void }
);

const TokenItem = ({ id, token, sessionState, ...props }: TokenItemProps) => {
  const { amountInWallet, decimals, image } = token;
  const amountAsString = amountToString(amountInWallet, decimals);
  const price = usePrice(id);
  const name = token.name ?? id;

  const contents = (
    <>
      <div className={styles.nameAndIcon}>
        {image ? (
          <img alt="" src={image} className={styles.icon} />
        ) : (
          <div className={styles.icon} />
        )}
        <div className={styles.nameAndMint}>
          <span className={styles.name}>{name}</span>
          {token.isNative ? (
            <div className={styles.mint} data-is-native>
              NATIVE
            </div>
          ) : (
            <CopyButton className={styles.mint ?? ""} text={id}>
              <TruncateKey keyValue={token.mint} />
            </CopyButton>
          )}
        </div>
      </div>
      <div
        className={styles.amountAndActions}
        data-is-native={
          "mint" in token && token.mint.equals(NATIVE_MINT) ? "" : undefined
        }
      >
        <div className={styles.amountAndDetails}>
          <span className={styles.amount}>{amountAsString}</span>
          {price.type === PriceDataStateType.Loaded && (
            <NotionalAmount
              amount={amountInWallet}
              decimals={decimals}
              price={price.data}
              className={styles.notional}
            />
          )}
        </div>
        {"onPressSend" in props && (
          <div className={styles.actions}>
            {"mint" in token && token.mint.equals(NATIVE_MINT) ? (
              <UnwrapButton
                variant="secondary"
                size="sm"
                className={styles.unwrapButton ?? ""}
                sessionState={sessionState}
              >
                Unwrap
              </UnwrapButton>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className={styles.sendButton ?? ""}
                onPress={() => {
                  props.onPressSend(token);
                }}
              >
                <PaperPlaneTiltIcon />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <MotionGridListItem
      layoutId={`token-item-${id}`}
      layoutScroll
      textValue={name}
      key={id}
      className={styles.token ?? ""}
      data-is-button={"onPressToken" in props ? "" : undefined}
      {...("onPressToken" in props && {
        onAction: () => {
          props.onPressToken(token);
        },
      })}
    >
      {contents}
    </MotionGridListItem>
  );
};

const LoadingToken = () => (
  <div data-is-loading="" className={styles.token}>
    <div className={styles.nameAndIcon}>
      <div className={styles.icon} />
      <div className={styles.nameAndMint}>
        <span className={styles.name} />
        <span className={styles.mint} />
      </div>
    </div>
    <div className={styles.amountAndActions}>
      <div className={styles.amountAndDetails}>
        <span className={styles.amount} />
        <span className={styles.notional} />
      </div>
    </div>
  </div>
);

const UnwrapButton = ({
  sessionState,
  ...props
}: ComponentProps<typeof Button> & {
  sessionState: EstablishedSessionState;
}) => {
  const toast = useToast();
  const { network } = useSessionContext();
  const doUnwrap = useCallback(
    async () => {
      try {
        const result = await sessionState.sendTransaction(
          sessionState.getSessionUnwrapInstructions(),
          {
            variation: "Unwrap",
            paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
          },
        );
        if (result.type === TransactionResultType.Success) {
          toast.success(
            "Successfuly unwrapped!",
            <ExplorerLink network={network} txHash={result.signature} />,
          );
        } else {
          // biome-ignore lint/suspicious/noConsole: we want to log the error
          toast.error("Failed to unwrap", errorToString(result.error));
        }
      } catch (error: unknown) {
          // biome-ignore lint/suspicious/noConsole: we want to log the error
          console.error(error);
          toast.error("Failed to unwrap", errorToString(error));
      }
    },
    [sessionState, toast, network],
  );
  const { execute, state } = useAsync(doUnwrap);

  return (
    <Button
      isDisabled={state.type === AsyncStateType.Running}
      isPending={state.type === AsyncStateType.Running}
      hideLoadingSpinner
      onPress={execute}
      {...props}
    >
      Unwrap
    </Button>
  );
};
