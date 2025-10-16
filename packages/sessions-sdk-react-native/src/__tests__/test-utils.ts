// PublicKey will be mocked by jest-setup.js
import type { SessionKeyPair, StoredSession } from '../session-store';
import type { SessionAdapter } from '@fogo/sessions-sdk';

export const createMockPublicKey = (seed = 'test'): any => {
  // This will use the mocked PublicKey from jest-setup.js
  const { PublicKey } = require('@solana/web3.js');
  return new PublicKey(seed);
};

export const createMockSessionKeyPair = (): SessionKeyPair => ({
  privateKey: {
    type: 'private',
    algorithm: { name: 'Ed25519' },
    extractable: false,
    usages: ['sign'],
  } as any,
  publicKey: {
    type: 'public',
    algorithm: { name: 'Ed25519' },
    extractable: true,
    usages: ['verify'],
  } as any,
});

export const createMockStoredSession = (overrides?: Partial<StoredSession>): StoredSession => ({
  sessionKey: createMockSessionKeyPair(),
  walletPublicKey: createMockPublicKey(),
  createdAt: new Date().toISOString(),
  walletName: 'Test Wallet',
  ...overrides,
});

export const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

export const mockCryptoSubtle = {
  importKey: jest.fn(),
  exportKey: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
};

export const mockConnection = {
  getAccountInfo: jest.fn(),
  getBalance: jest.fn(),
  getTokenAccountsByOwner: jest.fn(),
  sendTransaction: jest.fn(),
  confirmTransaction: jest.fn(),
  getLatestBlockhash: jest.fn(),
  sendRawTransaction: jest.fn(),
} as any;

export const mockSessionAdapter = (): Partial<SessionAdapter> => ({
  connection: mockConnection,
  createSession: jest.fn(),
  sendTransaction: jest.fn(),
});

export const mockWalletAdapter = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  signMessage: jest.fn(),
  signTransaction: jest.fn(),
  publicKey: createMockPublicKey(),
  connected: true,
  connecting: false,
  disconnecting: false,
};

export const mockSessionContext = {
  sessionState: {
    type: 0, // StateType.Initializing
  },
  enableUnlimited: false,
  whitelistedTokens: [],
  isSessionLimitsOpen: false,
  onSessionLimitsOpenChange: jest.fn(),
  requestedLimits: undefined,
};

export const createMockTransaction = () => ({
  instructions: [],
  feePayer: createMockPublicKey(),
  recentBlockhash: 'mock-blockhash',
});

export const createMockInstructions = (count = 1) => 
  Array.from({ length: count }, (_, i) => ({
    programId: createMockPublicKey(`program${i}`),
    keys: [],
    data: Buffer.from('mock-data'),
  }));

// Test helpers
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockFetch = (response: any) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(response),
  });
};

export const createMockTokenAccount = (mint: PublicKey, amount = 1000000) => ({
  mint,
  owner: createMockPublicKey('owner'),
  amount: BigInt(amount),
  decimals: 6,
});

export const createMockTokenMetadata = (name = 'Test Token', symbol = 'TEST') => ({
  name,
  symbol,
  description: 'A test token',
  image: 'https://test.com/image.png',
  mint: createMockPublicKey('mint'),
});