# @fogo/sessions-sdk

## 0.0.18

### Patch Changes

- 7467535: Add mainnet support

## 0.0.17

### Patch Changes

- 3a55a1a: Rewrite wallet interaction code & wallet select modal, expose options to pass a privacy policy URL and/or a terms of service URL
- Updated dependencies [2273056]
  - @fogo/sessions-idls@0.0.7

## 0.0.16

### Patch Changes

- 80cc3c3: Fix bug with legacy VersionedTransaction using Address Lookup Tables by bumping @solana/kit

## 0.0.15

### Patch Changes

- Updated dependencies [0eead65]
  - @fogo/sessions-idls@0.0.6

## 0.0.14

### Patch Changes

- f03a86e: Validate and populate extra key-values appropriately in the start session intent message.
- 7db8d6c: Update getAccountInfo call to use 'confirmed' commitment
- 3b21496: Check session expiration in verifyLogInToken
- 082664c: Bump minor version of sessions to 3 to fix a bug where session accounts could be closed without revoking token delegates.
- 864db9b: Declare @noble/hashes as a dependency instead of a devDependency

## 0.0.13

### Patch Changes

- fcfada1: Remove legacy paymaster implementation
- f67d1e6: Add support for the Solana Offchain Message Format (currently used by Ledger wallets)
- 5b62cfa: Propagate paymaster errors in getSponsor
- 9e33d0c: Expose option for creating extractable keys (intended for use on platorms like React Native where key storage cannot be done in the browser)
- 4f85152: Add revokable sessions
- 02e0139: Add utility functions to generate and verify a login token
- b12481e: Revoke sessions when logging out
- Updated dependencies [4f85152]
  - @fogo/sessions-idls@0.0.5

## 0.0.12

### Patch Changes

- 5167b94: Don't swallow errors when parsing paymaster response

## 0.0.11

### Patch Changes

- a600f2a: Add domain query string to paymaster http calls

## 0.0.10

### Patch Changes

- 99fb073: Move transaction confirmation logic to the paymaster server
- 12ae7d4: Add support for sending and receiving tokens between wallets
- Updated dependencies [12ae7d4]
  - @fogo/sessions-idls@0.0.4
