import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import styles from "./index.module.scss";

export const UserNotFound = () => {
  const sessionState = useSession();
  return (
    <div className={styles.userNotFound}>
      <h1>User not found</h1>
      {isEstablished(sessionState) && (
        <p>
          Wallet Address: <code>{sessionState.walletPublicKey.toBase58()}</code>
        </p>
      )}
      <p>Your account has not been set up in the paymaster system yet.</p>
      <p>Please contact support to get your account set up.</p>
    </div>
  );
};
