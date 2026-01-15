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
import { DomainVariation } from "./domain-variations";

export const Variation = () => {
  const { appId, domainId: domainConfigId } = useParams<{
    appId: string;
    domainId: string;
  }>();
  const sessionState = useSession();
  // todo move this to sdk
  const isWalletLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

  if (isWalletLoading) {
    return <VariationContents isLoading />;
  } else if (isEstablished(sessionState)) {
    return (
      <VariationContents
        sessionState={sessionState}
        domainConfigId={domainConfigId}
        appId={appId}
      />
    );
  } else {
    return;
  }
};

type VariationContentsProps =
  | {
      isLoading?: false;
      sessionState: EstablishedSessionState;
      appId: string;
      domainConfigId: string;
    }
  | {
      isLoading: true;
    };

const VariationContents = (props: VariationContentsProps) => {
  if (props.isLoading) {
    return <DomainVariation isLoading />;
  }
  return (
    <VariationData
      sessionState={props.sessionState}
      domainConfigId={props.domainConfigId}
      appId={props.appId}
    />
  );
};

const VariationData = ({
  sessionState,
  domainConfigId,
  appId,
}: {
  sessionState: EstablishedSessionState;
  domainConfigId: string;
  appId: string;
}) => {
  const userData = useUserData(sessionState);
  switch (userData.type) {
    case StateType.Loading: {
      return <DomainVariation isLoading />;
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
      const domainConfig = app.domain_configs.find(
        (domainConfig) => domainConfig.id === domainConfigId,
      );
      if (!domainConfig) {
        return <div>Domain config not found</div>;
      }
      return <DomainVariation app={app} domainConfig={domainConfig} />;
    }
    default: {
      return;
    }
  }
};
