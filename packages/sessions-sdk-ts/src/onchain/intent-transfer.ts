import type { Address } from "@solana/kit";
import { address, AccountRole } from "@solana/kit";
import { boolItem } from "@xlabs-xyz/binary-layout";
import type { RoUint8Array, RoPair } from "@xlabs-xyz/const-utils";
import type { SvmClient, Ix } from "@xlabs-xyz/svm";
import {
  getDeserializedAccount,
  findAta,
  getMint,
  accountLayout,
  svmAddressItem,
  composeIx,
  clockSysvarId,
  rentSysvarId,
  instructionsSysvarId,
  systemProgramId,
  tokenProgramId,
  associatedTokenProgramId
} from "@xlabs-xyz/svm";
import { base58, definedOrThrow } from "@xlabs-xyz/utils";

import { chainIdPda, getChainId } from "./chainid.js";
import type { Opts } from "./common.js";
import {
  byteDiscriminatedLayout,
  amountToString,
  nonceLayout,
  pdaOfProgram,
  u64Item
} from "./common.js";
import type { ChainId } from "./constants.js";
import { mplMetadataPda, getMplMetadataTruncated } from "./mpl-metadata.js";
import type { SigningFunc } from "./svm-intent.js";
import { composeEd25519IntentVerifyIx } from "./svm-intent.js";
import {
  signedQuoteItem,
  solanaChainId,
  nttAddresses,
  transceiverAddresses,
  coreBridgeAddresses,
  nttWithExecutorProgramId,
  executorProgramId,
} from "./wormhole.js";

export const intentTransferProgramId = address("Xfry4dW9m42ncAqm8LyEnyS5V6xu5DSJTMRQLiGkARD");

export type IntentType = "Transfer" | "Bridge";

const intentFields = {
  Transfer: {
    version: "0.2",
    description: "Fogo Transfer:\n" +
      "Signing this intent will transfer the tokens as described below.\n",
  },
  Bridge: {
    version: "0.2",
    description: "Fogo Bridge Transfer:\n" +
      "Signing this intent will bridge out the tokens as described below.\n",
  }
} as const;

const toNonceSeed = {
  Transfer: "nonce",
  Bridge:   "bridge_ntt_nonce",
} as const;

const pda = pdaOfProgram(intentTransferProgramId);

export const noncePda = (intentType: IntentType, user: Address) =>
  pda(toNonceSeed[intentType], user);

export const feeConfigPda = (mint: Address) =>
  pda("fee_config", mint);

export const intentTransferPda = pda("intent_transfer");

export const feeConfigLayout = accountLayout("FeeConfig", [
  { name: "intrachainTransferFee", ...u64Item },
  { name: "bridgeTransferFee",     ...u64Item },
]);

export const getFeeConfig = (client: SvmClient, mint: Address) =>
  getDeserializedAccount(client, feeConfigPda(mint), feeConfigLayout);

export const getNextNonce = (client: SvmClient, intentType: IntentType, user: Address) =>
  getDeserializedAccount(client, noncePda(intentType, user), nonceLayout)
    .then(nonce => typeof nonce === "bigint" ? nonce + 1n : 1n);

export type CommonAddresses = {
  user:      Address;
  recipient: Address;
  mint:      Address;
  feeMint:   Address;
  sponsor:   Address;
};

export type CommonAddressesIxImpl =
  CommonAddresses & {
    source:    Address;
    feeSource: Address;
  } & Opts<{
    metadata:    Address;
    feeMetadata: Address;
  }>;

export type Cache = Opts<{
  chainId:      ChainId;
  nextNonce:    bigint;
  mintDecimals: number;
  feeDecimals:  number;
  mintSymbol:   string;
  feeSymbol:    string;
  transferFee:  bigint;
}>;

export function composeIntraChainIntentTransferIxs(
  client:      SvmClient,
  signMessage: SigningFunc,
  amount:      bigint,
  addresses:   CommonAddresses,
  cache?:      Cache,
): Promise<[Ix, Ix]> {
  return ixsImpl("Transfer")(client, signMessage, amount, addresses, cache)
    .then(res => [
      res.intentVerifyIx,
      composeIntraChainIntentTransferIx({ ...addresses, ...res.additionalAddresses })
    ]);
}

export function composeBridgeIntentIxs(
  client:                SvmClient,
  signMessage:           SigningFunc,
  amount:                bigint,
  signedQuote:           RoUint8Array,
  payDestinationAtaRent: boolean,
  addresses:             CommonAddresses & NttAddresses,
  cache?:                Cache
): Promise<[Ix, Ix]> {
  return ixsImpl("Bridge")(client, signMessage, amount, addresses, cache)
    .then(({ intentVerifyIx, additionalAddresses, chainId }) => [
      intentVerifyIx,
      composeBridgeIntentIx(
        chainId,
        amount,
        signedQuote,
        payDestinationAtaRent,
        { ...addresses, ...additionalAddresses }
      )
    ]);
}

