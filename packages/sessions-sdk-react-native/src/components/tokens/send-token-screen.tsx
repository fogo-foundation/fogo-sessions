import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { useSendToken } from '../../hooks/use-send-token';
import type {EstablishedSessionState} from '../../session-provider';
import { amountToString } from '../../utils/amount-to-string';
import { QRScanner } from '../qr-scanner';
import { styles } from './styles';


export type SendTokenScreenProps = {
  sessionState: EstablishedSessionState;
  onBack: () => void;
  onSendComplete: () => void;
  tokenMint: PublicKey;
  decimals: number;
  amountAvailable: bigint;
  icon?: string;
  symbol?: string;
  tokenName?: string;
}

export const SendTokenScreen: React.FC<SendTokenScreenProps> = ({
  sessionState,
  onBack,
  onSendComplete,
  tokenMint,
  decimals,
  amountAvailable,
  icon,
  symbol,
  tokenName,
}) => {
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { state, actions, validation } = useSendToken({
    sessionState,
    tokenMint,
    decimals,
    amountAvailable,
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Tokens sent successfully!',
      });
      onSendComplete();
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: error,
      });
    },
  });

  const handleQRScan = useCallback(
    (data: string) => {
      try {
        new PublicKey(data);
        actions.setRecipient(data);
        Toast.show({
          type: 'success',
          text1: 'Address scanned successfully',
        });
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Invalid address in QR code',
        });
      }
    },
    [actions]
  );

  return (
    <View style={styles.sendContainer}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.sendHeader}>
        {icon && !icon.includes('.svg') ? (
          <Image source={{ uri: icon }} style={styles.tokenIconLarge} />
        ) : (
          <View style={styles.tokenIconPlaceholder} />
        )}
        <Text style={styles.sendTitle}>
          Send {tokenName ?? tokenMint.toBase58()}
        </Text>
        <Text style={styles.availableAmount}>
          {amountToString(amountAvailable, decimals)} {symbol} available
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Recipient</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, styles.inputWithQR]}
            placeholder="Enter wallet address"
            placeholderTextColor="#9CA3AF"
            value={state.recipient}
            onChangeText={actions.setRecipient}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.qrScanButton}
            onPress={() => { setShowQRScanner(true); }}
          >
            <Text style={styles.qrScanButtonText}>📷</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TouchableOpacity onPress={actions.setMaxAmount}>
            <Text style={styles.maxButton}>Max</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          value={state.amount}
          onChangeText={actions.setAmount}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          !validation.isReadyToSend && styles.sendButtonDisabled,
        ]}
        onPress={() => { void actions.validateAndSend(); }}
        disabled={!validation.isReadyToSend}
      >
        {state.isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.sendButtonText}>Send</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          onScan={handleQRScan}
          onClose={() => { setShowQRScanner(false); }}
        />
      </Modal>
    </View>
  );
};
