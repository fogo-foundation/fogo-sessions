import { signMessageWithKey, verifyMessageWithKey } from "./crypto.js";

const keyPair = {
  privateKey:
    "MC4CAQAwBQYDK2VwBCIEILT9xhhwXWVB+h8DfGqkevdZs8pFZwpa8Kw5on4uIVND",
  publicKey: "MCowBQYDK2VwAyEAcBwsrXv0vA95pMV7mOOjA5jFepvFM4pC9aMpZNiL2RI=",
};
const importKeyPair = async (saved: {
  privateKey: string;
  publicKey: string;
}) => {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(Buffer.from(saved.privateKey, "base64")),
    { name: "Ed25519" },
    true,
    ["sign"],
  );

  const publicKey = await crypto.subtle.importKey(
    "spki",
    Uint8Array.from(Buffer.from(saved.publicKey, "base64")),
    { name: "Ed25519" },
    true,
    ["verify"],
  );

  return { privateKey, publicKey };
};

describe("signMessageWithKey", () => {
  it("signs a message with a session key", async () => {
    const sessionKey = await importKeyPair(keyPair);
    // Generate once
    const message = "Hello";
    const signature = await signMessageWithKey(sessionKey, message);
    expect(signature).toBe(
      "JnBi3bHuv4khj6swz4Xo6Qpur3kx8uqwp75Egr9JmUhbKt8HF7P6L328vMiYeQR7wkr46YVoWmgvkv67M674Zog",
    );
  });
});

describe("verifyMessageWithKey", () => {
  it("returns true if the message and signature are valid", async () => {
    const sessionKey = await importKeyPair(keyPair);
    const [message, signature] = [
      "Hello",
      "JnBi3bHuv4khj6swz4Xo6Qpur3kx8uqwp75Egr9JmUhbKt8HF7P6L328vMiYeQR7wkr46YVoWmgvkv67M674Zog",
    ];
    const isValid = await verifyMessageWithKey(
      sessionKey.publicKey,
      message,
      signature,
    );
    expect(isValid).toBe(true);
  });
  it("returns false if the message or signature are invalid", async () => {
    const sessionKey = await importKeyPair(keyPair);
    const [message, signature] = [
      "Hello2",
      "JnBi3bHuv4khj6swz4Xo6Qpur3kx8uqwp75Egr9JmUhbKt8HF7P6L328vMiYeQR7wkr46YVoWmgvkv67M674Zog",
    ];
    const isValid = await verifyMessageWithKey(
      sessionKey.publicKey,
      message,
      signature,
    );
    expect(isValid).toBe(false);

    const [message2, signature2] = [
      "Hello",
      "KnBi3bHuv4khj6swz4Xo6Qpur3kx8uqwp75Egr9JmUhbKt8HF7P6L328vMiYeQR7wkr46YVoWmgvkv67M674Zog",
    ];
    // check with another key pair
    const isValid2 = await verifyMessageWithKey(
      sessionKey.publicKey,
      message2,
      signature2,
    );
    expect(isValid2).toBe(false);
  });
});