export function composeIntraChainIntentTransferIx(addresses: CommonAddressesIxImpl) {
  const accounts = commonAccountsImpl("Transfer", addresses);

  return composeIx(accounts, intentTransferIxLayout, {}, intentTransferProgramId);
}

export const expectedNttConfigPda = (mint: Address) =>
  pda("expected_ntt_config", mint);

export const intermediateTokenPda = (source: Address) =>
  pda("bridge_ntt_intermediate", source);

export const expectedNttConfigLayout = accountLayout("ExpectedNttConfig", svmAddressItem);

export const getNttConfig = (client: SvmClient, mint: Address) =>
  getDeserializedAccount(client, expectedNttConfigPda(mint), expectedNttConfigLayout);

export type NttAddresses = {
  nttManager:           Address,
  outboxItem:           Address,
  payeeNttWithExecutor: Address,
};

const bridgeArgsLayout = [
  { name: "signedQuote",           ...signedQuoteItem },
  { name: "payDestinationAtaRent", ...boolItem()      },
] as const;

const intentTransferIxLayout = byteDiscriminatedLayout(0, []);
const intentBridgeIxLayout   = byteDiscriminatedLayout(1, bridgeArgsLayout);

export function composeBridgeIntentIx(
  chainId:               ChainId,
  amount:                bigint,
  signedQuote:           RoUint8Array,
  payDestinationAtaRent: boolean,
  addresses:             CommonAddressesIxImpl & NttAddresses
) {
  const { recipient, mint, nttManager, outboxItem, payeeNttWithExecutor } = addresses;
  const {
    configAccount,
    peerPda,
    outboxRateLimitPda,
    tokenAuthorityPda,
    custodyAta,
    inboxRateLimitPda,
    sessionAuthorityPda,
    registeredTransceiverPda,
  } = nttAddresses(nttManager);
  const { emitterPda, wormholeMessagePda } = transceiverAddresses(nttManager);
  const {
    coreBridgeProgramId,
    bridgePda,
    feeCollectorPda,
    sequencePda,
  } = coreBridgeAddresses(chainId);

  const inboxRateLimit = inboxRateLimitPda(solanaChainId);
  const sessionAuthoritySeedsToHash = {
    amount,
    recipientChain:   solanaChainId,
    recipientAddress: base58.decode(recipient),
    shouldQueue:      false,
  };
  const sessionAuthority = sessionAuthorityPda(intentTransferPda, sessionAuthoritySeedsToHash);
  const wormholeMessage = wormholeMessagePda(outboxItem);
  //the ntt manager is its own transceiver
  const registeredTransceiver = registeredTransceiverPda(nttManager);
  const sequence = sequencePda(emitterPda);
  const peer = peerPda(solanaChainId);
  const custody = custodyAta(mint);
  const nttAccounts = [
    [clockSysvarId,            AccountRole.READONLY       ],
    [rentSysvarId,             AccountRole.READONLY       ],
    [nttManager,               AccountRole.READONLY       ],
    [configAccount,            AccountRole.READONLY       ],
    [inboxRateLimit,           AccountRole.WRITABLE       ],
    [sessionAuthority,         AccountRole.READONLY       ],
    [tokenAuthorityPda,        AccountRole.READONLY       ],
    [wormholeMessage,          AccountRole.WRITABLE       ],
    [registeredTransceiver,    AccountRole.READONLY       ], //called just transceiver in program
    [emitterPda,               AccountRole.READONLY       ],
    [bridgePda,                AccountRole.WRITABLE       ],
    [feeCollectorPda,          AccountRole.WRITABLE       ],
    [sequence,                 AccountRole.WRITABLE       ],
    [coreBridgeProgramId,      AccountRole.READONLY       ],
    [nttWithExecutorProgramId, AccountRole.READONLY       ],
    [executorProgramId,        AccountRole.READONLY       ],
    [peer,                     AccountRole.READONLY       ],
    [outboxItem,               AccountRole.WRITABLE_SIGNER],
    [outboxRateLimitPda,       AccountRole.WRITABLE       ],
    [custody,                  AccountRole.WRITABLE       ],
    [payeeNttWithExecutor,     AccountRole.WRITABLE       ],
  ] as const;

  const accounts = commonAccountsImpl("Bridge", addresses);

  return composeIx(
    [...accounts, ...nttAccounts],
    intentBridgeIxLayout,
    { signedQuote, payDestinationAtaRent },
    intentTransferProgramId
  );
}

