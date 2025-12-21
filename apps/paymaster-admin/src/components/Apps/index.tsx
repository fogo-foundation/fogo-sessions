"use client";
import { StateType } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";

import { FetchUserDataStateType, useUserData } from "../../client/paymaster";
import { Auth } from "../Auth";
import { Navbar } from "../Navbar";
import { UserNotFound } from "../UserNotFound";
import { PaymasterLoading } from "../loading";
import { UserApps } from "./user-apps";

export const Apps = () => {
  const sessionState = useSession();
  if (
    sessionState.type === SessionStateType.Initializing ||
    sessionState.type === SessionStateType.CheckingStoredSession
  ) {
    return <AppsContents isLoading />;
  } else if (isEstablished(sessionState)) {
    return <AppsContents sessionState={sessionState} />;
  } else {
    return <Auth />;
  }
};

type AppsContentsProps =
  | {
      isLoading?: false;
      sessionState: EstablishedSessionState;
    }
  | {
      isLoading: true;
    };

const AppsContents = (props: AppsContentsProps) => {
  if (props.isLoading) {
    return <PaymasterLoading />;
  }
  return <AppData sessionState={props.sessionState} />;
};

const AppData = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
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
      return (
        <div>
          <Navbar />
          <h1>Home</h1>
          <UserApps user={userData.data.user} />
        </div>
      );
    }
  }
};
