import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import { QRCodeSVG } from "qrcode.react";

import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { CopyButton } from "./component-library/CopyButton/index.js";
import { createStyles } from "./component-library/css/index.js";

type Props = {
  onPressDone: () => void;
  sessionState: EstablishedSessionState;
};

export const ReceivePage = ({ onPressDone, sessionState }: Props) => (
  <div className={classes.receivePage}>
    <div className={classes.header}>
      <h1 className={classes.title}>
        <QrCodeIcon className={classes.icon} />
        <span className={classes.text}>Receive</span>
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
    <div className={classes.body}>
      <QRCodeSVG
        className={classes.qrCode}
        value={sessionState.walletPublicKey.toBase58()}
      />
      <CopyButton
        variant="expanded"
        className={classes.copyWalletKeyButton}
        text={sessionState.walletPublicKey.toBase58()}
      >
        <code className={classes.walletAddress}>
          {sessionState.walletPublicKey.toBase58()}
        </code>
      </CopyButton>
    </div>
  </div>
);

const { classes } = createStyles("fogo-receive-page", (theme) => {
  const titleRules = {
    display: "flex",
    flexFlow: "row nowrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
  };

  return {
    body: {
      alignItems: "center",
      display: "flex",
      flexFlow: "column nowrap",
      flexGrow: "1",
      gap: theme.spacing(4),
      paddingTop: theme.spacing(12),
      textAlign: "center",
    },
    copyWalletKeyButton: {
      width: theme.spacing(50),
    },
    header: {
      padding: theme.spacing(2),
      paddingRight: theme.spacing(3),
    },
    icon: {
      color: theme.color.accent,
      fontSize: theme.spacing(4),
      margin: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
    },
    qrCode: {
      background: theme.colorPalette.white,
      borderRadius: theme.borderRadius.xl,
      height: theme.spacing(50),
      padding: theme.spacing(4),
      width: theme.spacing(50),
    },
    receivePage: {
      ...titleRules,
      display: "flex",
      flexFlow: "column nowrap",
      height: "100%",
    },
    text: {
      ...theme.textStyles("base", "medium"),
      color: theme.color.heading,
    },
    title: { ...titleRules, margin: 0 },
  };
});
