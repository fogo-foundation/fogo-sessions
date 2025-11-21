import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';

import { CustomBottomSheet } from './bottom-sheet';
import { WALLET_CONFIG } from './wallet-config';
import { useMobileWallet } from '../wallet-connect/wallet-provider';

type WalletName = keyof typeof WALLET_CONFIG;

type WalletSelectBottomSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConnect?: (publicKey: PublicKey, walletName: string) => void;
  redirectUrl?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Bottom sheet component for wallet selection.
 *
 * @category UI Components
 * @public
 */
export const WalletSelectBottomSheet: React.FC<
  WalletSelectBottomSheetProps
> = ({ isOpen, onOpenChange, onConnect, title = 'Connect Wallet' }) => {
  const { connect, availableWallets, clearError } = useMobileWallet();
  const [connectingWallet, setConnectingWallet] = useState<string | undefined>(undefined);

  const handleWalletConnect = useCallback(
    async (walletName: string) => {
      try {
        clearError();
        const publicKey = await connect(walletName);

        onConnect?.(publicKey, walletName);
        onOpenChange(false);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Alert.alert(
          'Connection Failed',
          `Failed to connect to ${WALLET_CONFIG[walletName as WalletName].name}: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      } finally {
        setConnectingWallet(undefined);
      }
    },
    [connect, onConnect, onOpenChange, clearError]
  );

  const filteredWallets = availableWallets.filter(
    (wallet) => wallet in WALLET_CONFIG
  ) as WalletName[];

  return (
    <CustomBottomSheet
      heading={title}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      snapPoints={['60%', '85%']}
    >
      {() => (
        <View style={styles.content}>
          {filteredWallets.length === 0 ? (
            <View style={styles.noWalletsContainer}>
              <Text style={styles.noWalletsTitle}>No Wallets Available</Text>
              <Text style={styles.noWalletsText}>
                Please install a supported Solana wallet app to continue.
              </Text>
            </View>
          ) : (
            <View style={styles.walletList}>
              {filteredWallets.map((walletName) => {
                const wallet = WALLET_CONFIG[walletName];
                const isConnecting = connectingWallet === walletName;

                return (
                  <WalletOption
                    key={walletName}
                    name={wallet.name}
                    icon={wallet.icon}
                    color={wallet.color}
                    isConnecting={isConnecting}
                    onPress={() => void handleWalletConnect(walletName)}
                    disabled={connectingWallet !== undefined}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </CustomBottomSheet>
  );
};

const WalletOption: React.FC<{
  name: string;
  icon: string;
  color: string;
  isConnecting: boolean;
  onPress: () => void;
  disabled: boolean;
}> = ({ name, icon, color, isConnecting, onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[
        styles.walletOption,
        disabled && styles.walletOptionDisabled,
        isConnecting && styles.walletOptionConnecting,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.walletIconContainer}>
        {icon.startsWith('data:image/') ? (
          <Image
            source={{ uri: icon }}
            style={styles.walletIconImage}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.walletIcon, { backgroundColor: color }]}>
            <Text style={styles.walletIconText}>{name.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.walletInfo}>
        <Text
          style={[styles.walletName, disabled && styles.walletNameDisabled]}
        >
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const useWalletSelection = () => {
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);

  const openWalletSelector = useCallback(() => {
    setIsWalletSelectorOpen(true);
  }, []);

  const closeWalletSelector = useCallback(() => {
    setIsWalletSelectorOpen(false);
  }, []);

  return {
    isWalletSelectorOpen,
    openWalletSelector,
    closeWalletSelector,
    setIsWalletSelectorOpen,
  };
};

// Updated Connect Button component
export const WalletConnectButton = ({
  onConnect,
  redirectUrl,
  buttonText = 'Connect Wallet',
}: {
  onConnect?: (publicKey: PublicKey, walletName: string) => void;
  redirectUrl?: string;
  buttonText?: string;
}) => {
  const { isWalletSelectorOpen, openWalletSelector, setIsWalletSelectorOpen } =
    useWalletSelection();

  return (
    <>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={openWalletSelector}
        activeOpacity={0.8}
      >
        <Text style={styles.connectButtonText}>{buttonText}</Text>
      </TouchableOpacity>
      {
        onConnect && redirectUrl &&
        <WalletSelectBottomSheet
          isOpen={isWalletSelectorOpen}
          onOpenChange={setIsWalletSelectorOpen}
          onConnect={onConnect}
          redirectUrl={redirectUrl}
        />
      }
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  walletList: {
    gap: 12,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  walletOptionDisabled: {
    opacity: 0.6,
  },
  walletOptionConnecting: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  walletIconContainer: {
    marginRight: 16,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  walletIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  walletNameDisabled: {
    color: '#6B7280',
  },
  walletDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  walletDescriptionDisabled: {
    color: '#9CA3AF',
  },
  walletAction: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  connectIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noWalletsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noWalletsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  noWalletsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
