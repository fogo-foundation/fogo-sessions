import { useState, useRef, useEffect } from "react";

import type { EstablishedSessionState } from "../session-state.js";
import styles from "./session-limits-tab.module.css";
import { SessionLimits } from "./session-limits.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

export const SessionLimitsTab = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => (
  <div className={styles.sessionLimitsTab}>
    <SessionExpiryBanner expiration={sessionState.expiration} />
    <SessionLimits
      sessionState={sessionState}
      className={styles.sessionLimits}
      bodyClassName={styles.body}
      footerClassName={styles.footer}
      hideCancel
      buttonText="Update Limits"
      header={
        <div className={styles.header}>
          <h2 className={styles.title}>Session Limits</h2>
          <span className={styles.description}>
            Limit how many tokens this app is allowed to interact with
          </span>
        </div>
      }
    />
  </div>
);

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { style: "long" });

const SessionExpiryBanner = ({ expiration }: { expiration: Date }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [expired, setExpired] = useState(false);
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const update = () => {
      const interval = expiration.getTime() - Date.now();
      const args = getRelativeTimeFormatArgs(interval);
      if (args === undefined) {
        setExpired(true);
      } else {
        setExpired(false);
        setFormatted(
          relativeTimeFormat.format(Math.floor(interval / args[0]), args[1]),
        );
        timeoutRef.current = setTimeout(update, args[0]);
      }
    };
    clearTimeout(timeoutRef.current);
    update();
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [expiration]);

  return (
    <div
      className={styles.sessionExpiryBanner}
      data-expired={expired ? "" : undefined}
    >
      {expired ? (
        "Session is expired"
      ) : (
        <span>
          Session expires <span className={styles.expiry}>{formatted}</span>
        </span>
      )}
    </div>
  );
};

const getRelativeTimeFormatArgs = (interval: number) => {
  if (interval > ONE_DAY_IN_MS) {
    return [ONE_DAY_IN_MS, "day"] as const;
  } else if (interval > ONE_HOUR_IN_MS) {
    return [ONE_HOUR_IN_MS, "hour"] as const;
  } else if (interval > ONE_MINUTE_IN_MS) {
    return [ONE_MINUTE_IN_MS, "minute"] as const;
  } else if (interval > ONE_SECOND_IN_MS) {
    return [ONE_SECOND_IN_MS, "second"] as const;
  } else {
    return;
  }
};
