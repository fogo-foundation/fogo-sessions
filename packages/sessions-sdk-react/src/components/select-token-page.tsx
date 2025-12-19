import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";

import type { Token } from "../hooks/use-token-account-data.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { createStyles } from "./component-library/css/index.js";
import styles from "./select-token-page.module.css";
import { TokenList } from "./token-list.js";

type Props = {
  onPressBack: () => void;
  onPressSend: (token: Token) => void;
  onPressTransferIn: () => void;
  sessionState: EstablishedSessionState;
};

export const SelectTokenPage = ({
  onPressBack,
  onPressSend,
  onPressTransferIn,
  sessionState,
}: Props) => (
  <div className={classes.selectTokenPage}>
    <div className={classes.header}>
      <h1 className={classes.title}>
        <PaperPlaneTiltIcon className={classes.icon} />
        <span className={classes.text}>Send</span>
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
      sessionState={sessionState}
      onPressToken={onPressSend}
      onPressTransferIn={onPressTransferIn}
    />
  </div>
);

const { classes } = createStyles("fogo-select-token-page", (theme) => {
  const titleRules = {
    alignItems: "center",
    display: "flex",
    flexFlow: "row nowrap",
    gap: theme.spacing(2),
    justifyContent: "space-between",
  };

  return {
    header: {
      ...titleRules,
      padding: theme.spacing(2),
      paddingRight: theme.spacing(3),
    },
    icon: {
      color: theme.color.accent,
      fontSize: theme.spacing(4),
      margin: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
    },
    selectTokenPage: {
      height: "100%",
      overflow: "auto",
      scrollbarWidth: "thin",
    },
    text: {
      ...theme.textStyles("base", "medium"),
      color: theme.color.heading,
    },
    title: {
      ...titleRules,
      margin: 0,
    },
  };
});
