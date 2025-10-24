import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

import { styles } from './styles';
import { TokenListContainer } from './token-list';
import type {Token} from '../../hooks/use-token-account-data';
import type {EstablishedSessionState} from '../../session-provider';


const FAUCET_URL = 'https://gas.zip/faucet/fogo';

export type WalletScreenProps = {
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
    Linking.openURL(faucetUrl).catch(() => {
      // Intentionally ignore error if opening URL fails
    });
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
