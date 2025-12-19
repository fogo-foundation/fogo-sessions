"use client";
import { StateType } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  SessionButton,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";

import { FetchUserDataStateType, useUserData } from "../../client/paymaster";
import { UserNotFound } from "../UserNotFound";
import { Auth } from "../Auth";
import { UserApps } from "./user-apps";

export const Home = () => {
  const sessionState = useSession();
  const loadingStates = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.SelectingWallet,
    SessionStateType.WalletConnecting,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.RequestingExtendedExpiry,
    SessionStateType.RequestingIncreasedLimits,
  ];
  if (loadingStates.includes(sessionState.type)) {
    return <div>Loading wallet...</div>;
  }
  if(isEstablished(sessionState)) {
    return <HomeContents sessionState={sessionState} />;
  }
  return <Auth />;
};

const HomeContents = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const userData = useUserData(sessionState);
  switch (userData.type) {
    case StateType.Loading: {
      return <div>Loading user data...</div>;
    }
    case StateType.Error: {
      return <div>Error loading user data: {userData.error}</div>;
    }
    case StateType.Loaded: {
      if (userData.data.type === FetchUserDataStateType.NotFound) {
        return <UserNotFound/>;
      }
      if (userData.data.type === FetchUserDataStateType.Success) {
        return (
          <div>
            <h1>Home</h1>
            <SessionButton />
            <UserApps user={userData.data.user}/>
          </div>
        );
      }
    }
  }
};
