import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

import { TokenListContainer } from './token-list';

import { type EstablishedSessionState } from '../../session-provider';
import { type Token } from '../../hooks/use-token-account-data';

import { styles } from './styles';

const FAUCET_URL = 'https://gas.zip/faucet/fogo';

export interface WalletScreenProps {
  sessionState: EstablishedSessionState;
  onReceive: () => void;
  onSelectTokenToSend: () => void;
  onSendToken: (token: Token) => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  sessionState,
  onReceive,
  onSelectTokenToSend,
  onSendToken,
}) => {
  const handleFaucet = useCallback(() => {
    const faucetUrl = `${FAUCET_URL}?address=${sessionState.walletPublicKey.toBase58()}`;
    Linking.openURL(faucetUrl).catch(console.error);
  }, [sessionState.walletPublicKey]);

  return (
    <View>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={onReceive}>
          <Text style={styles.actionButtonIcon}>📥</Text>
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onSelectTokenToSend}
        >
          <Text style={styles.actionButtonIcon}>📤</Text>
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFaucet}>
          <Text style={styles.actionButtonIcon}>🪙</Text>
          <Text style={styles.actionButtonText}>Get Tokens</Text>
        </TouchableOpacity>
      </View>

      <TokenListContainer sessionState={sessionState} onPressSend={onSendToken} />
    </View>
  );
};
