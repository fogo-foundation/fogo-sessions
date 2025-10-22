import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

// Simple smoke test for the main index file
import * as SessionsSDK from '../index';

describe('Sessions SDK exports', () => {
  it('should export FogoSessionProvider', () => {
    expect(SessionsSDK.FogoSessionProvider).toBeDefined();
  });

  it('should export useSession hook', () => {
    expect(SessionsSDK.useSession).toBeDefined();
  });

  it('should export StateType enum', () => {
    expect(SessionsSDK.StateType).toBeDefined();
  });

  it('should export session components', () => {
    expect(SessionsSDK.SessionButton).toBeDefined();
    expect(SessionsSDK.SessionLimitsSheet).toBeDefined();
  });

  it('should export wallet components', () => {
    expect(SessionsSDK.WalletSelectBottomSheet).toBeDefined();
    expect(SessionsSDK.QRScanner).toBeDefined();
  });

  it('should export token components', () => {
    expect(SessionsSDK.TokenListContainer).toBeDefined();
    expect(SessionsSDK.SendTokenScreen).toBeDefined();
    expect(SessionsSDK.ReceiveScreen).toBeDefined();
  });

  it('should export hooks', () => {
    expect(SessionsSDK.useSessionLimits).toBeDefined();
    expect(SessionsSDK.useSendToken).toBeDefined();
    expect(SessionsSDK.useSessionExpiration).toBeDefined();
  });

  it('should export wallet adapters', () => {
    expect(SessionsSDK.PhantomMobileWalletAdapter).toBeDefined();
    expect(SessionsSDK.SolflareMobileWalletAdapter).toBeDefined();
    expect(SessionsSDK.BackpackMobileWalletAdapter).toBeDefined();
    expect(SessionsSDK.MobileWalletFactory).toBeDefined();
  });
});