const ixsImpl = (intentType: IntentType) => async function (
  client:      SvmClient,
  signMessage: SigningFunc,
  amount:      bigint,
  addresses:   CommonAddresses,
  cache?:      Cache,
) {
  const { user, recipient, mint, feeMint } = addresses;

  const getDecimals = (mint: Address) =>
    getMint(client, mint)
      .then(mintAcc => definedOrThrow(mintAcc, `mint ${mint} not found`).decimals);

  const mintMetadataPda = mplMetadataPda(mint);
  const feeMetadataPda = mplMetadataPda(feeMint);
  const getSymbol = (metadata: Address) =>
    getMplMetadataTruncated(client, { metadata }).then(val => val?.symbol);

  const getTransferFee = () => getFeeConfig(client, feeMint).then(val =>
    definedOrThrow(val, `Fee config not found for mint: ${mint}`)[
      intentType === "Transfer" ? "intrachainTransferFee" : "bridgeTransferFee"
    ]
  );

  const [chainId, nextNonce, mintDecimals, feeDecimals, mintSymbol, feeSymbol, transferFee] =
    await Promise.all([
      cache?.chainId      ?? getChainId(client),
      cache?.nextNonce    ?? getNextNonce(client, intentType, user),
      cache?.mintDecimals ?? getDecimals(mint),
      cache?.feeDecimals  ?? getDecimals(feeMint),
      cache?.mintSymbol   ?? getSymbol(mintMetadataPda),
      cache?.feeSymbol    ?? getSymbol(feeMetadataPda),
      cache?.transferFee  ?? getTransferFee(),
    ]);

  const source      = findAta({ owner: user, mint });
  const feeSource   = findAta({ owner: user, mint: feeMint });
  const metadata    = mintSymbol === undefined ? undefined : mintMetadataPda;
  const feeMetadata = feeSymbol  === undefined ? undefined : feeMetadataPda;

  const { version, description } = intentFields[intentType];
  //ugly discrepancy between intent types
  const recipientFieldName = intentType === "Transfer" ? "recipient" : "recipient_address";
  const intent = {
    description,
    parameters: {
      version,
      ...(intentType === "Transfer"
        ? { chain_id: chainId }
        : { from_chain_id: chainId, to_chain_id: "solana" }
      ),
      token:                mintSymbol ?? mint,
      amount:               amountToString(amount, mintDecimals),
      [recipientFieldName]: recipient,
      fee_token:            feeSymbol ?? feeMint,
      fee_amount:           amountToString(transferFee, feeDecimals),
      nonce:                nextNonce.toString(),
    },
  };

  const intentVerifyIx = await composeEd25519IntentVerifyIx(user, signMessage, intent);

  return {
    intentVerifyIx,
    additionalAddresses: { source, feeSource, metadata, feeMetadata },
    chainId
  } as const;
}

function commonAccountsImpl(intentType: IntentType, addresses: CommonAddressesIxImpl) {
  const { user, recipient, source, mint, sponsor, feeSource, feeMint } = addresses;
  const metadata       = addresses.metadata    ?? intentTransferProgramId;
  const feeMetadata    = addresses.feeMetadata ?? intentTransferProgramId;
  const feeDestination = findAta({ owner: sponsor,   mint: feeMint });
  const nonce          = noncePda(intentType, user);
  const feeConfig      = feeConfigPda(feeMint);

  const destinationOrIntermediate =
    intentType === "Transfer"
    ? findAta({ owner: recipient, mint })
    : intermediateTokenPda(source);

  const mintRole = intentType === "Bridge" ? AccountRole.WRITABLE : AccountRole.READONLY;
  const maybeExpectedNttConfig = intentType === "Bridge"
    ? [[expectedNttConfigPda(mint), AccountRole.READONLY] as const]
    : [];

  const maybeDestinationOwner = intentType === "Transfer"
    ? [[recipient, AccountRole.READONLY] as const]
    : [];

  return [
    [chainIdPda,                AccountRole.READONLY       ],
    [instructionsSysvarId,      AccountRole.READONLY       ],
    [intentTransferPda,         AccountRole.READONLY       ],
    [source,                    AccountRole.WRITABLE       ],
    [destinationOrIntermediate, AccountRole.WRITABLE       ],
    [mint,                      mintRole                   ],
    [metadata,                  AccountRole.READONLY       ],
    ...maybeExpectedNttConfig,
    [nonce,                     AccountRole.WRITABLE       ],
    [sponsor,                   AccountRole.WRITABLE_SIGNER],
    ...maybeDestinationOwner,
    [feeSource,                 AccountRole.WRITABLE       ],
    [feeDestination,            AccountRole.WRITABLE       ],
    [feeMint,                   AccountRole.READONLY       ],
    [feeMetadata,               AccountRole.READONLY       ],
    [feeConfig,                 AccountRole.READONLY       ],
    [systemProgramId,           AccountRole.READONLY       ],
    [tokenProgramId,            AccountRole.READONLY       ],
    [associatedTokenProgramId,  AccountRole.READONLY       ],
  ] as RoPair<Address, AccountRole>[];
}
