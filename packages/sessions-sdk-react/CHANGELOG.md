# @fogo/sessions-sdk-react

## 0.0.14

### Patch Changes

- 47baf76: Add bitget wallet to wallet adapter list
- 99edcfc: Don't show session tab in tokenless sessions
- 554fc04: Add button to copy wallet address
- 8a12394: Add the `onSessionStartInit` callback to `<FogoSessionProvider />` which can be used to trigger app code before starting the session init flow. The callback can be async and you can return `false` to indicate that the session init flow should not run.
- 4c47577: Improve faucet integration with gas.zip
- dac3509: Autofocus session limits submit button when creating new sessions & improve focus-visible state for some elements
