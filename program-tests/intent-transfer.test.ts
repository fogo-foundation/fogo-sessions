import { describe, test, before, beforeEach } from "node:test";
import assert from "node:assert";
import type { Address, KeyPairSigner } from "@solana/kit";
import { serialize } from "@xlabs-xyz/binary-layout";
import { type Snapshot, ForkSvm } from "@xlabs-xyz/fork-svm";
import { nativeMint } from "@xlabs-xyz/svm";
import {
  fogoRpcUrl,
  fogo,
  assertTxSuccess,
  genKp,
  createAccountHelper,
  createSplFogoAtaHelper,
  getSplFogoBalance,
  createTxHelpers,
  signMessageFunc,
} from "./utils.js";
import { onchain } from "@fogo/sessions-sdk";

const {
  intentTransferProgramId,
  feeConfigPda,
  feeConfigLayout,
  composeIntraChainIntentTransferIxs,
} = onchain;

describe("IntentTransfer", function () {
  const forkSvm = new ForkSvm(fogoRpcUrl, false);
  const airdropAmount = fogo(100);
  const initialUserFogo = fogo(10);

  let [userKp, sponsorKp, recipientKp]: KeyPairSigner[] = [];
  let [user, sponsor, recipient]: Address[] = [];
  let userSignMsg: ReturnType<typeof signMessageFunc>;
  let [userSplFogo, sponsorSplFogo, recipientSplFogo]: Address[] = [];
  let snapshot: Snapshot;

  const createAccount       = createAccountHelper(forkSvm);
  const createSplFogoAta    = createSplFogoAtaHelper(createAccount);
  const getBalance          = getSplFogoBalance(forkSvm);
  const { createAndSendTx } = createTxHelpers(forkSvm);

  const createFeeConfig = (mint: Address, intrachainFee: bigint, bridgeFee: bigint) => {
    const data = serialize(feeConfigLayout, {
      intrachainTransferFee: intrachainFee,
      bridgeTransferFee: bridgeFee,
    });
    createAccount(feeConfigPda(mint), data, intentTransferProgramId);
  };

  before(async () => {
    [[user, userKp], [sponsor, sponsorKp], [recipient, recipientKp]] =
      await Promise.all([...Array(3)].map(() => genKp()));
    userSignMsg = signMessageFunc(userKp);

    await forkSvm.advanceToNow();

    for (const addr of [user, sponsor])
      await forkSvm.airdrop(addr, airdropAmount);

    userSplFogo      = createSplFogoAta(user, initialUserFogo);
    sponsorSplFogo   = createSplFogoAta(sponsor, 0n);
    recipientSplFogo = createSplFogoAta(recipient, 0n);

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
        mintSymbol:   "FOGO",
        feeSymbol:    "FOGO",
        transferFee,
      }
    );

    await assertTxSuccess(createAndSendTx([verifyIx, transferIx], sponsorKp));

    const [balanceAfter, sponsorFeeBalance, recipientBalance] = await Promise.all([
      getBalance(userSplFogo),
      getBalance(sponsorSplFogo),
      getBalance(recipientSplFogo),
    ]);

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
});
