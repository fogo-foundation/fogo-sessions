import { Network } from "@fogo/sessions-sdk";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import {
  ActionButton,
  ActionButtonToolbar,
} from "./component-library/ActionButton/index.js";
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
      <ActionButtonToolbar>
        <ActionButton
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
          icon={<PaperPlaneTiltIcon />}
        >
          Send
        </ActionButton>
        <ActionButton onPress={onPressReceive} icon={<QrCodeIcon />}>
          Receive
        </ActionButton>
        {network === Network.Mainnet ? (
          <ActionButton
            onPress={onPressTransferIn}
            icon={<DownloadSimpleIcon />}
          >
            Transfer in
          </ActionButton>
        ) : (
          <ActionButton onPress={onPressGet} icon={<HandCoinsIcon />}>
            Get tokens
          </ActionButton>
        )}
        <ActionButton
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
          icon={<ExportIcon />}
        >
          Transfer out
        </ActionButton>
      </ActionButtonToolbar>
      <TokenList
        sessionState={sessionState}
        onPressSend={onPressSendForToken}
        onPressTransferIn={onPressTransferIn}
      />
    </div>
  );
};
