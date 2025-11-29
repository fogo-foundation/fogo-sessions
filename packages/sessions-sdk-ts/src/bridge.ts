import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { IntentTransferProgram } from "@fogo/sessions-idls";
import { fromLegacyPublicKey } from "@solana/compat";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import type {
  BaseSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
} from "@solana/wallet-adapter-base";
import type { VersionedTransaction } from "@solana/web3.js";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import type {
  Network as WormholeNetwork,
  Chain,
} from "@wormhole-foundation/sdk";
import { Wormhole, wormhole, routes } from "@wormhole-foundation/sdk";
import solanaSdk from "@wormhole-foundation/sdk/solana";
import { contracts } from "@wormhole-foundation/sdk-base";
import { nttExecutorRoute } from "@wormhole-foundation/sdk-route-ntt";
import { utils } from "@wormhole-foundation/sdk-solana-core";
import { NTT } from "@wormhole-foundation/sdk-solana-ntt";
import BN from "bn.js";


import {
  NonceType,
  amountToString,
  getNonce,
} from "./common.js";
import { Network } from "./connection.js";
import type { SessionContext } from "./context.js";
import { SESSIONS_INTERNAL_PAYMASTER_DOMAIN } from "./context.js";
import { chainIdToUsdcMint, usdcDecimals, usdcSymbol } from "./onchain/constants.js";
import { getMplMetadataTruncated, mplMetadataPda } from "./onchain/mpl-metadata.js";
import type { SigningFunc } from "./onchain/svm-intent.js";
import { composeEd25519IntentVerifyIx  } from "./onchain/svm-intent.js";

const CURRENT_BRIDGE_OUT_MAJOR = "0";
const CURRENT_BRIDGE_OUT_MINOR = "2";

const BRIDGING_ADDRESS_LOOKUP_TABLE: Record<
  Network,
  Record<string, string> | undefined
> = {
  [Network.Testnet]: {
    // USDC
    ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND:
      "4FCi6LptexBdZtaePsoCMeb1XpCijxnWu96g5LsSb6WP",
  },
  [Network.Mainnet]: {
    // USDC
    uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG:
      "7hmMz3nZDnPJfksLuPotKmUBAFDneM2D9wWg3R1VcKSv",
  },
};

const BRIDGE_OUT_MESSAGE_HEADER = `Fogo Bridge Transfer:
Signing this intent will bridge out the tokens as described below.
`;
const BRIDGE_OUT_CUS = 240_000;

const NETWORK_TO_WORMHOLE_NETWORK: Record<Network, WormholeNetwork> = {
  [Network.Mainnet]: "Mainnet",
  [Network.Testnet]: "Testnet",
};

const getFee = async (context: SessionContext) => {
  const program = new IntentTransferProgram(
    new AnchorProvider(context.connection, {} as Wallet, {}),
  );
  const usdcMint = new PublicKey(chainIdToUsdcMint[context.chainId]);
  const [feeConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), usdcMint.toBytes()],
    program.programId,
  );
  const feeConfig = await program.account.feeConfig.fetch(feeConfigPda);

  return {
    metadata: mplMetadataPda(fromLegacyPublicKey(usdcMint)),
    mint: usdcMint,
    symbolOrMint: usdcSymbol,
    decimals: usdcDecimals,
    fee: {
      intrachainTransfer: BigInt(feeConfig.intrachainTransferFee.toString()),
      bridgeTransfer: BigInt(feeConfig.bridgeTransferFee.toString()),
    },
  };
};

export const getBridgeOutFee = async (context: SessionContext) => {
  const { fee, ...config } = await getFee(context);
  return {
    ...config,
    fee: fee.bridgeTransfer,
  };
};

export type SendBridgeOutOptions = {
  context: SessionContext;
  sessionKey: CryptoKeyPair;
  sessionPublicKey: PublicKey;
  walletPublicKey: PublicKey;
  solanaWallet: MessageSignerWalletAdapterProps;
  amount: bigint;
  fromToken: WormholeToken & { chain: "Fogo" };
  toToken: WormholeToken & { chain: "Solana" };
  feeConfig: Awaited<ReturnType<typeof getBridgeOutFee>>;
};

export type WormholeToken = {
  chain: Chain;
  mint: PublicKey;
  manager: PublicKey;
  transceiver: PublicKey;
};

