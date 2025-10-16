import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { TokenItem } from './token-item';
import { errorToString } from '../../utils/error-to-string';

import { type EstablishedSessionState } from '../../session-provider';
import {
  TokenDataStateType,
  useTokenAccountData,
  type Token,
} from '../../hooks/use-token-account-data';

import { styles } from './styles';

export interface TokenListContainerProps {
  sessionState: EstablishedSessionState;
  onPressToken?: (token: Token) => void;
  onPressSend?: (token: Token) => void;
}

interface TokenListProps {
  state: ReturnType<typeof useTokenAccountData>,
  onPressToken?: (token: Token) => void;
  onPressSend?: (token: Token) => void;

}

const TokenList: React.FC<TokenListProps> = ({
  state,
  onPressToken,
  onPressSend,
}) => {
  if (state.type !== TokenDataStateType.Loaded) return null
  const tokens = useMemo(() => {
    return state.data.tokensInWallet
      .sort((a, b) => {
        if (a.name === undefined) {
          return b.name === undefined
            ? a.mint.toString().localeCompare(b.mint.toString())
            : 1;
        } else if (b.name === undefined) {
          return -1;
        } else {
          return a.name.toString().localeCompare(b.name.toString());
        }
      })


  }, [state.data.tokensInWallet])


  return (
    <View style={styles.tokenList}>
      {tokens.map((token) => (
        <TokenItem
          key={token.mint.toString()}
          token={token}
          onPress={onPressToken}
          onPressSend={onPressSend}
        />
      ))}
    </View>
  );


}

export const TokenListContainer: React.FC<TokenListContainerProps> = ({
  sessionState,
  onPressToken,
  onPressSend,
}) => {
  const state = useTokenAccountData(sessionState);



  switch (state.type) {
    case TokenDataStateType.Error:
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorToString(state.error)}</Text>
        </View>
      );

    case TokenDataStateType.Loaded:
      if (state.data.tokensInWallet.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your wallet is empty</Text>
          </View>
        );
      }

      return (
        <View style={styles.tokenList}>
          <TokenList state={state} onPressSend={onPressSend} onPressToken={onPressToken} />
        </View>
      );

    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading:
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading tokens...</Text>
        </View>
      );
  }
};
