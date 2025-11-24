---
"@fogo/sessions-sdk-react": patch
---

Fix bug that allowed creating unlimited sessions when enableUnlimited is false or undefined. Ensure the Session Limits modal pops up before creating unlimited sessions
