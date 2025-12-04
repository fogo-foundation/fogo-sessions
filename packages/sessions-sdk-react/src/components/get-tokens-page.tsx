import { Button } from "@fogo/component-library/Button";
import { Network } from "@fogo/sessions-sdk";

import styles from "./get-tokens-page.module.scss";
import { useFaucet } from "../hooks/use-faucet.js";
import { useSessionContext } from "../hooks/use-session.js";
import type { EstablishedSessionState } from "../session-state.js";

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
    <div className={styles.getTokensPage ?? ""}>
      <Button
        onPress={onPressBack}
        variant="outline"
        className={styles.backButton ?? ""}
      >
        Back
      </Button>
      <ul className={styles.options}>
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
