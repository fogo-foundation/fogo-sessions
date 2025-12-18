import { Network } from "@fogo/sessions-sdk";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import { Toolbar, Button as UnstyledButton } from "react-aria-components";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import { TokenList } from "./token-list.js";
import styles from "./wallet-page.module.css";

type Props = {
  onPressSend: () => void;
  onPressSendForToken: (token: Token) => void;
  onPressReceive: () => void;
  onPressGet: () => void;
  onPressWithdraw: () => void;
  onPressTransferIn: () => void;
  sessionState: EstablishedSessionState;
};

export const WalletPage = ({
  onPressSend,
  onPressSendForToken,
  onPressReceive,
  onPressGet,
  onPressWithdraw,
  onPressTransferIn,
  sessionState,
}: Props) => {
  const { network } = useSessionContext();
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
        {network === Network.Mainnet ? (
          <UnstyledButton
            className={styles.topButton ?? ""}
            onPress={onPressTransferIn}
          >
            <DownloadSimpleIcon className={styles.icon} />
            <span className={styles.text}>Transfer in</span>
          </UnstyledButton>
        ) : (
          <UnstyledButton
            className={styles.topButton ?? ""}
            onPress={onPressGet}
          >
            <HandCoinsIcon className={styles.icon} />
            <span className={styles.text}>Get tokens</span>
          </UnstyledButton>
        )}
        <UnstyledButton
          className={styles.topButton ?? ""}
          onPress={onPressWithdraw}
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
          <ExportIcon className={styles.icon} />
          <span className={styles.text}>Transfer out</span>
        </UnstyledButton>
      </Toolbar>
      <TokenList
        sessionState={sessionState}
        onPressSend={onPressSendForToken}
        onPressTransferIn={onPressTransferIn}
      />
    </div>
  );
};
