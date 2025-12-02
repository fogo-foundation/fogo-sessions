import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { motion } from "motion/react";
import { GridList, GridListItem } from "react-aria-components";

import { amountToString } from "../amount-to-string.js";
import { calculateNotional } from "../calculate-notional.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import { CopyButton } from "./copy-button.js";
import { FetchError } from "./fetch-error.js";
import { Link } from "./link.js";
import styles from "./token-list.module.css";
import { TruncateKey } from "./truncate-key.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  StateType as PriceDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";
import * as dnum from "dnum";
import { usePrice } from "../hooks/use-price.js";

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
          items={state.data.tokensInWallet
            .map((token) => ({ ...token, id: token.mint.toBase58() }))
            .sort((a, b) => {
              if (a.name === undefined) {
                return b.name === undefined
                  ? a.mint.toString().localeCompare(b.mint.toString())
                  : 1;
              } else if (b.name === undefined) {
                return -1;
              } else {
                return a.name.toString().localeCompare(b.name.toString());
              }
            })}
        >
          {(token) => (
            <TokenItem
              token={token}
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
  token: Token;
  onPressSend?: (token: Token) => void;
  onPressToken?: (token: Token) => void;
};

const TokenItem = ({ token, onPressSend, onPressToken }: TokenItemProps) => {
  const { mint, amountInWallet, decimals, image, name } = token;
  const amountAsString = amountToString(amountInWallet, decimals);
  const price = usePrice(mint.toBase58());
  const notionalValue =
    price.type === PriceDataStateType.Loaded
      ? calculateNotional(amountInWallet, decimals, price.data)
      : undefined;

  const contents = (
    <>
      <div className={styles.nameAndIcon}>
        {image ? (
          <img alt="" src={image} className={styles.icon} />
        ) : (
          <div className={styles.icon} />
        )}
        <div className={styles.nameAndMint}>
          <span className={styles.name}>{name ?? mint.toBase58()}</span>
          <CopyButton className={styles.mint ?? ""} text={mint.toBase58()}>
            <TruncateKey keyValue={mint} />
          </CopyButton>
        </div>
      </div>
      <div className={styles.amountAndActions}>
        <div className={styles.amountAndDetails}>
          <span className={styles.amount}>{amountAsString}</span>
          {notionalValue !== undefined && (
            <span className={styles.notional}>
              ${dnum.format(notionalValue, { digits: 2, trailingZeros: true })}
            </span>
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
      layoutId={mint.toBase58()}
      layoutScroll
      textValue={name ?? mint.toBase58()}
      key={mint.toString()}
      className={styles.token ?? ""}
      data-is-button={onPressToken !== undefined ? "" : undefined}
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
