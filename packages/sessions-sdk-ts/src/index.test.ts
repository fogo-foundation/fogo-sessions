import { signMessageWithKey, verifyMessageWithKey } from "./index.js";

describe("signMessageWithSessionKey", () => {
  it("signs a message with a session key", async () => {
    const sessionKey = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]);
    const message = "Hello";
    const signature = await signMessageWithKey(sessionKey, message);
    expect(signature).toBeDefined();
  });
});

describe("verifyMessageWithSessionKey", () => {
  it("returns true if the message and signature are valid", async () => {
    const sessionKey = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]);
    const message = "Hello";
    const signature = await signMessageWithKey(sessionKey, message);
    const isValid = await verifyMessageWithKey(
      sessionKey.publicKey,
      message,
      signature,
    );
    expect(isValid).toBe(true);
  });
  it("returns false if the message or signature are invalid", async () => {
    const sessionKey = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]);
    const message = "Hello";
    const signature = await signMessageWithKey(sessionKey, message);
    const isValid = await verifyMessageWithKey(
      sessionKey.publicKey,
      "Hello2",
      signature,
    );
    expect(isValid).toBe(false);

    // check with another key pair
    const sessionKey2 = await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ]);
    const isValid2 = await verifyMessageWithKey(
      sessionKey2.publicKey,
      message,
      signature,
    );
    expect(isValid2).toBe(false);
  });
});
