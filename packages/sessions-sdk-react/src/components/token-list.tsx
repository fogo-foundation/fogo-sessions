import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { motion } from "motion/react";
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
import { FetchError } from "./fetch-error.js";
import { NotionalAmount } from "./notional-amount.js";
import styles from "./token-list.module.css";
import { TruncateKey } from "./truncate-key.js";

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
              {...item}
              {...("onPressSend" in props && {
                onPressSend: props.onPressSend,
              })}
              {...("onPressToken" in props && {
                onPressToken: props.onPressToken,
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
  onPressSend?: (token: Token) => void;
  onPressToken?: (token: Token) => void;
};

const TokenItem = ({
  id,
  token,
  onPressSend,
  onPressToken,
}: TokenItemProps) => {
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
      <div className={styles.amountAndActions}>
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
        {onPressSend && (
          <div className={styles.actions}>
            <Button
              variant="secondary"
              size="sm"
              className={styles.sendButton ?? ""}
              onPress={() => {
                onPressSend(token);
              }}
            >
              <PaperPlaneTiltIcon />
            </Button>
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
      data-is-button={onPressToken === undefined ? undefined : ""}
      {...(onPressToken && {
        onAction: () => {
          onPressToken(token);
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
