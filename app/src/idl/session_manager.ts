/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/session_manager.json`.
 */
export type SessionManager = {
  "address": "mCB9AkebGNqN7HhUPxisr7Hd8HzHifCpubj9dCwvctk",
  "metadata": {
    "name": "sessionManager",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "start",
      "discriminator": [
        62,
        15,
        117,
        236,
        47,
        1,
        89,
        139
      ],
      "accounts": [
        {
          "name": "sponsor",
          "signer": true
        }
      ],
      "args": []
    }
  ]
};