export const bridgeOut = async (options: SendBridgeOutOptions) => {
  const { wh, route, transferRequest, transferParams, decimals } =
    await buildWormholeTransfer(options, options.context.connection);
  // @ts-expect-error the wormhole client types are incorrect and do not
  // properly represent the runtime representation.
  const quote = await route.fetchExecutorQuote(transferRequest, transferParams);
  const program = new IntentTransferProgram(
    new AnchorProvider(options.context.connection, {} as Wallet, {}),
  );

  const metadataAddress = mplMetadataPda(fromLegacyPublicKey(options.fromToken.mint));

  const outboxItem = Keypair.generate();

  const [metadata, nttPdas, destinationAtaExists] = await Promise.all([
    getMplMetadataTruncated(options.context.rpc, { metadata: metadataAddress }),
    getNttPdas(
      options,
      wh,
      program,
      outboxItem.publicKey,
      new PublicKey(quote.payeeAddress),
    ),
    getDestinationAtaExists(
      options.context,
      options.toToken.mint,
      options.walletPublicKey,
    ),
  ]);

  const instructions = await Promise.all([
    buildBridgeOutIntent(
      program,
      options,
      decimals,
      metadata?.symbol,
      options.feeConfig.symbolOrMint,
      amountToString(options.feeConfig.fee, options.feeConfig.decimals),
    ),
    program.methods
      .bridgeNttTokens({
        payDestinationAtaRent: !destinationAtaExists,
        signedQuoteBytes: [...quote.signedQuote],
      })
      .accounts({
        sponsor: options.context.internalPayer,
        mint: options.fromToken.mint,
        metadata:
          metadata?.symbol === undefined
            ? // eslint-disable-next-line unicorn/no-null
              null
            : new PublicKey(metadataAddress),
        source: getAssociatedTokenAddressSync(
          options.fromToken.mint,
          options.walletPublicKey,
        ),
        ntt: nttPdas,
        feeMetadata: options.feeConfig.metadata,
        feeMint: options.feeConfig.mint,
        feeSource: getAssociatedTokenAddressSync(
          options.feeConfig.mint,
          options.walletPublicKey,
        ),
      })
      .instruction(),
  ]);

  return options.context.sendTransaction(
    options.sessionKey,
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: BRIDGE_OUT_CUS }),
      ...instructions,
    ],
    {
      variation: "Intent NTT Bridge",
      paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
      extraSigners: [outboxItem],
      addressLookupTable:
        BRIDGING_ADDRESS_LOOKUP_TABLE[options.context.network]?.[
          options.fromToken.mint.toBase58()
        ],
    },
  );
};

const getDestinationAtaExists = async (
  context: SessionContext,
  token: PublicKey,
  wallet: PublicKey,
) => {
  const solanaConnection = await context.getSolanaConnection();
  const ataAccount = await solanaConnection.getAccountInfo(
    getAssociatedTokenAddressSync(token, wallet),
  );
  return ataAccount !== null;
};

// Here we use the Wormhole SDKs to produce the wormhole pdas that are needed
// for the bridge out transaction.  Currently this is using wormhole SDK apis
// that are _technically_ public but it seems likely these are not considered to
// be truly public.  It might be better to extract the pdas by using the sdk to
// generate (but not send) a transaction, and taking the pdas from that.  That
// may be something to revisit in the future if we find that the wormhole sdk
// upgrades in ways that break these calls.
const getNttPdas = async <N extends WormholeNetwork>(
  options: SendBridgeOutOptions,
  wh: Wormhole<N>,
  program: IntentTransferProgram,
  outboxItemPublicKey: PublicKey,
  quotePayeeAddress: PublicKey,
) => {
  const pdas = NTT.pdas(options.fromToken.manager);
  const solana = wh.getChain("Solana");
  const coreBridgeContract = contracts.coreBridge.get(wh.network, "Fogo");
  if (coreBridgeContract === undefined) {
    throw new Error("Core bridge contract address not returned by wormhole!");
  }
  const transceiverPdas = NTT.transceiverPdas(options.fromToken.manager);
  const [intentTransferSetterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("intent_transfer")],
    program.programId,
  );
  const wormholePdas = utils.getWormholeDerivedAccounts(
    options.fromToken.manager,
    coreBridgeContract,
  );
  const [registeredTransceiverPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("registered_transceiver"),
      options.fromToken.manager.toBytes(),
    ],
    options.fromToken.manager,
  );

  return {
    emitter: transceiverPdas.emitterAccount(),
    nttConfig: pdas.configAccount(),
    nttCustody: await NTT.custodyAccountAddress(pdas, options.fromToken.mint),
    nttInboxRateLimit: pdas.inboxRateLimitAccount(solana.chain),
    nttManager: options.fromToken.manager,
    nttOutboxItem: outboxItemPublicKey,
    nttOutboxRateLimit: pdas.outboxRateLimitAccount(),
    nttPeer: pdas.peerAccount(solana.chain),
    nttSessionAuthority: pdas.sessionAuthority(
      intentTransferSetterPda,
      NTT.transferArgs(
        options.amount,
        Wormhole.chainAddress("Solana", options.walletPublicKey.toBase58()),
        false,
      ),
    ),
    nttTokenAuthority: pdas.tokenAuthority(),
    payeeNttWithExecutor: quotePayeeAddress,
    transceiver: registeredTransceiverPda,
    wormholeProgram: coreBridgeContract,
    wormholeBridge: wormholePdas.wormholeBridge,
    wormholeFeeCollector: wormholePdas.wormholeFeeCollector,
    wormholeMessage:
      transceiverPdas.wormholeMessageAccount(outboxItemPublicKey),
    wormholeSequence: wormholePdas.wormholeSequence,
  };
};

