---
"@fogo/sessions-sdk-react": patch
---

Add the `onSessionStartInit` callback to `<FogoSessionProvider />` which can be used to trigger app code before starting the session init flow. The callback can be async and you can return `false` to indicate that the session init flow should not run.
