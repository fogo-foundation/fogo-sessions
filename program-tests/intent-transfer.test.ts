import { describe, test, before, beforeEach } from "node:test";
import assert from "node:assert";
import type { Address, KeyPairSigner } from "@solana/kit";
import { address } from "@solana/kit";
import { getSetComputeUnitLimitInstruction } from "@solana-program/compute-budget";
import { serialize, deserialize } from "@xlabs-xyz/binary-layout";
import { type Snapshot, ForkSvm } from "@xlabs-xyz/fork-svm";
import {
  nativeMint,
  svmAddressItem,
  addressLookupTableLayout,
} from "@xlabs-xyz/svm";
import {
  fogoRpcUrl,
  fogo,
  assertTxSuccess,
  genKp,
  createHelpers,
  signMessageFunc,
} from "./utils.js";
import { onchain } from "@fogo/sessions-sdk";

const {
  chainIdToUsdcMint,
  intentTransferProgramId,
  solanaChainId,
  usdcDecimals,
  usdcSymbol,
  feeConfigPda,
  feeConfigLayout,
  composeIntraChainIntentTransferIxs,
  composeBridgeIntentIxs,
} = onchain;

import type { ChainId } from "@fogo/sessions-sdk";
import { bytes } from "@xlabs-xyz/utils";
import { timestampItem } from "@xlabs-xyz/common";

