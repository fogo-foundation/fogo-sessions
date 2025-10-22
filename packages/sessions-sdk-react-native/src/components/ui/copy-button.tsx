import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, Clipboard } from 'react-native';

import { styles } from './styles';

export type CopyButtonProps = {
  text: string;
  children: React.ReactNode;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, children }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyAddress = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    Clipboard.setString(text);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  }, [text]);

  return (
    <TouchableOpacity
      style={[styles.copyButton, isCopied && styles.copyButtonCopied]}
      onPress={copyAddress}
      disabled={isCopied}
      activeOpacity={0.7}
    >
      <View style={styles.copyButtonContent}>
        {children}
        <Text style={styles.copyIcon}>{isCopied ? '✓' : '📋'}</Text>
      </View>
    </TouchableOpacity>
  );
};
