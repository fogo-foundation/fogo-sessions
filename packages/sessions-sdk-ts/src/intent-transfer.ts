import { fromLegacyPublicKey } from "@solana/compat";
import { createSolanaRpc } from "@solana/kit";
import type {
  BaseSignerWalletAdapter,
  MessageSignerWalletAdapterProps,
} from "@solana/wallet-adapter-base";
import type { VersionedTransaction } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getSetComputeUnitLimitInstruction } from "@solana-program/compute-budget";
import type { Network as WormholeNetwork, Chain } from "@wormhole-foundation/sdk";
import { Wormhole, wormhole, routes } from "@wormhole-foundation/sdk";
import solanaSdk from "@wormhole-foundation/sdk/solana";
import { nttExecutorRoute } from "@wormhole-foundation/sdk-route-ntt";
import type { RoUint8Array } from "@xlabs-xyz/const-utils";
import type { SvmClient } from "@xlabs-xyz/svm";
import { findAta, getMint, getAccountInfo } from "@xlabs-xyz/svm";
import { definedOrThrow } from "@xlabs-xyz/utils";

import { Network } from "./connection.js";
import type { SessionContext } from "./context.js";
import { SESSIONS_INTERNAL_PAYMASTER_DOMAIN } from "./context.js";
import { amountToString } from "./onchain/common.js";
import { chainIdToUsdcMint, usdcDecimals, usdcSymbol } from "./onchain/constants.js";
import { composeBridgeIntentIxs, composeIntraChainIntentTransferIxs, getFeeConfig } from "./onchain/intent-transfer.js";
import { mplMetadataPda } from "./onchain/mpl-metadata.js";
import type { SigningFunc } from "./onchain/svm-intent.js";

const BRIDGE_OUT_CUS = 240_000;

const getFee = async (
  context: SessionContext,
  feeType: "intrachainTransferFee" | "bridgeTransferFee"
) => {
  const usdcMint = chainIdToUsdcMint[context.chainId];
  const fee = definedOrThrow(await getFeeConfig(context.rpc, usdcMint), "Fee config not found");

  return {
    metadata:     new PublicKey(mplMetadataPda(usdcMint)),
    mint:         new PublicKey(usdcMint),
    symbolOrMint: usdcSymbol,
    decimals:     usdcDecimals,
    fee:          fee[feeType],
  };
};

// -- intrachain transfer --

export const getTransferFee = (context: SessionContext) =>
  getFee(context, "intrachainTransferFee");

type SendTransferOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  mint: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
};

export async function sendTransfer(options: SendTransferOptions) {
  const { context, walletPublicKey, signMessage } = options;
  const { amount, recipient, mint, feeConfig } = options;

  const chainId = context.chainId;
  return context.sendTransaction(
    undefined,
    await composeIntraChainIntentTransferIxs(
      context.rpc,
      signMessage as SigningFunc,
      amount,
      {
        user:      fromLegacyPublicKey(walletPublicKey),
        sponsor:   fromLegacyPublicKey(context.internalPayer),
        recipient: fromLegacyPublicKey(recipient),
        mint:      fromLegacyPublicKey(mint),
        feeMint:   chainIdToUsdcMint[chainId],
      },
      {
        chainId:     chainId,
        feeDecimals: usdcDecimals,
        mintSymbol:  feeConfig.symbolOrMint,
        feeSymbol:   usdcSymbol,
        transferFee: feeConfig.fee,
      },
    ),
    {
      variation: "Intent Transfer",
      paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
    },
  );
}

// -- bridge transfer --

export const getBridgeOutFee = (context: SessionContext) =>
  getFee(context, "bridgeTransferFee");

