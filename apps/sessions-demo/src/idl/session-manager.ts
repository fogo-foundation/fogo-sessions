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
      "name": "startSession",
      "discriminator": [
        23,
        227,
        111,
        142,
        212,
        230,
        3,
        175
      ],
      "accounts": [
        {
          "name": "sponsor"
        },
        {
          "name": "session",
          "writable": true
        },
        {
          "name": "sysvarInstructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "sessionSetter",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  115,
                  101,
                  116,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "session",
      "discriminator": [
        243,
        81,
        72,
        115,
        214,
        188,
        72,
        144
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidArgument"
    }
  ],
  "types": [
    {
      "name": "audienceItem",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "program",
            "type": "pubkey"
          },
          {
            "name": "signerPda",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "extra",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "vec": {
              "defined": {
                "name": "extraItem"
              }
            }
          }
        ]
      }
    },
    {
      "name": "extraItem",
      "type": {
        "kind": "struct",
        "fields": [
          "string",
          "string"
        ]
      }
    },
    {
      "name": "session",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sponsor",
            "docs": [
              "The key that sponsored the session (gas and rent)"
            ],
            "type": "pubkey"
          },
          {
            "name": "sessionInfo",
            "type": {
              "defined": {
                "name": "sessionInfo"
              }
            }
          }
        ]
      }
    },
    {
      "name": "sessionInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "subject",
            "docs": [
              "The user who started this session"
            ],
            "type": "pubkey"
          },
          {
            "name": "expiration",
            "docs": [
              "The expiration time of the session"
            ],
            "type": "i64"
          },
          {
            "name": "audience",
            "docs": [
              "Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "audienceItem"
                }
              }
            }
          },
          {
            "name": "extra",
            "docs": [
              "Extra (key, value)'s provided by the user"
            ],
            "type": {
              "defined": {
                "name": "extra"
              }
            }
          }
        ]
      }
    }
  ]
};
