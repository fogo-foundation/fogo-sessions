import { getAddressFromPublicKey } from "@solana/kit";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";

import {
  establishSession,
  SessionResultType,
  TransactionResultType,
} from "./index.js";

describe("establishSession", () => {
  it("uses the original intent message when the wallet mutates the input buffer", async () => {
    const walletKeys = (await crypto.subtle.generateKey("Ed25519", true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const walletPublicKey = new PublicKey(
      await getAddressFromPublicKey(walletKeys.publicKey),
    );
    const requestedMessages: Uint8Array[] = [];
    let capturedInstructions: TransactionInstruction[] | undefined;

    const result = await establishSession({
      context: {
        chainId: "fogo-testnet",
        domain: "https://play.fogofarm.com",
        payer: new PublicKey("11111111111111111111111111111111"),
        connection: {} as never,
        rpc: {} as never,
        sendTransaction: async (_sessionKey, instructions) => {
          capturedInstructions = instructions;
          return {
            type: TransactionResultType.Failed,
            signature: "test-signature",
            error: { InstructionError: [0, { Custom: 0 }] } as never,
          };
        },
      },
      walletPublicKey,
      signMessage: async (message: Uint8Array) => {
        const requestedMessage = Uint8Array.from(message);
        requestedMessages.push(requestedMessage);
        const signature = new Uint8Array(
          await crypto.subtle.sign(
            "Ed25519",
            walletKeys.privateKey,
            requestedMessage,
          ),
        );

        message.fill(0);

        return signature;
      },
      expires: new Date("2030-01-01T00:00:00.000Z"),
      unlimited: true,
      createUnsafeExtractableSessionKey: true,
    });

    expect(result.type).toBe(SessionResultType.Failed);
    expect(capturedInstructions).toHaveLength(2);
    expect(requestedMessages).toHaveLength(1);

    const requestedMessage = requestedMessages[0];
    const intentInstruction = capturedInstructions?.[0];

    expect(intentInstruction).toBeDefined();
    expect(requestedMessage).toBeDefined();
    if (intentInstruction === undefined || requestedMessage === undefined) {
      throw new Error("Expected captured instructions and requested message");
    }
    expect(
      new TextDecoder().decode(
        intentInstruction.data.subarray(-requestedMessage.length),
      ),
    ).toContain("Fogo Sessions:");
    expect(intentInstruction.data.subarray(-requestedMessage.length)).toEqual(
      requestedMessage,
    );
  });
});
