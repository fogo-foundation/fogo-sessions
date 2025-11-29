import { useCallback } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';

import { styles } from './styles';
import type {SessionState} from '../../session-provider';
import { isEstablished  } from '../../session-provider';


export type LogoutButtonProps = {
  sessionState: SessionState;
  onLogout: () => void;
}

export const LogoutButton = ({
  sessionState,
  onLogout,
}: LogoutButtonProps) => {
  const handleLogOut = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to disconnect your wallet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          if (isEstablished(sessionState)) {
            sessionState.endSession();
            onLogout();
          }
        },
      },
    ]);
  }, [sessionState, onLogout]);

  return (
    <TouchableOpacity
      style={styles.logoutButton}
      onPress={handleLogOut}
      disabled={!isEstablished(sessionState)}
      activeOpacity={0.7}
    >
      <Text style={styles.logoutButtonText}>Log Out</Text>
    </TouchableOpacity>
  );
};
