import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { useSessionExpiration } from '../../hooks/use-session-expiration';
import {
  useTokenAccountData,
} from '../../hooks/use-token-account-data';
import type {EstablishedSessionState} from '../../session-provider';
import {
  StateType as SessionStateType,
  useSessionContext
  
} from '../../session-provider';
import { errorToString } from '../../utils/error-to-string';
import { SessionLimits } from '../session-limits';
import { TimeUntilExpiration } from '../time-until-expiration';
import { styles } from './styles';
import { TokenDataStateType } from '../../utils/use-data';

export type SessionLimitsPanelProps = {
  sessionState: EstablishedSessionState;
}

export const SessionLimitsPanel: React.FC<SessionLimitsPanelProps> = ({
  sessionState,
}) => {
  const state = useTokenAccountData(sessionState);
  const { whitelistedTokens, enableUnlimited } = useSessionContext();
  const {
    expiration,
    loading: expirationLoading,
    error: expirationError,
  } = useSessionExpiration(sessionState);

  switch (state.type) {
    case TokenDataStateType.Error: {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorToString(state.error)}</Text>
        </View>
      );
    }

    case TokenDataStateType.Loaded: {
      return (
        <View>
          {expiration && !expirationLoading && !expirationError && (
            <TimeUntilExpiration
              expiration={expiration}
              style={styles.sessionExpiryBanner}
              expiredStyle={[
                styles.sessionExpiryBanner,
                styles.sessionExpiryExpired,
              ]}
            />
          )}
          <SessionLimits
            style={styles.sessionLimits}
            tokens={whitelistedTokens}
            initialLimits={
              new Map(
                state.data.sessionLimits.map(({ mint, sessionLimit }) => [
                  mint,
                  sessionLimit,
                ])
              )
            }
            onSubmit={
              sessionState.type === SessionStateType.Established
                ? sessionState.setLimits
                : undefined
            }
            buttonText="Update limits"
            error={
              (sessionState as { type: SessionStateType; updateLimitsError?: unknown }).type === SessionStateType.Established
                ? (sessionState as { updateLimitsError: unknown }).updateLimitsError
                : undefined
            }
            {...(enableUnlimited && {
              enableUnlimited: true,
              isSessionUnlimited: !sessionState.isLimited,
            })}
          />
        </View>
      );
    }

    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }
  }
};
