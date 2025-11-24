# @fogo/sessions-sdk-react

## 0.1.3

### Patch Changes

- 4543a2a: Simplify empty wallet UX & omit Get Tokens page in mainnet
- d23c949: Silence Phantom warnings
- fffd28a: Gracefully handle when Solana USDC ATA does not exist
- d86d984: Fix bug that allowed creating unlimited sessions when enableUnlimited is false or undefined. Ensure the Session Limits modal pops up before creating unlimited sessions
- Updated dependencies [5086061]
- Updated dependencies [d23c949]
  - @fogo/sessions-sdk@0.0.23
  - @fogo/sessions-sdk-web@0.0.17

## 0.1.2

### Patch Changes

- c3b04b7: Use central paymaster for transfers & bridging
- d46b221: Disallow setting limits for tokens that the user doesn't have
- 0a7b81e: feat: fetch metadata when on mainnet
- d10d8bd: Fix an issue with Solflare wallet always showing up in the wallets list
- d9bc9dc: Ensure session context only gets initialized once
- 33133b9: Fix stretch animation when loading token list
- f43fc19: Show explicit error if the wallet does not contain enough tokens to pay fees when transferring or bridging out
- 1e32ae7: Persist disclaimer accepted state
- 334b3cb: Enable modals to scroll
- Updated dependencies [c3b04b7]
- Updated dependencies [d46b221]
- Updated dependencies [aa33949]
- Updated dependencies [91bef2a]
- Updated dependencies [d9bc9dc]
- Updated dependencies [d063d55]
  - @fogo/sessions-sdk@0.0.22
  - @fogo/sessions-sdk-web@0.0.16

## 0.1.1

### Patch Changes

- 79d7449: Add fees when transferring tokens or bridging tokens out
- cd6eb60: Remove outdated Solflare Metamask adapter
- f12e2dd: End session on wallet disconnect and handle account switching
- 3a04f78: Update wormhole contract addresses in mainnet
- 8bbcca0: Add disclaimer
- ddccfad: Silence 1password
- 1e1272d: Wait for wallet to be ready before autoConnect
- 80a2f42: Add explorer links to confirmation toasts
- b414fcd: Add network to cache keys
- Updated dependencies [79d7449]
- Updated dependencies [3a04f78]
- Updated dependencies [79d7449]
- Updated dependencies [b414fcd]
  - @fogo/sessions-sdk@0.0.21
  - @fogo/sessions-idls@0.0.9
  - @fogo/sessions-sdk-web@0.0.15

## 0.1.0

### Minor Changes

- 1ee9982: Remove "walletName" from localstorage on logout
- 5dc15bc: Don't pop up wallet on connect each time

### Patch Changes

- 55ad299: Add mainnet bridging config
- Updated dependencies [55ad299]
  - @fogo/sessions-sdk@0.0.20
  - @fogo/sessions-sdk-web@0.0.14

## 0.0.29

### Patch Changes

- c69ea06: Add support for bridging tokens to/from Solana
- Updated dependencies [c69ea06]
  - @fogo/sessions-sdk@0.0.19
  - @fogo/sessions-idls@0.0.8
  - @fogo/sessions-sdk-web@0.0.13

## 0.0.28

### Patch Changes

- 2865daa: Use custom groupBy rather than using Object.groupBy
- e43593c: fix: make legal links open in a new tab
- 0502d6c: Separate SessionPanel component and export it
- 7467535: Add mainnet support
- Updated dependencies [7467535]
  - @fogo/sessions-sdk@0.0.18
  - @fogo/sessions-sdk-web@0.0.12

## 0.0.27

### Patch Changes

- 4b1773b: Mark paymaster prop of FogoSessionProvider as optional

## 0.0.26

### Patch Changes

- 77ee4ed: Fix metadata url
- 3a55a1a: Rewrite wallet interaction code & wallet select modal, expose options to pass a privacy policy URL and/or a terms of service URL
- Updated dependencies [2273056]
- Updated dependencies [3a55a1a]
  - @fogo/sessions-idls@0.0.7
  - @fogo/sessions-sdk@0.0.17
  - @fogo/sessions-sdk-web@0.0.11

