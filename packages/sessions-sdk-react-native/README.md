React Native components and hooks for Solana session-based wallet connections.

## Installation

```sh
npm install @fogo/sessions-sdk-react-native
npx sessions-sdk-setup  # Installs necessary packages and polyfills required for this SDK
```

## Usage

### Basic Setup

Wrap your app with the `FogoSessionProvider` to enable session functionality:

```tsx
import React from 'react';
import { FogoSessionProvider, SessionButton, SessionLimitsSheet } from '@fogo/sessions-sdk-react-native';

export default function App() {
  return (
    <FogoSessionProvider
      endpoint="YOUR_SOLANA_RPC_ENDPOINT"
      redirectUrl="yourapp://wallet"
      domain="yourapp.com"
      tokens={['TOKEN_MINT_ADDRESS']} // e.g., USDC mint
      defaultRequestedLimits={{
        'TOKEN_MINT_ADDRESS': 1000000n // Token spending limit
      }}
    >
      <YourApp />
      <SessionLimitsSheet />
    </FogoSessionProvider>
  );
}

function YourApp() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <SessionButton />
    </View>
  );
}
```

### Using Session State

Access session information throughout your app:

```tsx
import { useSession, StateType } from '@fogo/sessions-sdk-react-native';

function MyComponent() {
  const sessionState = useSession();

  if (sessionState.type === StateType.Established) {
    return (
      <Text>
        Session active for wallet: {sessionState.walletPublicKey.toBase58()}
      </Text>
    );
  }

  return <Text>No active session</Text>;
}
```

### Token Account Data

Fetch token balances and metadata:

```tsx
import { useTokenAccountData } from '@fogo/sessions-sdk-react-native';

function TokenList() {
  const sessionState = useSession();

  if (sessionState.type === StateType.Established) {
    const { data: tokenData, loading, error } = useTokenAccountData(sessionState);

    if (loading) return <Text>Loading tokens...</Text>;
    if (error) return <Text>Error loading tokens</Text>;

    return (
      <View>
        {tokenData?.map(token => (
          <Text key={token.mint}>
            {token.symbol}: {token.balance}
          </Text>
        ))}
      </View>
    );
  }

  return null;
}
```

### Building Custom UI

Instead of using the pre-built components, you can build your own UI using the provided hooks:

```tsx
import {
  useSession,
  StateType,
  useTokenAccountData
} from '@fogo/sessions-sdk-react-native';

function CustomSessionManager() {
  const sessionState = useSession();

  // Handle different session states
  switch (sessionState.type) {
    case StateType.Initializing:
      return <Text>Setting up session...</Text>;

    case StateType.NotEstablished:
      return (
        <TouchableOpacity onPress={() => sessionState.establishSession()}>
          <Text>Connect Wallet</Text>
        </TouchableOpacity>
      );

    case StateType.SelectingWallet:
      return <Text>Please select a wallet...</Text>;

    case StateType.WalletConnecting:
      return <Text>Connecting to wallet...</Text>;

    case StateType.CheckingStoredSession:
      return <Text>Checking existing session...</Text>;

    case StateType.RequestingLimits:
      return <Text>Setting spending limits...</Text>;

    case StateType.Established:
      return <EstablishedSessionView sessionState={sessionState} />;

    default:
      return <Text>Loading...</Text>;
  }
}

function EstablishedSessionView({ sessionState }) {
  const { data: tokens, loading } = useTokenAccountData(sessionState);

  return (
    <View>
      <Text>Connected: {sessionState.walletPublicKey.toBase58()}</Text>

      {loading ? (
        <Text>Loading token balances...</Text>
      ) : (
        <View>
          {tokens?.map(token => (
            <View key={token.mint} style={{ flexDirection: 'row' }}>
              <Text>{token.symbol || 'Unknown'}</Text>
              <Text>{token.balance}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => sessionState.endSession()}>
        <Text>Disconnect</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Advanced Hook Usage

```tsx
// Get session context for more control
import { useSessionContext } from '@fogo/sessions-sdk-react-native';

function AdvancedComponent() {
  const {
    sessionState,
    whitelistedTokens,
    onStartSessionInit
  } = useSessionContext();

  // Custom session initialization logic
  const handleCustomInit = useCallback(() => {
    if (onStartSessionInit) {
      const result = onStartSessionInit();
      if (typeof result === 'boolean' && !result) {
        // Handle initialization cancellation
        return;
      }
    }
    // Continue with default flow
  }, [onStartSessionInit]);

  return (
    <View>
      {/* Your custom UI */}
    </View>
  );
}
```

### Custom Session Limits UI

Build your own session limits interface using the session context:

```tsx
import { useSessionContext, StateType } from '@fogo/sessions-sdk-react-native';

function CustomSessionLimits() {
  const {
    sessionState,
    whitelistedTokens,
    enableUnlimited,
    isSessionLimitsOpen,
    onSessionLimitsOpenChange,
    requestedLimits
  } = useSessionContext();

  // Only show when requesting limits
  if (sessionState.type !== StateType.RequestingLimits) {
    return null;
  }

  const handleSubmit = (limits: Map<PublicKey, bigint>) => {
    sessionState.onSubmitLimits(limits);
  };

  return (
    <View>
      <Text>Set Spending Limits</Text>
      {whitelistedTokens?.map(token => (
        <View key={token.mint.toBase58()}>
          <Text>{token.symbol}</Text>
          {/* Your custom limit input UI */}
        </View>
      ))}
      <TouchableOpacity onPress={() => handleSubmit(new Map())}>
        <Text>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Transaction Sending

```tsx
import { useSendToken } from '@fogo/sessions-sdk-react-native';

function SendTokenForm({ sessionState, tokenMint }) {
  const sendToken = useSendToken({
    sessionState,
    tokenMint,
    onSuccess: (signature) => {
      console.log('Transaction sent:', signature);
    },
    onError: (error) => {
      console.error('Transaction failed:', error);
    }
  });

  const handleSend = () => {
    sendToken.send({
      recipientAddress: 'RECIPIENT_ADDRESS_HERE',
      amount: 1000000n // Amount in token's smallest unit
    });
  };

  return (
    <TouchableOpacity
      onPress={handleSend}
      disabled={sendToken.loading}
    >
      <Text>{sendToken.loading ? 'Sending...' : 'Send Token'}</Text>
    </TouchableOpacity>
  );
}
```

## Documentation

For complete API documentation organized by categories, run:

```sh
yarn docs
yarn docs:serve
```

This will generate and serve the full TypeDoc documentation locally with sections for:
- **Core Providers** - Main session provider components
- **UI Components** - Pre-built React Native components
- **React Hooks** - Hooks for session management and token operations
- **Utilities** - Helper functions for common operations
- **Types & Enums** - TypeScript types and enumerations


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
