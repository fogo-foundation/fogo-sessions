/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/example.json`.
 */
export type Example = {
  "address": "91VRuqpFoaPnU1aj8P7rEY53yFUn2yEFo831SVbRaq45",
  "metadata": {
    "name": "example",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "exampleTransfer",
      "discriminator": [
        213,
        46,
        157,
        218,
        26,
        66,
        41,
        246
      ],
      "accounts": [
        {
          "name": "sessionKey",
          "signer": true
        },
        {
          "name": "cpiSigner",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  111,
                  103,
                  111,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  105,
                  103,
                  110,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "sink",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
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
  "types": [
    {
      "name": "authorizedProgram",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "docs": [
              "The program ID that the session key is allowed to interact with"
            ],
            "type": "pubkey"
          },
          {
            "name": "signerPda",
            "docs": [
              "The PDA of `program_id` with seeds `PROGRAM_SIGNER_SEED`, which is required to sign for in-session token transfers"
            ],
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
            "name": "user",
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
            "name": "authorizedPrograms",
            "docs": [
              "Programs the session key is allowed to interact with as a (program_id, signer_pda) pair. We store the signer PDAs so we don't have to recalculate them"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "authorizedProgram"
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
