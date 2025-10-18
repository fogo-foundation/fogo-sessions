"use client";

import type { SessionContext as SessionExecutionContext } from "@fogo/sessions-sdk";
import type { PublicKey } from "@solana/web3.js";
import { createContext, use } from "react";

import type { SessionState } from "../session-state.js";

export const SessionContext = createContext<
  | {
      getSessionContext: () => Promise<SessionExecutionContext>;
      sessionState: SessionState;
      enableUnlimited: boolean;
      whitelistedTokens: PublicKey[];
      defaultRequestedLimits?: Map<PublicKey, bigint> | undefined;
      onStartSessionInit?:
        | (() => Promise<boolean> | boolean)
        | (() => Promise<void> | void)
        | undefined;
    }
  | undefined
>(undefined);

export const useSessionContext = () => {
  const value = use(SessionContext);
  if (value === undefined) {
    throw new NotInitializedError();
  } else {
    return value;
  }
};

export const useSession = () => useSessionContext().sessionState;

class NotInitializedError extends Error {
  constructor() {
    super("This component must be contained within a <FogoSessionProvider>");
    this.name = "NotInitializedError";
  }
}
