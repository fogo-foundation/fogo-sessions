import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { styles } from './styles';
import type {EstablishedSessionState} from '../../session-provider';
import { CopyButton } from '../ui/copy-button';

export type ReceiveScreenProps = {
  sessionState: EstablishedSessionState;
  onBack: () => void;
}

export const ReceiveScreen: React.FC<ReceiveScreenProps> = ({
  sessionState,
  onBack,
}) => {
  const walletAddress = sessionState.walletPublicKey.toBase58();

  return (
    <View style={styles.receivePage}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.receiveContainer}>
        <Text style={styles.receiveTitle}>Receive Tokens</Text>

        <View style={styles.qrCodeContainer}>
          <QRCode
            value={walletAddress}
            size={180}
            backgroundColor="white"
            color="black"
          />
        </View>

        <CopyButton text={walletAddress}>
          <Text style={styles.walletAddressFull}>{walletAddress}</Text>
        </CopyButton>
      </View>
    </View>
  );
};
