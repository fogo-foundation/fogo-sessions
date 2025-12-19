import { Network } from "@fogo/sessions-sdk";

import { useFaucet } from "../hooks/use-faucet.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { EstablishedSessionState } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { createStyles } from "./component-library/css/index.js";

type Props = {
  onPressBack: () => void;
  onPressDeposit: () => void;
  sessionState: EstablishedSessionState;
};

export const GetTokensPage = ({
  onPressBack,
  onPressDeposit,
  sessionState,
}: Props) => {
  const { network } = useSessionContext();
  const { faucetUrl, showFaucet } = useFaucet(sessionState);

  return (
    <div className={classes.getTokensPage}>
      <Button
        onPress={onPressBack}
        variant="outline"
        className={classes.backButton}
      >
        Back
      </Button>
      <ul className={classes.options}>
        {network === Network.Testnet && (
          <Button
            href={faucetUrl.toString()}
            onPress={showFaucet}
            target="_blank"
            variant="outline"
          >
            Faucet
          </Button>
        )}
        <Button onPress={onPressDeposit} variant="outline">
          Transfer USDC from Solana
        </Button>
      </ul>
    </div>
  );
};

const { classes } = createStyles("fogo-get-tokens-page", (theme) => ({
  backButton: {
    left: theme.spacing(4),
    position: "absolute",
    top: theme.spacing(4),
  },
  getTokensPage: {
    height: "100%",
    position: "relative",
  },
  options: {
    alignItems: "center",
    display: "flex",
    flexFlow: "column nowrap",
    gap: theme.spacing(6),
    justifyContent: "stretch",
    margin: 0,
    padding: `${theme.spacing(24)} ${theme.spacing(8)}`,

    "& > *": {
      width: "100%",
    },
  },
}));
