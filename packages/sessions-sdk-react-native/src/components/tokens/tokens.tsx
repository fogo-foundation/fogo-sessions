import type {PublicKey} from '@solana/web3.js';
import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

import { ReceiveScreen } from './receive-screen';
import { SendTokenScreen } from './send-token-screen';
import { styles } from './styles';
import { TokenListContainer } from './token-list';
import { WalletScreen } from './wallet-screen';
import type {Token} from '../../hooks/use-token-account-data';
import type {EstablishedSessionState} from '../../session-provider';

enum TokenScreenType {
  SelectTokenToSend,
  Send,
  Receive,
  Wallet,
}

type TokenScreen =
  | { type: TokenScreenType.SelectTokenToSend }
  | {
    type: TokenScreenType.Send;
    prevScreen: TokenScreenType;
    icon?: string;
    tokenName?: string;
    tokenMint: PublicKey;
    decimals: number;
    symbol?: string;
    amountAvailable: bigint;
  }
  | { type: TokenScreenType.Receive }
  | { type: TokenScreenType.Wallet };

export type TokensProps = {
  sessionState: EstablishedSessionState;
}

export const Tokens: React.FC<TokensProps> = ({ sessionState }) => {
  const [currentScreen, setCurrentScreen] = useState<TokenScreen>({
    type: TokenScreenType.Wallet,
  });

  const showWallet = useCallback(() => {
    setCurrentScreen({ type: TokenScreenType.Wallet });
  }, []);

  const showSend = useCallback(
    (
      opts: Omit<Extract<TokenScreen, { type: TokenScreenType.Send }>, 'type'>
    ) => {
      setCurrentScreen({ type: TokenScreenType.Send, ...opts });
    },
    []
  );

  const showReceive = useCallback(() => {
    setCurrentScreen({ type: TokenScreenType.Receive });
  }, []);

  const showSelectTokenToSend = useCallback(() => {
    setCurrentScreen({ type: TokenScreenType.SelectTokenToSend });
  }, []);

  switch (currentScreen.type) {
    case TokenScreenType.SelectTokenToSend: {
      return (
        <View>
          <TouchableOpacity style={styles.backButton} onPress={showWallet}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TokenListContainer
            sessionState={sessionState}
            onPressToken={(token: Token) => {
              showSend({
                prevScreen: TokenScreenType.SelectTokenToSend,
                amountAvailable: token.amountInWallet,
                decimals: token.decimals,
                tokenMint: token.mint,
                ...(token.image && { icon: token.image }),
                ...(token.symbol && { symbol: token.symbol }),
                ...(token.name && { tokenName: token.name }),
              });
            }}
          />
        </View>
      );
    }

    case TokenScreenType.Send: {
      return (
        <SendTokenScreen
          {...{
            sessionState,
            onBack: () => {
              if (currentScreen.prevScreen === TokenScreenType.Wallet) {
                showWallet();
              } else if (
                currentScreen.prevScreen === TokenScreenType.SelectTokenToSend
              ) {
                showSelectTokenToSend();
              }
            },
            onSendComplete: showWallet,
            tokenMint: currentScreen.tokenMint,
            decimals: currentScreen.decimals,
            amountAvailable: currentScreen.amountAvailable,
            ...(currentScreen.icon && { icon: currentScreen.icon }),
            ...(currentScreen.symbol && { symbol: currentScreen.symbol }),
            ...(currentScreen.tokenName && { tokenName: currentScreen.tokenName }),
          }}
        />
      );
    }

    case TokenScreenType.Receive: {
      return <ReceiveScreen sessionState={sessionState} onBack={showWallet} />;
    }

    case TokenScreenType.Wallet: {
      return (
        <WalletScreen
          sessionState={sessionState}
          onReceive={showReceive}
          onSelectTokenToSend={showSelectTokenToSend}
          onSendToken={(token: Token) => {
            showSend({
              prevScreen: TokenScreenType.Wallet,
              amountAvailable: token.amountInWallet,
              decimals: token.decimals,
              tokenMint: token.mint,
              ...(token.image && { icon: token.image }),
              ...(token.symbol && { symbol: token.symbol }),
              ...(token.name && { tokenName: token.name }),
            });
          }}
        />
      );
    }
    default: {
      return;
    }
  }
};
