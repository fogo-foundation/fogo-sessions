# @fogo/sessions-idls

## 0.1.1 (2026-01-15)

### Fixes

- Make native FOGO transfers fee exempt

## 0.1.0 (2026-01-11)

### Breaking Changes

- Cut 0.1.x versions of typescript sdks to avoid versioning issues with transitive dependencies
- Multiple toll recipients for better svm parallelization

## 0.0.13 (2026-01-08)

### Fixes

- Support transferring native tokens with the intent transfer program

## 0.0.12 (2025-12-10)

### Fixes

- Add repository to package.json

## 0.0.11

### Patch Changes

- f28e02a: Mark sponsor as mutable when revoking or closing sessions to make sure it can receive rent

## 0.0.10

### Patch Changes

- 02d8d5c: Rev idl version to account for different arg format for executor quote

## 0.0.9

### Patch Changes

- 79d7449: Add fees to send_tokens and bridge_ntt_tokens

## 0.0.8

### Patch Changes

- c69ea06: Add support for bridging tokens to/from Solana

## 0.0.7

### Patch Changes

- 2273056: Add the tollbooth program and sessions v0.4

## 0.0.6

### Patch Changes

- 0eead65: Add V3 message format to idl

## 0.0.5

### Patch Changes

- 4f85152: Add revokable sessions

## 0.0.4

### Patch Changes

- 12ae7d4: Add support for sending and receiving tokens between wallets