## 0.0.25

### Patch Changes

- 80cc3c3: Fix bug with legacy VersionedTransaction using Address Lookup Tables by bumping @solana/kit
- a38c12f: Fix default session duration
- Updated dependencies [80cc3c3]
  - @fogo/sessions-sdk@0.0.16
  - @fogo/sessions-sdk-web@0.0.10

## 0.0.24

### Patch Changes

- Updated dependencies [0eead65]
  - @fogo/sessions-idls@0.0.6
  - @fogo/sessions-sdk@0.0.15
  - @fogo/sessions-sdk-web@0.0.9

## 0.0.23

### Patch Changes

- 54c9764: Add button to copy token mint address
- 7494a3c: Fix bug that was causing the ToastProvider not to memoize appropriately.
- df90b24: Set wallet widget height on mobile
- Updated dependencies [f03a86e]
- Updated dependencies [7db8d6c]
- Updated dependencies [3b21496]
- Updated dependencies [082664c]
- Updated dependencies [864db9b]
  - @fogo/sessions-sdk@0.0.14
  - @fogo/sessions-sdk-web@0.0.8

## 0.0.22

### Patch Changes

- 8137849: Fix overflow issue with tokenless sessions

## 0.0.21

### Patch Changes

- d4c8216: Expose option to apps to set wallet adapters
- fbbaba6: Gracefully handle trading past limits
- 439c1a6: Add callbacks before session sdk modals open
- fa9e0b0: Optimize components for mobile & add compact main button variant
- 02e0139: Add utility functions to generate and verify a login token
- 840580d: Update look & feel of all sessions components
- b12481e: Revoke sessions when logging out
- Updated dependencies [fcfada1]
- Updated dependencies [f67d1e6]
- Updated dependencies [5b62cfa]
- Updated dependencies [9e33d0c]
- Updated dependencies [4f85152]
- Updated dependencies [02e0139]
- Updated dependencies [f482ab4]
- Updated dependencies [b12481e]
  - @fogo/sessions-sdk@0.0.13
  - @fogo/sessions-idls@0.0.5
  - @fogo/sessions-sdk-web@0.0.7

## 0.0.20

### Patch Changes

- 1e3aa67: Apply more z-index fixes

## 0.0.19

### Patch Changes

- d916eac: Relpace react-timeago with a custom component
- 854aa2c: Restore z-index layering

## 0.0.18

### Patch Changes

- Updated dependencies [5167b94]
  - @fogo/sessions-sdk@0.0.12
  - @fogo/sessions-sdk-web@0.0.6

## 0.0.17

### Patch Changes

- Updated dependencies [a600f2a]
  - @fogo/sessions-sdk@0.0.11
  - @fogo/sessions-sdk-web@0.0.5

## 0.0.16

### Patch Changes

- 12ae7d4: Add support for sending and receiving tokens between wallets
- 936b8de: Gracefully handle trading with an expired session by prompting the user to extend their session
- Updated dependencies [99fb073]
- Updated dependencies [12ae7d4]
  - @fogo/sessions-sdk@0.0.10
  - @fogo/sessions-idls@0.0.4
  - @fogo/sessions-sdk-web@0.0.4

## 0.0.15

### Patch Changes

- 032882c: Extend errorToString to have a reasonable behavior with errors that are objects

## 0.0.14

### Patch Changes

- 47baf76: Add bitget wallet to wallet adapter list
- 99edcfc: Don't show session tab in tokenless sessions
- 554fc04: Add button to copy wallet address
- 8a12394: Add the `onSessionStartInit` callback to `<FogoSessionProvider />` which can be used to trigger app code before starting the session init flow. The callback can be async and you can return `false` to indicate that the session init flow should not run.
- 4c47577: Improve faucet integration with gas.zip
- dac3509: Autofocus session limits submit button when creating new sessions & improve focus-visible state for some elements
