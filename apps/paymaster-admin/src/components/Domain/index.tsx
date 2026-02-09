"use client";
import { StateType } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  isWalletLoading,
  useSession,
} from "@fogo/sessions-sdk-react";

import { FetchUserDataStateType, useUserData } from "../../client/paymaster";
import { UserNotFound } from "../UserNotFound";
import { AppDomains } from "./app-domains";

export const Domain = ({ appId }: { appId: string }) => {
  const sessionState = useSession();

  if (isWalletLoading(sessionState)) {
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
    return <AppDomains isLoading />;
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
      return <AppDomains isLoading />;
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
      return <AppDomains app={app} />;
    }
    default: {
      return;
    }
  }
};