type SendBridgeOutOptions = {
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

type WormholeToken = {
  chain: Chain;
  mint: PublicKey;
  manager: PublicKey;
  transceiver: PublicKey;
};

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

export const bridgeOut = async (options: SendBridgeOutOptions) => {
  const { context, solanaWallet, walletPublicKey, sessionKey } = options;
  const { amount, feeConfig, toToken, fromToken } = options;

  const solanaRpc = createSolanaRpc(
    await context.getSolanaConnection().then(connection => connection.rpcEndpoint));

  const { route, transferRequest, transferParams, decimals } =
    await buildWormholeTransfer(options, solanaRpc);

  const { signedQuote, payeeAddress } =
    // @ts-expect-error the wormhole client types are incorrect and do not
    // properly represent the runtime representation.
    await route.fetchExecutorQuote(transferRequest, transferParams);

  const user = fromLegacyPublicKey(walletPublicKey);
  const outboxItem = Keypair.generate();
  const destinationAtaExists = await getAccountInfo(
    solanaRpc,
    findAta({
      mint: fromLegacyPublicKey(toToken.mint),
      owner: fromLegacyPublicKey(walletPublicKey),
    })
  ).then(info => !!info);

  const instructions = await composeBridgeIntentIxs(
    context.rpc,
    (message: RoUint8Array) => solanaWallet.signMessage(message as Uint8Array),
    amount,
    signedQuote,
    !destinationAtaExists,
    {
      user,
      recipient:            user,
      mint:                 fromLegacyPublicKey(fromToken.mint),
      feeMint:              fromLegacyPublicKey(feeConfig.mint),
      sponsor:              fromLegacyPublicKey(context.internalPayer),
      nttManager:           fromLegacyPublicKey(fromToken.manager),
      outboxItem:           fromLegacyPublicKey(outboxItem.publicKey),
      payeeNttWithExecutor: fromLegacyPublicKey(new PublicKey(payeeAddress)),
    },
    {
      chainId:      context.chainId,
      mintDecimals: decimals,
      feeDecimals:  feeConfig.decimals,
      feeSymbol:    feeConfig.symbolOrMint,
      transferFee:  feeConfig.fee,
    }
  );

  return context.sendTransaction(
    sessionKey,
    [
      getSetComputeUnitLimitInstruction({ units: BRIDGE_OUT_CUS }),
      ...instructions,
    ],
    {
      variation: "Intent NTT Bridge",
      paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
      extraSigners: [outboxItem],
      addressLookupTable:
        BRIDGING_ADDRESS_LOOKUP_TABLE[context.network]?.[
          fromToken.mint.toBase58()
        ],
    },
  );
};

type SendBridgeInOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  solanaWallet: BaseSignerWalletAdapter;
  amount: bigint;
  fromToken: WormholeToken & { chain: "Solana" };
  toToken: WormholeToken & { chain: "Fogo" };
};

export const bridgeIn = async (options: SendBridgeInOptions) => {
  const solanaConnection = await options.context.getSolanaConnection();
  const solanaRpc = createSolanaRpc(solanaConnection.rpcEndpoint);
  const { route, transferRequest, transferParams } =
    await buildWormholeTransfer(options, solanaRpc);
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

const NETWORK_TO_WORMHOLE_NETWORK: Record<Network, WormholeNetwork> = {
  [Network.Mainnet]: "Mainnet",
  [Network.Testnet]: "Testnet",
};

const buildWormholeTransfer = async (
  options: {
    context: SessionContext;
    amount: bigint;
    fromToken: WormholeToken;
    toToken: WormholeToken;
    walletPublicKey: PublicKey;
  },
  rpc: SvmClient,
) => {
  const solanaConnection =  await (options.context.getSolanaConnection());
  const [wh, { decimals }] = await Promise.all([
    wormhole(
      NETWORK_TO_WORMHOLE_NETWORK[options.context.network],
      [solanaSdk],
      {
        chains: { Solana: { rpc: solanaConnection.rpcEndpoint } },
      },
    ),
    getMint(rpc, fromLegacyPublicKey(options.fromToken.mint))
      .then(mintAcc =>
        definedOrThrow(mintAcc, `Mint ${options.fromToken.mint.toBase58()} not found`)
      ),
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
      route,
      transferRequest,
      transferParams: validated.params,
      decimals,
    };
  } else {
    throw validated.error;
  }
};

