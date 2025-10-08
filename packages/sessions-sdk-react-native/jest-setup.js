// @testing-library/react-native v12.4+ has built-in Jest matchers

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-camera  
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  },
  CameraView: jest.fn(() => null),
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => jest.fn(() => null));

// Mock @scure/base
jest.mock('@scure/base', () => ({
  base58: {
    encode: jest.fn((data) => 'mock-base58-encoded'),
    decode: jest.fn((data) => new Uint8Array(32)),
  },
}));

// Mock crypto.subtle for session store tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: jest.fn(),
      exportKey: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    },
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 0, height: 0 }),
}));

// Mock react-native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock SWR
jest.mock('swr', () => ({
  default: jest.fn(),
  mutate: jest.fn(),
}));

// Mock @fogo/sessions-sdk
jest.mock('@fogo/sessions-sdk', () => ({
  establishSession: jest.fn(),
  replaceSession: jest.fn(),
  reestablishSession: jest.fn(),
  createSolanaWalletAdapter: jest.fn(),
  getSessionAccount: jest.fn(),
  sendTransfer: jest.fn(),
  SessionResultType: {
    Success: 'success',
    Failed: 'failed',
  },
  TransactionResultType: {
    Success: 'success',
    Failed: 'failed',
  },
  AuthorizedTokens: {
    Specific: 'specific',
    Unlimited: 'unlimited',
  },
}));

// Mock @solana/web3.js Connection methods
jest.mock('@solana/web3.js', () => {
  // Create a mock PublicKey class
  class MockPublicKey {
    constructor(value) {
      this._value = value || 'mock-public-key';
      this._bn = { toArrayLike: () => new Array(32).fill(0) };
    }
    
    toBase58() {
      return this._value;
    }
    
    equals(other) {
      return this._value === other._value;
    }
    
    toString() {
      return this._value;
    }
    
    static isOnCurve() {
      return true;
    }
  }

  // Create mock Transaction
  class MockTransaction {
    constructor() {
      this.instructions = [];
      this.feePayer = null;
      this.recentBlockhash = null;
    }
    
    serialize() {
      return new Uint8Array(100);
    }
    
    static from(buffer) {
      return new MockTransaction();
    }
  }

  // Create mock VersionedTransaction
  class MockVersionedTransaction {
    constructor() {
      this.message = {};
      this.signatures = [];
    }
    
    serialize() {
      return new Uint8Array(100);
    }
    
    static deserialize(buffer) {
      return new MockVersionedTransaction();
    }
  }

  return {
    PublicKey: MockPublicKey,
    Transaction: MockTransaction,
    VersionedTransaction: MockVersionedTransaction,
    Connection: jest.fn().mockImplementation(() => ({
      getAccountInfo: jest.fn(),
      getBalance: jest.fn(),
      getTokenAccountsByOwner: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
      getLatestBlockhash: jest.fn(),
      sendRawTransaction: jest.fn(),
    })),
    SystemProgram: {
      transfer: jest.fn(),
      createAccount: jest.fn(),
    },
    LAMPORTS_PER_SOL: 1000000000,
  };
});

// Silence console.error and console.warn in tests unless explicitly testing them
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});