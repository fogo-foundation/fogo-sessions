import {
    default as Transport,
    StatusCodes,
    TransportStatusError,
  } from "@ledgerhq/hw-transport";
import { VersionedTransaction, type Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import {default as TransportNodeHid} from "@ledgerhq/hw-transport-node-hid";
import { getDerivationPath } from "@solana/wallet-adapter-ledger";

export async function parseDerivationPath(source: string): Promise<{ derivationAccount?: number, derivationChange?: number }> {
    const params = new URLSearchParams(new URL(source).searchParams);
    const key = params.get("key");
    if (key === null) {
      return {}
    } else {
      const parts = key.split("/");
      if (parts.length == 1){
        return { derivationAccount: Number(parts[0]) }
      } else if (parts.length == 2){
        return { derivationAccount: Number(parts[0]), derivationChange: Number(parts[1]) }
      } else {
        throw new Error("The provided derivation path is too long: " + key);
      }
    }
  }

  
const INS_GET_PUBKEY = 0x05;
const INS_SIGN_MESSAGE = 0x06;

const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;

const P2_EXTEND = 0x01;
const P2_MORE = 0x02;

const MAX_PAYLOAD = 255;

const LEDGER_CLA = 0xe0;

async function getPublicKey(transport: Transport.default, derivationPath: Buffer): Promise<PublicKey> {
    const bytes = await send(transport, INS_GET_PUBKEY, P1_NON_CONFIRM, derivationPath);
    return new PublicKey(bytes);
}

async function signTransaction(
    transport: Transport.default,
    transaction: Transaction | VersionedTransaction,
    derivationPath: Buffer
): Promise<Buffer> {
    const paths = Buffer.alloc(1);
    paths.writeUInt8(1, 0);

    const message = transaction instanceof VersionedTransaction
        ? transaction.message.serialize()
        : transaction.serializeMessage();
    const data = Buffer.concat([paths, derivationPath, message]);

    return await send(transport, INS_SIGN_MESSAGE, P1_CONFIRM, data);
}

async function send(transport: Transport.default, instruction: number, p1: number, data: Buffer): Promise<Buffer> {
    let p2 = 0;
    let offset = 0;

    if (data.length > MAX_PAYLOAD) {
        while (data.length - offset > MAX_PAYLOAD) {
            const buffer = data.subarray(offset, offset + MAX_PAYLOAD);
            const response = await transport.send(LEDGER_CLA, instruction, p1, p2 | P2_MORE, buffer);
            // @ts-ignore -- TransportStatusError is a constructor Function, not a Class
            if (response.length !== 2) throw new TransportStatusError(StatusCodes.INCORRECT_DATA);

            p2 |= P2_EXTEND;
            offset += MAX_PAYLOAD;
        }
    }

    const buffer = data.subarray(offset);
    const response = await transport.send(LEDGER_CLA, instruction, p1, p2, buffer);

    return response.subarray(0, response.length - 2);
}


// This class is inspired by LedgerWalletAdapter from @solana/wallet-adapter-ledger
export class LedgerNodeWallet {
    private _derivationPath: Buffer;
    private _transport: Transport.default;
    publicKey: PublicKey;

    constructor(derivationPath: Buffer, transport: Transport.default, publicKey: PublicKey) {
        this._derivationPath = derivationPath;
        this._transport = transport;
        this.publicKey = publicKey;
    }

    static async create({derivationAccount, derivationChange}: {derivationAccount?: number, derivationChange?: number}): Promise<LedgerNodeWallet> {
        const transport = await TransportNodeHid.default.create();
        const derivationPath = getDerivationPath(derivationAccount, derivationChange);
        const publicKey = await getPublicKey(transport, derivationPath);
        console.log("Loaded ledger wallet with public key: " + publicKey.toBase58());
        return new LedgerNodeWallet(derivationPath, transport, publicKey);
    }


    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
            const transport = this._transport;
            const publicKey = this.publicKey;
            const signature = await signTransaction(transport, transaction, this._derivationPath);
            transaction.addSignature(publicKey, signature);
            return transaction;
    }


    async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
        for (const tx of txs) {
            await this.signTransaction(tx);
        }
        return txs;
    }
}

