import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import { Button as UnstyledButton, Toolbar } from "react-aria-components";

import type { EstablishedSessionState } from "../session-state.js";
import { TokenList } from "./token-list.js";
import styles from "./wallet-page.module.css";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";

type Props = {
  onPressSend: () => void;
  onPressSendForToken: (token: Token) => void;
  onPressReceive: () => void;
  onPressGet: () => void;
  onPressWithdraw: () => void;
  sessionState: EstablishedSessionState;
};

export const WalletPage = ({
  onPressSend,
  onPressSendForToken,
  onPressReceive,
  onPressGet,
  onPressWithdraw,
  sessionState,
}: Props) => {
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
        <UnstyledButton className={styles.topButton ?? ""} onPress={onPressGet}>
          <HandCoinsIcon className={styles.icon} />
          <span className={styles.text}>Get tokens</span>
        </UnstyledButton>
        <UnstyledButton
          className={styles.topButton ?? ""}
          onPress={onPressWithdraw}
        >
          <ExportIcon className={styles.icon} />
          <span className={styles.text}>Transfer out</span>
        </UnstyledButton>
      </Toolbar>
      <TokenList
        onPressReceiveTokens={onPressReceive}
        sessionState={sessionState}
        onPressSend={onPressSendForToken}
        onPressGetTokens={onPressGet}
      />
    </div>
  );
};
