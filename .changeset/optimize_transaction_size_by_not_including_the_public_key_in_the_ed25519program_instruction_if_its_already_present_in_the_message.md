---
@fogo/sessions-sdk: patch
---

# Optimize transaction size by not including the public key in the Ed25519Program instruction if it's already present in the message.
