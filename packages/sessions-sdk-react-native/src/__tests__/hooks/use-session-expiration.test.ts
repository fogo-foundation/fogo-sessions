import { renderHook, waitFor } from '@testing-library/react-native';
import { useSessionExpiration } from '../../hooks/use-session-expiration';
import { getSessionAccount } from '@fogo/sessions-sdk';
import { createMockPublicKey, mockConnection } from '../test-utils';
import type { EstablishedSessionState } from '../../session-provider';

// Mock the sessions SDK
jest.mock('@fogo/sessions-sdk', () => ({
  getSessionAccount: jest.fn(),
}));

const mockGetSessionAccount = getSessionAccount as jest.MockedFunction<typeof getSessionAccount>;

describe('useSessionExpiration', () => {
  const createMockSessionState = (overrides?: Partial<EstablishedSessionState>): EstablishedSessionState => ({
    type: 7, // StateType.Established
    connection: mockConnection,
    sessionPublicKey: createMockPublicKey('session'),
    walletPublicKey: createMockPublicKey('wallet'),
    payer: createMockPublicKey('payer'),
    sendTransaction: jest.fn(),
    adapter: {} as any,
    signMessage: jest.fn(),
    isLimited: false,
    setLimits: jest.fn(),
    endSession: jest.fn(),
    updateLimitsError: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful expiration fetch', () => {
    it('should fetch and return session expiration', async () => {
      const expiration = new Date('2024-12-31T23:59:59Z');
      const mockSessionAccount = {
        authorizedPrograms: { type: 'all' as const },
        authorizedTokens: { type: 'all' as const },
        extra: null,
        major: 1,
        minor: 1,
        patch: 0,
        expiration,
        sponsor: createMockPublicKey('sponsor'),
        user: createMockPublicKey('user'),
      } as any;

      mockGetSessionAccount.mockResolvedValueOnce(mockSessionAccount);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.expiration).toBeNull();
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toEqual(expiration);
      expect(result.current.error).toBeNull();
      expect(mockGetSessionAccount).toHaveBeenCalledWith(
        sessionState.connection,
        sessionState.sessionPublicKey
      );
    });

    it('should refetch when sessionPublicKey changes', async () => {
      const expiration1 = new Date('2024-12-31T23:59:59Z');
      const expiration2 = new Date('2025-01-31T23:59:59Z');

      mockGetSessionAccount
        .mockResolvedValueOnce({ 
          authorizedPrograms: { type: 'all' as const },
          authorizedTokens: { type: 'all' as const },
          extra: null,
          major: 1,
          minor: 1,
          patch: 0,
          expiration: expiration1,
          sponsor: createMockPublicKey('sponsor'),
          user: createMockPublicKey('user'),
        } as any)
        .mockResolvedValueOnce({ 
          authorizedPrograms: { type: 'all' as const },
          authorizedTokens: { type: 'all' as const },
          extra: null,
          major: 1,
          minor: 1,
          patch: 0,
          expiration: expiration2,
          sponsor: createMockPublicKey('sponsor'),
          user: createMockPublicKey('user'),
        } as any);

      const sessionState1 = createMockSessionState({
        sessionPublicKey: createMockPublicKey('session1')
      });

      const { result, rerender } = renderHook(
        ({ sessionState }) => useSessionExpiration(sessionState),
        { initialProps: { sessionState: sessionState1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toEqual(expiration1);

      const sessionState2 = createMockSessionState({
        sessionPublicKey: createMockPublicKey('session2')
      });

      rerender({ sessionState: sessionState2 });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toEqual(expiration2);
      expect(mockGetSessionAccount).toHaveBeenCalledTimes(2);
    });

    it('should refetch when connection changes', async () => {
      const expiration = new Date('2024-12-31T23:59:59Z');
      mockGetSessionAccount.mockResolvedValue({ 
        expiration, 
        sessionKey: createMockPublicKey(), 
        authorized: true 
      });

      const sessionState1 = createMockSessionState();
      const { result, rerender } = renderHook(
        ({ sessionState }) => useSessionExpiration(sessionState),
        { initialProps: { sessionState: sessionState1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const sessionState2 = createMockSessionState({
        connection: { ...mockConnection, rpcEndpoint: 'https://different-endpoint.com' } as any
      });

      rerender({ sessionState: sessionState2 });

      await waitFor(() => {
        expect(mockGetSessionAccount).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('should handle session account not found', async () => {
      mockGetSessionAccount.mockResolvedValueOnce(null);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toBeNull();
      expect(result.current.error).toEqual(new Error('Session account not found'));
    });

    it('should handle getSessionAccount throwing error', async () => {
      const error = new Error('Network error');
      mockGetSessionAccount.mockRejectedValueOnce(error);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toBeNull();
      expect(result.current.error).toBe(error);
    });

    it('should reset error on successful retry', async () => {
      const error = new Error('Network error');
      const expiration = new Date('2024-12-31T23:59:59Z');

      mockGetSessionAccount
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ expiration, sessionKey: createMockPublicKey(), authorized: true });

      const sessionState1 = createMockSessionState();
      const { result, rerender } = renderHook(
        ({ sessionState }) => useSessionExpiration(sessionState),
        { initialProps: { sessionState: sessionState1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(error);

      // Trigger refetch by changing session state
      const sessionState2 = createMockSessionState({
        sessionPublicKey: createMockPublicKey('different-session')
      });

      rerender({ sessionState: sessionState2 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.expiration).toEqual(expiration);
    });
  });

  describe('loading state', () => {
    it('should start with loading=true', () => {
      mockGetSessionAccount.mockImplementation(() => new Promise(() => {})); // Never resolves

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      expect(result.current.loading).toBe(true);
      expect(result.current.expiration).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should set loading=true when refetching', async () => {
      const expiration = new Date('2024-12-31T23:59:59Z');
      mockGetSessionAccount.mockResolvedValue({ 
        expiration, 
        sessionKey: createMockPublicKey(), 
        authorized: true 
      });

      const sessionState1 = createMockSessionState();
      const { result, rerender } = renderHook(
        ({ sessionState }) => useSessionExpiration(sessionState),
        { initialProps: { sessionState: sessionState1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const sessionState2 = createMockSessionState({
        sessionPublicKey: createMockPublicKey('different-session')
      });

      rerender({ sessionState: sessionState2 });

      expect(result.current.loading).toBe(true);
    });

    it('should set loading=false after error', async () => {
      const error = new Error('Test error');
      mockGetSessionAccount.mockRejectedValueOnce(error);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('session account variations', () => {
    it('should handle session account with different properties', async () => {
      const expiration = new Date('2024-12-31T23:59:59Z');
      const mockSessionAccount = {
        expiration,
        sessionKey: createMockPublicKey('session'),
        authorized: false,
        additionalProperty: 'test',
      };

      mockGetSessionAccount.mockResolvedValueOnce(mockSessionAccount);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toEqual(expiration);
      expect(result.current.error).toBeNull();
    });

    it('should handle undefined session account', async () => {
      mockGetSessionAccount.mockResolvedValueOnce(undefined as any);

      const sessionState = createMockSessionState();
      const { result } = renderHook(() => useSessionExpiration(sessionState));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.expiration).toBeNull();
      expect(result.current.error).toEqual(new Error('Session account not found'));
    });
  });
});