import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { WalletIcon } from "@phosphor-icons/react/dist/ssr/Wallet";
import { motion } from "motion/react";
import { GridList, GridListItem } from "react-aria-components";

import { amountToString } from "../amount-to-string.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import { CopyButton } from "./copy-button.js";
import { FetchError } from "./fetch-error.js";
import { Link } from "./link.js";
import styles from "./token-list.module.css";
import { TruncateKey } from "./truncate-key.js";
import { useFaucet } from "../hooks/use-faucet.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";

const MotionGridList = motion.create(GridList<Token>);

type Props = {
  sessionState: EstablishedSessionState;
  onPressReceiveTokens: () => void;
} & (
  | { onPressToken: (token: Token) => void }
  | { onPressSend: (token: Token) => void }
);

export const TokenList = ({
  sessionState,
  onPressReceiveTokens,
  ...props
}: Props) => {
  const { faucetUrl, showFaucet } = useFaucet(sessionState);
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
            <Link onPress={onPressReceiveTokens}>Receive</Link> or{" "}
            <Link
              onPress={showFaucet}
              href={faucetUrl.toString()}
              target="_blank"
            >
              Get tokens
            </Link>
          </span>
        </div>
      ) : (
        <MotionGridList
          layoutId="token-list"
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
          {(token) => {
            const { mint, amountInWallet, decimals, image, name, symbol } =
              token;
            const amountAsString = amountToString(amountInWallet, decimals);
            const contents = (
              <>
                <div className={styles.nameAndIcon}>
                  {image ? (
                    <img alt="" src={image} className={styles.icon} />
                  ) : (
                    <div className={styles.icon} />
                  )}
                  <div className={styles.nameAndMint}>
                    <span className={styles.name}>
                      {name ?? mint.toBase58()}
                    </span>
                    <CopyButton
                      className={styles.mint ?? ""}
                      text={mint.toBase58()}
                    >
                      <TruncateKey keyValue={mint} />
                    </CopyButton>
                  </div>
                </div>
                <div className={styles.amountAndActions}>
                  <div className={styles.amountAndSymbol}>
                    <span className={styles.amount}>{amountAsString}</span>
                    {symbol && <span className={styles.symbol}>{symbol}</span>}
                  </div>
                  {"onPressSend" in props && (
                    <div className={styles.actions}>
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
                    </div>
                  )}
                </div>
              </>
            );
            return (
              <GridListItem
                textValue={name ?? mint.toBase58()}
                key={mint.toString()}
                className={styles.token ?? ""}
                data-is-button={"onPressToken" in props ? "" : undefined}
                {...("onPressToken" in props && {
                  onAction: () => {
                    props.onPressToken(token);
                  },
                })}
              >
                {contents}
              </GridListItem>
            );
          }}
        </MotionGridList>
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
      <div className={styles.amountAndSymbol}>
        <span className={styles.amount} />
        <span className={styles.symbol} />
      </div>
    </div>
  </div>
);