const chainIdToNttManager = {
  "fogo-mainnet": address("nttu74CdAmsErx5daJVCQNoDZujswFrskMzonoZSdGk"),
  "fogo-testnet": address("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
} as const satisfies Record<ChainId, Address>;

const chainIdToNttUsdcAlt = {
  "fogo-mainnet": address("7hmMz3nZDnPJfksLuPotKmUBAFDneM2D9wWg3R1VcKSv"),
  "fogo-testnet": address("4FCi6LptexBdZtaePsoCMeb1XpCijxnWu96g5LsSb6WP"),
}

const fogoChainId = 51;
const wormholeChainIdItem = { binary: "uint", size: 2 } as const;
const usdc = (amount: number) => BigInt(amount) * 10n ** BigInt(usdcDecimals);

//see https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/main/core/definitions/src/protocols/executor/signedQuote.ts
const signedQuoteLayout = [
  { name: "prefix",        binary: "bytes", custom: bytes.encode("EQ01"), omit: true },
  { name: "quoterAddress", binary: "bytes", size: 20   },
  { name: "payeeAddress",  ...svmAddressItem           },
  { name: "srcChain",      ...wormholeChainIdItem      },
  { name: "dstChain",      ...wormholeChainIdItem      },
  { name: "expiryTime",    ...timestampItem("uint", 8) },
  { name: "baseFee",       binary: "uint", size: 8     },
  { name: "dstGasPrice",   binary: "uint", size: 8     },
  { name: "srcPrice",      binary: "uint", size: 8     },
  { name: "dstPrice",      binary: "uint", size: 8     },
  { name: "signature",     binary: "bytes", size: 65   },
] as const;

describe("IntentTransfer", function () {
  const forkSvm = new ForkSvm({ url: fogoRpcUrl, withDefaultPrograms: false });

  const airdropAmount   = fogo(100);
  const initialUserFogo = fogo(10);

  let [userKp,      sponsorKp,      recipientKp     ]: KeyPairSigner[] = [];
  let [user,        sponsor,        recipient       ]: Address[]       = [];
  let [userSplFogo, sponsorSplFogo, recipientSplFogo]: Address[]       = [];
  let userSignMsg: ReturnType<typeof signMessageFunc>;
  let snapshot: Snapshot;

  const {
    createAccount,
    createAta,
    getTokenBalance,
    createAndSendTx,
  } = createHelpers(forkSvm);

  const createFeeConfig = (mint: Address, intrachainFee: bigint, bridgeFee: bigint) => {
    const data = serialize(feeConfigLayout, {
      intrachainTransferFee: intrachainFee,
      bridgeTransferFee: bridgeFee,
    });
    createAccount(feeConfigPda(mint), data, intentTransferProgramId);
  };

  const spoofSignedQuote = (now: Date, payeeAddress: Address): Uint8Array =>
    serialize(signedQuoteLayout, {
        quoterAddress: new Uint8Array(20).fill(0),
        payeeAddress,
        srcChain:     fogoChainId,
        dstChain:     solanaChainId,
        expiryTime:   new Date(now.getTime() + 3600 * 1000),
        baseFee:      1n,
        dstGasPrice:  0n,
        srcPrice:     1n,
        dstPrice:     1n,
        signature:    new Uint8Array(65).fill(0),
    });

  before(async () => {
    [[user, userKp], [sponsor, sponsorKp], [recipient, recipientKp]] =
      await Promise.all([...Array(3)].map(() => genKp()));
    userSignMsg = signMessageFunc(userKp);

    await forkSvm.advanceToNow();

    for (const addr of [user, sponsor])
      await forkSvm.airdrop(addr, airdropAmount);

    userSplFogo      = createAta(user,      nativeMint, initialUserFogo);
    sponsorSplFogo   = createAta(sponsor,   nativeMint, 0n             );
    recipientSplFogo = createAta(recipient, nativeMint, 0n             );

    snapshot = forkSvm.save();
  });

  beforeEach(() => forkSvm.load(snapshot));

  test("transfer with fee", async () => {

    const transferFee = fogo(1);
    createFeeConfig(nativeMint, transferFee, 0n);

    const transferAmount = fogo(3);

    const [verifyIx, transferIx] = await composeIntraChainIntentTransferIxs(
      forkSvm.createForkRpc(),
      userSignMsg,
      transferAmount,
      {
        sponsor,
        user,
        recipient,
        mint:      nativeMint,
        feeMint:   nativeMint,
      },
      {
        chainId:      "fogo-testnet",
        nextNonce:    1n,
        mintDecimals: 9,
        feeDecimals:  9,
        mintSymbol:   "wFOGO",
        feeSymbol:    "wFOGO",
        transferFee,
      }
    );

    await assertTxSuccess(createAndSendTx([verifyIx, transferIx], sponsorKp));

    const [balanceAfter, sponsorFeeBalance, recipientBalance] = await Promise.all(
      [userSplFogo, sponsorSplFogo, recipientSplFogo].map(getTokenBalance),
    );

    assert.equal(
      balanceAfter,
      initialUserFogo - transferAmount - transferFee,
      "User balance should decrease by transfer + fee",
    );
    assert.equal(sponsorFeeBalance, transferFee, "Sponsor should receive fee");

    assert.equal(
      recipientBalance,
      transferAmount,
      "Recipient should receive transfer amount",
    );
  });

  test("bridge transfer with fee", async () => {
    const chainId = "fogo-testnet";
    const usdcMint   = chainIdToUsdcMint[chainId];
    const nttManager = chainIdToNttManager[chainId];
    const usdcAmount = usdc(1000)
    const bridgeFee  = usdc(10);

    createFeeConfig(usdcMint, 0n, bridgeFee);
    const [outboxItem, outboxItemKp] = await genKp();
    const [payee] = await genKp();

    const signedQuote = spoofSignedQuote(forkSvm.latestTimestamp(), payee);
    const payeeNttWithExecutor = payee;

    const initialUserUsdc = usdcAmount * 10n;
    const userUsdc = createAta(user, usdcMint, initialUserUsdc);
    const sponsorUsdc = createAta(sponsor, usdcMint, 0n);

    const [verifyIx, bridgeIx] = await composeBridgeIntentIxs(
      forkSvm.createForkRpc(),
      userSignMsg,
      usdcAmount,
      signedQuote,
      false, // payDestinationAtaRent
      {
        sponsor,
        user,
        recipient,
        mint:      usdcMint,
        feeMint:   usdcMint,
        nttManager,
        outboxItem,
        payeeNttWithExecutor,
      },
      {
        chainId,
        nextNonce:    1n,
        mintDecimals: usdcDecimals,
        feeDecimals:  usdcDecimals,
        mintSymbol:   usdcSymbol,
        feeSymbol:    usdcSymbol,
        transferFee:  bridgeFee,
      }
    );

    //we have to manually extend the ALT because our sponsor and its associated accounts
    //  are (naturally) not in the alt which makes the tx exceed the size limit
    const alt = chainIdToNttUsdcAlt[chainId];
    const altAcc = (await forkSvm.getAccount(alt))!;
    const altData = deserialize(addressLookupTableLayout, altAcc.data);
    //ugly and even fails to update rent, but forkSvm doesn't complain
    (altData as any).addresses.push(sponsor, recipient);
    altAcc.data = serialize(addressLookupTableLayout, altData);
    forkSvm.setAccount(alt, altAcc);

    const ixs = [getSetComputeUnitLimitInstruction({ units: 240_000 }), verifyIx, bridgeIx];
    await assertTxSuccess(createAndSendTx(ixs, sponsorKp, [outboxItemKp], [alt]));

    const [balanceAfter, sponsorFeeBalance] =
      await Promise.all([userUsdc, sponsorUsdc].map(getTokenBalance));

    assert.equal(
      balanceAfter,
      initialUserUsdc - usdcAmount - bridgeFee,
      "User balance should decrease by transfer + bridge fee",
    );
    assert.equal(sponsorFeeBalance, bridgeFee, "Sponsor should receive bridge fee");
  });
});
