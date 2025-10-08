import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

import { amountToString } from '../../utils/amount-to-string';
import { type Token } from '../../hooks/use-token-account-data';

import { styles } from './styles';

export interface TokenItemProps {
  token: Token;
  onPress?: (token: Token) => void;
  onPressSend?: (token: Token) => void;
}

export const TokenItem: React.FC<TokenItemProps> = ({
  token,
  onPress,
  onPressSend,
}) => {
  const { mint, amountInWallet, decimals, image, name, symbol } = token;
  const amountAsString = amountToString(amountInWallet, decimals);

  const handlePress = useCallback(() => {
    onPress?.(token);
  }, [onPress, token]);

  const handleSendPress = useCallback(() => {
    onPressSend?.(token);
  }, [onPressSend, token]);

  return (
    <TouchableOpacity
      style={styles.tokenItem}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.tokenContent}>
        {image && !image.includes('.svg') ? (
          <Image source={{ uri: image }} style={styles.tokenIcon} />
        ) : (
          <View style={styles.tokenIconPlaceholder} />
        )}

        <View style={styles.tokenInfo}>
          <Text style={styles.tokenName}>{name || mint.toBase58()}</Text>
          <Text style={styles.tokenAmount}>
            {amountAsString}{' '}
            {symbol || (amountAsString === '1' ? 'Token' : 'Tokens')}
          </Text>
        </View>

        {onPressSend && (
          <TouchableOpacity
            style={styles.sendTokenButton}
            onPress={handleSendPress}
          >
            <Text style={styles.sendTokenButtonText}>Send</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
