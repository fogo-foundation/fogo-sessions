# @fogo/sessions-sdk

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
