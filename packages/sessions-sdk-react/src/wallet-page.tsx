import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import {
  Button as UnstyledButton,
  Link as UnstyledLink,
  Toolbar,
} from "react-aria-components";

import type { EstablishedSessionState } from "./session-provider.js";
import { TokenList } from "./token-list.js";
import { useFaucet } from "./use-faucet.js";
import type { Token } from "./use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "./use-token-account-data.js";
import styles from "./wallet-page.module.css";

type Props = {
  onPressSend: () => void;
  onPressSendForToken: (token: Token) => void;
  onPressReceive: () => void;
  sessionState: EstablishedSessionState;
};

export const WalletPage = ({
  onPressSend,
  onPressSendForToken,
  onPressReceive,
  sessionState,
}: Props) => {
  const { faucetUrl, showFaucet } = useFaucet(sessionState);
  const tokenAccountState = useTokenAccountData(sessionState);
  return (
    <div className={styles.walletPage}>
      <Toolbar className={styles.topButtons ?? ""}>
        <UnstyledButton
          className={styles.topButton ?? ""}
          onPress={onPressSend}
          isPending={
            tokenAccountState.type === TokenDataStateType.Loading ||
            tokenAccountState.type === TokenDataStateType.NotLoaded
          }
          isDisabled={
            tokenAccountState.type === TokenDataStateType.Error ||
            (tokenAccountState.type === TokenDataStateType.Loaded &&
              tokenAccountState.data.tokensInWallet.length === 0)
          }
        >
          <PaperPlaneTiltIcon className={styles.icon} />
          <span className={styles.text}>Send</span>
        </UnstyledButton>
        <UnstyledButton
          className={styles.topButton ?? ""}
          onPress={onPressReceive}
        >
          <QrCodeIcon className={styles.icon} />
          <span className={styles.text}>Receive</span>
        </UnstyledButton>
        <UnstyledLink
          className={styles.topButton ?? ""}
          onPress={showFaucet}
          href={faucetUrl.toString()}
          target="_blank"
        >
          <HandCoinsIcon className={styles.icon} />
          <span className={styles.text}>Get tokens</span>
        </UnstyledLink>
      </Toolbar>
      <TokenList
        onPressReceiveTokens={onPressReceive}
        sessionState={sessionState}
        onPressSend={onPressSendForToken}
      />
    </div>
  );
};