const buildBridgeOutIntent = async (
  program: IntentTransferProgram,
  options: SendBridgeOutOptions,
  decimals: number,
  symbol: string | undefined,
  feeToken: string,
  feeAmount: string,
) => {
  const nonce = await getNonce(
    program,
    options.walletPublicKey,
    NonceType.Bridge,
  );

  const intent = {
    description: BRIDGE_OUT_MESSAGE_HEADER,
    parameters: {
      version: `${CURRENT_BRIDGE_OUT_MAJOR}.${CURRENT_BRIDGE_OUT_MINOR}`,
      from_chain_id: options.context.chainId,
      to_chain_id: "solana",
      token: symbol ?? options.fromToken.mint.toBase58(),
      amount: amountToString(options.amount, decimals),
      recipient_address: options.walletPublicKey.toBase58(),
      fee_token: feeToken,
      fee_amount: feeAmount,
      nonce: nonce === null ? "1" : nonce.nonce.add(new BN(1)).toString(),
    },
  };

  return composeEd25519IntentVerifyIx(
    fromLegacyPublicKey(options.walletPublicKey),
    ((message: Uint8Array) => options.solanaWallet.signMessage(message)) as SigningFunc,
    intent,
  );
};

export type SendBridgeInOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  solanaWallet: BaseSignerWalletAdapter;
  amount: bigint;
  fromToken: WormholeToken & { chain: "Solana" };
  toToken: WormholeToken & { chain: "Fogo" };
};

export const bridgeIn = async (options: SendBridgeInOptions) => {
  const solanaConnection = await options.context.getSolanaConnection();
  const { route, transferRequest, transferParams } =
    await buildWormholeTransfer(options, solanaConnection);
  // @ts-expect-error the wormhole client types are incorrect and do not
  // properly represent the runtime representation.
  const quote = await route.quote(transferRequest, transferParams);
  if (quote.success) {
    return await routes.checkAndCompleteTransfer(
      route,
      await route.initiate(
        transferRequest,
        {
          address: () => options.walletPublicKey.toBase58(),
          chain: () => "Solana",
          sign: (transactions) =>
            Promise.all(
              transactions.map(async ({ transaction }) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const signedTx: VersionedTransaction =
                  await options.solanaWallet.signTransaction(
                    // Hooray for Wormhole's incomplete typing eh?
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    transaction.transaction,
                  );
                // Hooray for Wormhole's incomplete typing eh?
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                signedTx.sign(transaction.signers);
                return signedTx.serialize();
              }),
            ),
        },
        quote,
        Wormhole.chainAddress("Fogo", options.walletPublicKey.toBase58()),
      ),
    );
  } else {
    throw quote.error;
  }
};

const buildWormholeTransfer = async (
  options: {
    context: SessionContext;
    amount: bigint;
    fromToken: WormholeToken;
    toToken: WormholeToken;
    walletPublicKey: PublicKey;
  },
  connection: Connection,
) => {
  const solanaConnection = await options.context.getSolanaConnection();
  const [wh, { decimals }] = await Promise.all([
    wormhole(
      NETWORK_TO_WORMHOLE_NETWORK[options.context.network],
      [solanaSdk],
      {
        chains: { Solana: { rpc: solanaConnection.rpcEndpoint } },
      },
    ),
    getMint(connection, options.fromToken.mint),
  ]);

  const Route = nttExecutorRoute({
    ntt: {
      tokens: {
        USDC: [
          {
            chain: options.fromToken.chain,
            manager: options.fromToken.manager.toBase58(),
            token: options.fromToken.mint.toBase58(),
            transceiver: [
              {
                address: options.fromToken.transceiver.toBase58(),
                type: "wormhole",
              },
            ],
          },
          {
            chain: options.toToken.chain,
            manager: options.toToken.manager.toBase58(),
            token: options.toToken.mint.toBase58(),
            transceiver: [
              {
                address: options.toToken.transceiver.toBase58(),
                type: "wormhole",
              },
            ],
          },
        ],
      },
    },
  });
  const route = new Route(wh);

  const transferRequest = await routes.RouteTransferRequest.create(wh, {
    recipient: Wormhole.chainAddress(
      options.toToken.chain,
      options.walletPublicKey.toBase58(),
    ),
    source: Wormhole.tokenId(
      options.fromToken.chain,
      options.fromToken.mint.toBase58(),
    ),
    destination: Wormhole.tokenId(
      options.toToken.chain,
      options.toToken.mint.toBase58(),
    ),
  });

  const validated = await route.validate(transferRequest, {
    amount: amountToString(options.amount, decimals),
    options: route.getDefaultOptions(),
  });
  if (validated.valid) {
    return {
      wh,
      route,
      transferRequest,
      transferParams: validated.params,
      decimals,
    };
  } else {
    throw validated.error;
  }
};

