import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { TouchableOpacity, ActivityIndicator, View, Text } from 'react-native';
import { PublicKey } from '@solana/web3.js';

import { CustomBottomSheet } from '../bottom-sheet';
import { WalletSelectBottomSheet } from '../select-wallet-sheet';
import { SessionPanel } from './session-panel';
import { TruncateKey } from '../ui/truncate-key';

import {
  StateType as SessionStateType,
  useSession,
  useSessionContext,
  isEstablished,
  type EstablishedSessionState,
} from '../../session-provider';

import { styles } from './styles';

/**
 * Properties for configuring the SessionButton component.
 *
 * @public
 */
export interface SessionButtonProps {
  /** Optional spending limits to request when establishing a session */
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
}

/**
 * Primary UI component for session management.
 *
 * This button displays the current session state and provides the main
 * interaction point for users to establish, manage, or end sessions.
 * The button appearance and behavior changes based on the session state.
 *
 * @example
 * ```tsx
 * import { SessionButton } from '@leapwallet/sessions-sdk-react-native';
 * import { PublicKey } from '@solana/web3.js';
 *
 * function MyComponent() {
 *   const limits = new Map([
 *     [new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 1000000n] // 1 USDC
 *   ]);
 *
 *   return (
 *     <SessionButton requestedLimits={limits} />
 *   );
 * }
 * ```
 *
 * @param props - Configuration props for the component
 * @returns JSX element rendering the session button
 *
 * @category UI Components
 * @public
 */
export const SessionButton: React.FC<SessionButtonProps> = ({}) => {
  const { whitelistedTokens, onStartSessionInit } = useSessionContext();
  const sessionState = useSession();
  const prevSessionState = useRef(sessionState);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);

  const handlePress = useCallback(() => {
    if (isEstablished(sessionState)) {
      setSessionPanelOpen(true);
    } else if ((sessionState as any).type === SessionStateType.NotEstablished) {
      if (onStartSessionInit === undefined) {
        setWalletSelectorOpen(true);
      } else {
        const callbackReturn = onStartSessionInit();
        if (callbackReturn instanceof Promise) {
          callbackReturn
            .then((shouldStartSession) => {
              if (shouldStartSession !== false) {
                setWalletSelectorOpen(true);
              }
            })
            .catch((error: unknown) => {
              console.error('Error in `onStartSessionInit` callback', error);
            });
        } else if (callbackReturn !== false) {
          setWalletSelectorOpen(true);
        }
      }
    }
  }, [sessionState, onStartSessionInit]);

  const isLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

  useEffect(() => {
    if (sessionState.type !== prevSessionState.current.type) {
      if (
        isEstablished(sessionState) &&
        !isEstablished(prevSessionState.current) &&
        (prevSessionState.current as any).type !== SessionStateType.CheckingStoredSession
      ) {
        setSessionPanelOpen(true);
      }
      prevSessionState.current = sessionState;
    }
  }, [sessionState]);

  const handleWalletConnect = useCallback(() => {
    setWalletSelectorOpen(false);
  }, []);

  const isModalOpen = useMemo(() => {
    return (
      sessionPanelOpen &&
      isEstablished(sessionState) &&
      !!sessionState.walletPublicKey
    );
  }, [sessionPanelOpen, sessionState]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.sessionButton,
          sessionPanelOpen && styles.sessionButtonActive,
          isLoading && styles.sessionButtonLoading,
        ]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={styles.loader}
          />
        )}

        {isEstablished(sessionState) ? (
          <View style={styles.walletInfo}>
            <Text style={styles.walletAddress}>
              <TruncateKey keyValue={sessionState.walletPublicKey} />
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </View>
        ) : (
          <Text style={styles.loginText}>Login with FOGO</Text>
        )}
      </TouchableOpacity>

      <WalletSelectBottomSheet
        isOpen={walletSelectorOpen}
        onOpenChange={setWalletSelectorOpen}
        onConnect={handleWalletConnect}
      />

      <CustomBottomSheet
        heading="Your Wallet"
        isOpen={isModalOpen}
        onOpenChange={setSessionPanelOpen}
        snapPoints={['70%', '90%']}
      >
        {({ close }) => (
          <SessionPanel
            sessionState={sessionState as EstablishedSessionState}
            onClose={close}
            whitelistedTokens={whitelistedTokens}
          />
        )}
      </CustomBottomSheet>
    </>
  );
};
