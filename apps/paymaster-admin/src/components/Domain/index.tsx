"use client";
import { StateType } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import { useParams } from "next/navigation";

import { FetchUserDataStateType, useUserData } from "../../client/paymaster";
import { UserNotFound } from "../UserNotFound";
import { PaymasterLoading } from "../loading";
import { AppDomains } from "./app-domains";

export const Domain = () => {
  const { appId } = useParams<{ appId: string }>();
  const sessionState = useSession();
  const isWalletLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

  if (isWalletLoading) {
    return <DomainContents isLoading />;
  } else if (isEstablished(sessionState)) {
    return <DomainContents sessionState={sessionState} appId={appId} />;
  } else {
    return;
  }
};

type DomainContentsProps =
  | {
      isLoading?: false;
      sessionState: EstablishedSessionState;
      appId: string;
    }
  | {
      isLoading: true;
    };

const DomainContents = (props: DomainContentsProps) => {
  if (props.isLoading) {
    return <PaymasterLoading />;
  }
  return <DomainData sessionState={props.sessionState} appId={props.appId} />;
};

const DomainData = ({
  sessionState,
  appId,
}: {
  sessionState: EstablishedSessionState;
  appId: string;
}) => {
  const userData = useUserData(sessionState);
  switch (userData.type) {
    case StateType.Loading: {
      return <PaymasterLoading />;
    }
    case StateType.Error: {
      return <div>Error loading user data: {userData.error.message}</div>;
    }
    case StateType.Loaded: {
      if (userData.data.type === FetchUserDataStateType.NotFound) {
        return <UserNotFound />;
      }
      const app = userData.data.user.apps.find((app) => app.id === appId);
      if (!app) {
        return <div>App not found</div>;
      }
      return (
        <div>
          <h1>App {app.name} Domains</h1>
          <AppDomains app={app} />
        </div>
      );
    }
    default: {
      return;
    }
  }
};
