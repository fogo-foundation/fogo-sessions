import assert from "node:assert";
import util from "node:util";
import type {
  Address,
  Lamports,
  KeyPairSigner,
  Blockhash,
  TransactionMessage,
  TransactionMessageWithFeePayer,
} from "@solana/kit";
import {
  generateKeyPairSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  compileTransaction,
  signTransaction,
  signBytes,
} from "@solana/kit";
import type { RoArray, RoUint8Array } from "@xlabs-xyz/const-utils";
import { serialize, deserialize, calcStaticSize } from "@xlabs-xyz/binary-layout";
import type { TransactionMetadata, FailedTransactionMetadata } from "@xlabs-xyz/fork-svm";
import { ForkSvm } from "@xlabs-xyz/fork-svm";
import {
  type Ix,
  tokenProgramId,
  nativeMint,
  findAta,
  minimumBalanceForRentExemption,
  tokenAccountLayout,
} from "@xlabs-xyz/svm";

util.inspect.defaultOptions = {
  ...util.inspect.defaultOptions,
  depth: null,
  maxArrayLength: null,
  maxStringLength: null,
  breakLength: Infinity,
  compact: false,
  colors: process.stdout.isTTY,
};

export type TxMsg = TransactionMessage & TransactionMessageWithFeePayer;
export type SignableTxMsg = Parameters<typeof compileTransaction>[0];

export const fogoRpcUrl = "https://testnet.fogo.io";

export const fogo = (value: number) => BigInt(value) * 1_000_000_000n;

export const assertTxSuccess = async (txResult: Promise<TransactionMetadata>) => {
  try {
    return await txResult;
  } catch (error) {
    console.log(
      `tx should succeed but failed with error:\n` +
        (error as FailedTransactionMetadata)?.toString(),
    );
    assert(false);
  }
};

export const genKp = () => generateKeyPairSigner().then((kp) => [kp.address, kp] as const);

export const signMessageFunc =
  (signer: KeyPairSigner) =>
    (msg: RoUint8Array) =>
      signBytes(signer.keyPair.privateKey, msg);

export const createAccountHelper =
  (forkSvm: ForkSvm) =>
  (address: Address, data: Uint8Array, programId: Address, lamports?: bigint) =>
    forkSvm.setAccount(address, {
      owner: programId,
      executable: false,
      lamports: lamports ?? minimumBalanceForRentExemption(data.length),
      data,
      space: BigInt(data.length),
    });

export const createSplFogoAtaHelper =
  (createAccount: ReturnType<typeof createAccountHelper>) =>
  (owner: Address, balance: bigint) => {
    const ata = findAta({ owner, mint: nativeMint });
    const rentExempt = minimumBalanceForRentExemption(calcStaticSize(tokenAccountLayout())!);
    const totalLamports = rentExempt + balance;

    createAccount(
      ata,
      serialize(tokenAccountLayout(), {
        mint: nativeMint,
        owner,
        amount: balance as Lamports,
        state: "Initialized",
        isNative: rentExempt as Lamports,
        delegate: undefined,
        delegatedAmount: 0n as Lamports,
        closeAuthority: undefined,
      }),
      tokenProgramId,
      totalLamports,
    );
    return ata;
  };

export const getSplFogoBalance = (forkSvm: ForkSvm) => (address: Address) =>
  forkSvm.getAccount(address).then((accInfo) =>
    accInfo ? deserialize(tokenAccountLayout(), accInfo.data).amount : 0n,
  );

export const createTxHelpers = (forkSvm: ForkSvm) => {
  const sendTx = async (tx: SignableTxMsg, signers: RoArray<KeyPairSigner>) => {
    const compiledTx = compileTransaction(tx);
    const signedTx = await signTransaction(
      signers.map((kp) => kp.keyPair),
      compiledTx as any,
    );
    return forkSvm.sendTransaction(signedTx as any);
  };

  const createAndSendTx = async (
    instructions: RoArray<Ix>,
    feePayer: KeyPairSigner,
    additionalSigners: RoArray<KeyPairSigner> = [],
  ) => {
    let tx: TxMsg = {
      version: "legacy",
      feePayer: { address: feePayer.address },
      instructions,
    };

    tx = setTransactionMessageLifetimeUsingBlockhash(
      {
        blockhash: forkSvm.latestBlockhash() as Blockhash,
        lastValidBlockHeight: forkSvm.latestSlot() + 10n,
      },
      tx,
    );

    return sendTx(tx, [feePayer, ...additionalSigners]);
  };

  return { sendTx, createAndSendTx };
};

