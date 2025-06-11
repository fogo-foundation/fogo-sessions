import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { SPONSOR_KEY, SOLANA_RPC } from "@/config/server";
import bs58 from "bs58";

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(SPONSOR_KEY)));
const wallet = new NodeWallet(payer);
const provider = new AnchorProvider(new Connection(SOLANA_RPC), wallet, {});

export const POST = async (req: Request) => {
  const data = await req.json();
  try {
    const transaction = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(data.transaction, "base64")),
    );
    const signedTransaction = await wallet.signTransaction(transaction);
    await provider.connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: true,
      },
    );
    const signature = signedTransaction.signatures[0];
    if (signature) {
      return Response.json({
        signature: bs58.encode(signature),
      });
    } else {
      return new Response("Signing by sponsor failed", { status: 500 });
    }
  } catch {
    return new Response("Failed to deserialize transaction", { status: 400 });
  }
};
