import assert from "node:assert";
import util from "node:util";
import type {
  Address,
  Lamports,
  KeyPairSigner,
  TransactionMessage,
  TransactionMessageWithFeePayer,
  AddressesByLookupTableAddress,
} from "@solana/kit";
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  appendTransactionMessageInstructions,
  compressTransactionMessageUsingAddressLookupTables,
  generateKeyPairSigner,
  signBytes,
} from "@solana/kit";
import type { RoArray, RoUint8Array } from "@xlabs-xyz/const-utils";
import { zip } from "@xlabs-xyz/const-utils";
import { base58, definedOrThrow } from "@xlabs-xyz/utils";
import { serialize, deserialize, calcStaticSize } from "@xlabs-xyz/binary-layout";
import { TransactionMetadata, FailedTransactionMetadata } from "@xlabs-xyz/fork-svm";
import { ForkSvm } from "@xlabs-xyz/fork-svm";
import {
  type Ix,
  addressLookupTableLayout,
  tokenProgramId,
  findAta,
  minimumBalanceForRentExemption,
  tokenAccountLayout,
  getTokenBalance as getSplTokenBalance,
  addLifetimeAndSendTx,
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

export const fogoRpcUrl = "https://testnet.fogo.io";

export const fogo = (value: number) => BigInt(value) * 10n**9n;

export const assertTxSuccess = async (txResult: Promise<TransactionMetadata>) => {
  try {
    return await txResult;
  } catch (error) {
    if (error instanceof FailedTransactionMetadata) {
      console.log(
        `tx should succeed but failed with error:\n` +
          (error as FailedTransactionMetadata)?.toString(),
      );
      assert(false);
    }
    throw error;
  }
};

export const genKp = () => generateKeyPairSigner().then((kp) => [kp.address, kp] as const);

export const signMessageFunc =
  (signer: KeyPairSigner) =>
    (msg: RoUint8Array) =>
      signBytes(signer.keyPair.privateKey, msg);

export const createHelpers = (forkSvm: ForkSvm) => {
  const rpc = forkSvm.createForkRpc();

  const createAccount = (address: Address, data: Uint8Array, programId: Address, lamports?: bigint) =>
    forkSvm.setAccount(address, {
      owner: programId,
      executable: false,
      lamports: lamports ?? minimumBalanceForRentExemption(data.length),
      data,
      space: BigInt(data.length),
    });

  const createAta = (owner: Address, mint: Address, balance: bigint) => {
    const ata = findAta({ owner, mint });
    const rentExempt = minimumBalanceForRentExemption(calcStaticSize(tokenAccountLayout())!);
    const totalLamports = rentExempt + balance;

    createAccount(
      ata,
      serialize(tokenAccountLayout(), {
        mint,
        owner,
        amount: balance as Lamports,
        state: "Initialized",
        isNative: 0n as Lamports,
        delegate: undefined,
        delegatedAmount: 0n as Lamports,
        closeAuthority: undefined,
      }),
      tokenProgramId,
      totalLamports,
    );
    return ata;
  };

  const getTokenBalance = (address: Address) =>
    getSplTokenBalance(rpc, address).then(balance => balance ?? 0n);

  const createAndSendTx = async (
    instructions: RoArray<Ix>,
    feePayer: KeyPairSigner,
    additionalSigners: RoArray<KeyPairSigner> = [],
    alts: RoArray<Address> = [],
  ) => {
    const altDict =
      zip([alts, await forkSvm.getAccount(alts)])
      .reduce((acc, [altAddr, altInfo]) => {
          acc[altAddr] = deserialize(
            addressLookupTableLayout,
            definedOrThrow(altInfo?.data)
          ).addresses as Address[];
          return acc;
        },
        {} as AddressesByLookupTableAddress
      );

    const tx = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(feePayer.address, tx),
      (tx) => appendTransactionMessageInstructions(instructions, tx),
      (tx) => compressTransactionMessageUsingAddressLookupTables(tx, altDict),
    );

    const signature = await addLifetimeAndSendTx(rpc, tx, [feePayer, ...additionalSigners]);
    const txMetadata = forkSvm.getTransaction(base58.decode(signature));
    if (!txMetadata)
      throw new Error(`Transaction ${signature} not found`);

    if ("err" in txMetadata)
      throw new Error(`Transaction failed: ${txMetadata.toString()}`);

    return txMetadata;
  };

  return {
    createAccount,
    createAta,
    getTokenBalance,
    createAndSendTx,
  };
};

