import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "./button.js";
import { CopyButton } from "./copy-button.js";
import styles from "./receive-page.module.css";
import type { EstablishedSessionState } from "./session-provider.js";

type Props = {
  onPressDone: () => void;
  sessionState: EstablishedSessionState;
};

export const ReceivePage = ({ onPressDone, sessionState }: Props) => (
  <div className={styles.receivePage}>
    <div className={styles.header}>
      <h1 className={styles.title}>
        <QrCodeIcon className={styles.icon} />
        <span className={styles.text}>Receive</span>
      </h1>
      <Button
        variant="secondary"
        size="sm"
        onPress={onPressDone}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      >
        Done
      </Button>
    </div>
    <div className={styles.body}>
      <QRCodeSVG
        className={styles.qrCode}
        value={sessionState.walletPublicKey.toBase58()}
      />
      <CopyButton
        variant="expanded"
        className={styles.copyWalletKeyButton ?? ""}
        text={sessionState.walletPublicKey.toBase58()}
      >
        <code className={styles.walletAddress}>
          {sessionState.walletPublicKey.toBase58()}
        </code>
      </CopyButton>
    </div>
  </div>
);
