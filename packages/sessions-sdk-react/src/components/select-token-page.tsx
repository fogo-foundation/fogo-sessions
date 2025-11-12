import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";

import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./button.js";
import styles from "./select-token-page.module.css";
import { TokenList } from "./token-list.js";
import type { Token } from "../hooks/use-token-account-data.js";

type Props = {
  onPressBack: () => void;
  onPressSend: (token: Token) => void;
  onPressReceive: () => void;
  onPressGetTokens: () => void;
  sessionState: EstablishedSessionState;
};

export const SelectTokenPage = ({
  onPressBack,
  onPressSend,
  onPressReceive,
  onPressGetTokens,
  sessionState,
}: Props) => (
  <div className={styles.selectTokenPage}>
    <div className={styles.header}>
      <h1 className={styles.title}>
        <PaperPlaneTiltIcon className={styles.icon} />
        <span className={styles.text}>Send</span>
      </h1>
      <Button
        variant="outline"
        size="sm"
        onPress={onPressBack}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      >
        Back
      </Button>
    </div>
    <TokenList
      onPressReceiveTokens={onPressReceive}
      sessionState={sessionState}
      onPressToken={onPressSend}
      onPressGetTokens={onPressGetTokens}
    />
  </div>
);
