import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { PublicKey } from '@solana/web3.js';

import { CopyButton } from '../ui/copy-button';
import { TruncateKey } from '../ui/truncate-key';
import { Tokens } from '../tokens/tokens';
import { SessionLimitsPanel } from './session-limits-panel';

import { type EstablishedSessionState } from '../../session-provider';

import { styles } from './styles';

export interface SessionPanelProps {
  sessionState: EstablishedSessionState;
  onClose: () => void;
  whitelistedTokens: PublicKey[];
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  sessionState,
}) => {
  const [currentTab, setCurrentTab] = useState<'tokens' | 'session'>('tokens');

  return (
    <View style={styles.sessionPanel}>
      <View style={styles.panelHeader}>
        <CopyButton text={sessionState.walletPublicKey.toBase58()}>
          <Text style={styles.walletAddressCode}>
            <TruncateKey keyValue={sessionState.walletPublicKey} />
          </Text>
        </CopyButton>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'tokens' && styles.tabActive]}
          onPress={() => setCurrentTab('tokens')}
        >
          <Text
            style={[
              styles.tabText,
              currentTab === 'tokens' && styles.tabTextActive,
            ]}
          >
            Tokens
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'session' && styles.tabActive]}
          onPress={() => setCurrentTab('session')}
        >
          <Text
            style={[
              styles.tabText,
              currentTab === 'session' && styles.tabTextActive,
            ]}
          >
            Session
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >
        {currentTab === 'tokens' && <Tokens sessionState={sessionState} />}
        {currentTab === 'session' && (
          <SessionLimitsPanel sessionState={sessionState} />
        )}
      </ScrollView>
    </View>
  );
};
