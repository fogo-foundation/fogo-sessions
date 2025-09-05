# @fogo/sessions-sdk-react

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
