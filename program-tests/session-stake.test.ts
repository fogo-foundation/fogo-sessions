import { describe, test, before, beforeEach } from "node:test";
import assert from "node:assert";
import { onchain } from "@fogo/sessions-sdk";
import type { Address, Lamports, KeyPairSigner } from "@solana/kit";
import { createSolanaRpc, fixEncoderSize } from "@solana/kit";
import { getStakeStateV2Decoder, getStakeStateV2Encoder } from "@solana-program/stake";
import type { RoArray } from "@xlabs-xyz/const-utils";
import { serialize } from "@xlabs-xyz/binary-layout";
import type { Snapshot } from "@xlabs-xyz/fork-svm";
import { ForkSvm, assertTxSuccess, createCurried } from "@xlabs-xyz/fork-svm";
import type { Ix } from "@xlabs-xyz/svm";
import {
  stakeProgramId,
  minimumBalanceForRentExemption,
  nativeMint,
  systemProgramId,
} from "@xlabs-xyz/svm";

import { fogoRpcUrl, fogo, genKp, signMessageFunc } from "./utils.js";

const {
  sessionStakeProgramId,
  sessionStakeAuthorityPda,
  composeInitializeIx,
  composeDepositIx,
  composeWithdrawIx,
  composeDelegateIx,
  composeDeactivateIx,
  composeAuthorizeUserIx,
  composeSplitIx,
  composeMergeIx,
  composeMoveLamportsIx,
  composeMoveStakeIx,
  composeAuthorizeIntentIxs,
  programSignerPda,
  composeStartSessionIxs,
  domainRegistryProgramId,
  domainRecordPda,
  domainRecordLayout,
} = onchain;

const soPath = "../target/deploy/session_stake.so";

describe("SessionStake", function() {
  const u64Max = 2n ** 64n - 1n;
  const testDomain = "test.session-stake.local";
  const stakeAccountSize = 200;
  const stakeRentExemption = minimumBalanceForRentExemption(stakeAccountSize);

  const forkSvm = new ForkSvm({ url: fogoRpcUrl, withDefaultPrograms: false });
  const airdropAmount = fogo(100);
  const initialUserFogo = fogo(10);

  let rpc: ReturnType<typeof createSolanaRpc>;
  let [userKp, sponsorKp, sessionKp]: KeyPairSigner[] = [];
  let [user, sponsor, session, voteAccount, userFogo, authority]: Address[] = [];
  let snapshot: Snapshot;
  let userSignMsg: ReturnType<typeof signMessageFunc>;

  const {
    createAccount,
    createAta,
    getBalance : getFogoBalance,
    getTokenBalance: getTokenBalanceWithKind,
    createAndSendTx,
  } = createCurried(forkSvm);

  const getTokenBalance = getTokenBalanceWithKind();

  const getStakeState = async (addr: Address) => {
    const acc = await forkSvm.getAccount(addr);
    return acc ? getStakeStateV2Decoder().decode(acc.data) : null;
  };

  const createActiveStakeAccount = (
    pubkey: Address,
    stakeAuthority: Address,
    voterPubkey: Address,
    stakedLamports: bigint,
  ) => {
    const rentExempt = minimumBalanceForRentExemption(200);
    const data = fixEncoderSize(getStakeStateV2Encoder(), 200).encode({
      __kind: "Stake",
      fields: [{
        rentExemptReserve: rentExempt,
        authorized: { staker: stakeAuthority, withdrawer: stakeAuthority },
        lockup: {
          unixTimestamp: 0n,
          epoch:         0n,
          custodian:     systemProgramId,
        },
      }, {
        delegation: {
          voterPubkey,
          stake:              stakedLamports,
          activationEpoch:    1n, // Far in the past = fully active
          deactivationEpoch:  u64Max, // u64::MAX = not deactivated
          warmupCooldownRate: 0.25,
        },
        creditsObserved: 0n,
      }, {
        bits: 0
      }],
    });

    createAccount(
      pubkey, {
      data,
      programId: stakeProgramId,
      lamports: (rentExempt + stakedLamports) as Lamports
    });
  };

  before(async () => {
    forkSvm.addProgramFromFile(sessionStakeProgramId, soPath);
    rpc = createSolanaRpc(fogoRpcUrl);

    [[user, userKp], [sponsor, sponsorKp], [session, sessionKp]] =
      await Promise.all([...Array(3)].map(() => genKp()));
    userSignMsg = signMessageFunc(userKp);

    voteAccount = (await rpc.getVoteAccounts().send()).current[0].votePubkey;

    authority = sessionStakeAuthorityPda(user);
    userFogo = createAta(user, nativeMint, initialUserFogo);

    await forkSvm.advanceToNow();

    for (const addr of [user, sponsor])
      await forkSvm.airdrop(addr, airdropAmount);

    const domainRecord = serialize(domainRecordLayout, [{
      programId: sessionStakeProgramId,
      signerPda: programSignerPda(sessionStakeProgramId),
    }]);
    createAccount(
      domainRecordPda(testDomain), {
      data: domainRecord,
      programId: domainRegistryProgramId
    });

    snapshot = forkSvm.save();
  });

  // Shared tests that run in both user and session modes
  const sharedTests = (getCtx: () => TestContext) => {
    test("initialize and deposit", async () => {
      const ctx = getCtx();
      const depositAmount = fogo(5);
      const stake = await ctx.initAndDeposit(depositAmount);

      const [stakeAccount, stakeBalance, userBalance] = await Promise.all([
        forkSvm.getAccount(stake),
        getFogoBalance(stake),
        getTokenBalance(ctx.userFogo),
      ]);

      assert(stakeAccount !== null, "Stake account should exist");
      assert.equal(
        stakeAccount.owner,
        stakeProgramId,
        "Should be owned by stake program",
      );
      assert.equal(
        stakeBalance,
        depositAmount + stakeRentExemption,
        "Stake account should have deposited amount plus rent exemption",
      );
      assert.equal(
        userBalance,
        initialUserFogo - depositAmount,
        "User spl FOGO should decrease",
      );
    });

    test("deposit and withdraw", async () => {
      const ctx = getCtx();
      const { user, signerOrSession, userFogo } = ctx;
      const depositAmount  = fogo(5);
      const withdrawAmount = fogo(2);
      const stake = await ctx.initAndDeposit(depositAmount);

      const balanceAfterDeposit = await getFogoBalance(stake);

      const withdrawIx = composeWithdrawIx(
        withdrawAmount as Lamports,
        { user, signerOrSession, stake, userFogo }
      );
      await ctx.send([withdrawIx]);

      const [stakeBalance, userBalance] = await Promise.all([
        getFogoBalance(stake),
        getTokenBalance(userFogo),
      ]);

      assert.equal(
        stakeBalance,
        balanceAfterDeposit - withdrawAmount,
        "Stake balance should decrease by withdrawal",
      );
      assert.equal(
        userBalance,
        initialUserFogo - depositAmount + withdrawAmount,
        "User should receive withdrawn FOGO",
      );
    });

    test("deposit and delegate", async () => {
      const ctx = getCtx();
      const { user, signerOrSession } = ctx;
      const depositAmount = fogo(5);
      const stake = await ctx.initAndDeposit(depositAmount);

      const delegateIx = composeDelegateIx({ user, signerOrSession, stake, voteAccount });
      await ctx.send([delegateIx]);

      const stakeState = await getStakeState(stake);
      assert(stakeState?.__kind === "Stake", "Stake should be in delegated state");
      assert.equal(
        stakeState.fields[1].delegation.voterPubkey,
        voteAccount,
        "Should be delegated to vote account",
      );
    });

    test("delegate and deactivate", async () => {
      const ctx = getCtx();
      const { user, signerOrSession } = ctx;
      const depositAmount = fogo(5);
      const stake = await ctx.initAndDeposit(depositAmount);

      const delegateIx   = composeDelegateIx({ user, signerOrSession, stake, voteAccount });
      const deactivateIx = composeDeactivateIx({ user, signerOrSession, stake });
      await ctx.send([delegateIx, deactivateIx]);

      const stakeState = await getStakeState(stake);
      assert(stakeState?.__kind === "Stake", "Stake should still be in Stake state");
      const deactivationEpoch = stakeState.fields[1].delegation.deactivationEpoch;
      assert(deactivationEpoch < u64Max, "Deactivation epoch should be set (not u64::MAX)");
    });

    test("deposit and split", async () => {
      const ctx = getCtx();
      const { signerOrSession, payer } = ctx;
      const depositAmount = fogo(10);
      const splitAmount   = fogo(4);
      const [destinationStake, destinationStakeKp] = await genKp();
      const sourceStake = await ctx.initAndDeposit(depositAmount);
      
      const balanceBeforeSplit = await getFogoBalance(sourceStake);

      const splitIx = composeSplitIx(
        splitAmount as Lamports,
        { signerOrSession, payer, sourceStake, destinationStake, authority }
      );
      await ctx.send([splitIx], [destinationStakeKp]);

      const [originalBalance, splitBalance] =
        await getFogoBalance([sourceStake, destinationStake]);

      assert.equal(
        originalBalance,
        balanceBeforeSplit - splitAmount,
        "Original should decrease by split amount",
      );
      assert.equal(
        splitBalance,
        splitAmount + stakeRentExemption,
        "Split should have split amount plus rent exemption",
      );
    });

    test("initialize, deposit, and merge", async () => {
      const ctx = getCtx();
      const { signerOrSession } = ctx;
      const sourceAmount       = fogo(5);
      const destionationAmount = fogo(3);
      const sourceStake      = await ctx.initAndDeposit(sourceAmount);
      const destinationStake = await ctx.initAndDeposit(destionationAmount);

      const mergeIx = composeMergeIx(
        { signerOrSession, sourceStake, destinationStake, authority }
      );
      await ctx.send([mergeIx]);

      const [sourceBalanceAfter, destinationBalanceAfter] =
        await getFogoBalance([sourceStake, destinationStake]);

      assert.equal(
        sourceBalanceAfter,
        0n,
        "Source stake should be emptied after merge",
      );
      assert.equal(
        destinationBalanceAfter,
        sourceAmount + destionationAmount + 2n * stakeRentExemption,
        "Merged stake should have combined balance",
      );
    });

    test("deposit and move lamports", async () => {
      const ctx = getCtx();
      const { signerOrSession } = ctx;
      const sourceAmount      = fogo(6);
      const destinationAmount = fogo(3);
      const moveAmount        = fogo(2);
      const sourceStake      = await ctx.initAndDeposit(sourceAmount);
      const destinationStake = await ctx.initAndDeposit(destinationAmount);

      const moveIx = composeMoveLamportsIx(
        moveAmount as Lamports,
        { signerOrSession, sourceStake, destinationStake, authority }
      );
      await ctx.send([moveIx]);

      const [sourceBalanceAfter, destinationBalanceAfter] =
        await getFogoBalance([sourceStake, destinationStake]);

      assert.equal(
        sourceBalanceAfter,
        sourceAmount + stakeRentExemption - moveAmount,
        "Source should decrease by move amount",
      );
      assert.equal(
        destinationBalanceAfter,
        destinationAmount + stakeRentExemption + moveAmount,
        "Destination should increase by move amount",
      );
    });

    test("move stake between active accounts", async () => {
      const ctx = getCtx();
      const { signerOrSession } = ctx;
      const sourceStakeAmount      = fogo(800);
      const destinationStakeAmount = fogo(200);
      const moveAmount             = fogo(100);

      const createAcc = (stakedLamports: bigint) =>
        genKp().then(([addr]) => {
          createActiveStakeAccount(addr, authority, voteAccount, stakedLamports);
          return addr;
        });

      const [sourceStake, destinationStake] = await Promise.all([
        createAcc(sourceStakeAmount),
        createAcc(destinationStakeAmount),
      ]);

      const moveIx = composeMoveStakeIx(
        moveAmount as Lamports,
        { signerOrSession, sourceStake, destinationStake, authority }
      );
      await ctx.send([moveIx]);

      const getStakedAmount = async (addr: Address) => {
        const state = await getStakeState(addr);
        if (state?.__kind !== "Stake")
          throw new Error("Expected Stake state");

        return state.fields[1].delegation.stake;
      };

      const [finalSourceStake, finalDestinationStake] = await Promise.all([
        getStakedAmount(sourceStake),
        getStakedAmount(destinationStake),
      ]);

      assert.equal(
        finalSourceStake,
        sourceStakeAmount - moveAmount,
        "Source stake should decrease",
      );
      assert.equal(
        finalDestinationStake,
        destinationStakeAmount + moveAmount,
        "Destination stake should increase",
      );
    });
  };

  const makeCtx = (
    signerOrSession: Address,
    feePayer: KeyPairSigner,
    signers: KeyPairSigner[],
  ) => {
    const payer = feePayer.address;

    const send = (ixs: RoArray<Ix>, extraSigners: RoArray<KeyPairSigner> = []) =>
      assertTxSuccess(createAndSendTx(ixs, feePayer, [...signers, ...extraSigners]));

    const initAndDeposit = async (amount: bigint) => {
      const [stake, stakeKp] = await genKp();
      const ixs = [
        composeInitializeIx({ signerOrSession, payer, stake }),
        composeDepositIx(amount as Lamports, { user, signerOrSession, payer, stake, userFogo }),
      ];
      await send(ixs, [stakeKp]);
      return stake;
    };

    return { user, signerOrSession, payer, userFogo, send, initAndDeposit } as const;
  };
  type TestContext = ReturnType<typeof makeCtx>;

  const userCtx = () => makeCtx(user, userKp, []);
  const sessionCtx = () => makeCtx(session, sponsorKp, [sessionKp]);

  describe("User Mode", () => {
    beforeEach(() => forkSvm.load(snapshot));
    sharedTests(userCtx);

    test("authorize user", async () => {
      const ctx = userCtx();
      const [newAuthority] = await genKp();
      const stake          = await ctx.initAndDeposit(fogo(5));

      const authorizeIx = composeAuthorizeUserIx("Staker", {
        newAuthority,
        user,
        stake,
      });
      await ctx.send([authorizeIx]);

      const stakeState = await getStakeState(stake);
      assert(stakeState?.__kind === "Initialized", "Stake should be in Initialized state");
      assert.equal(
        stakeState.fields[0].authorized.staker,
        newAuthority,
        "Staker should be updated",
      );
      assert.equal(
        stakeState.fields[0].authorized.withdrawer,
        authority,
        "Withdrawer should remain unchanged",
      );
    });
  });

  describe("Session Mode", () => {
    let sessionSnapshot: Snapshot;

    before(async () => {
      forkSvm.load(snapshot);

      const expires = new Date(Date.now() + 24*60*60 * 1000);
      const [verifyIx, startIx] = await composeStartSessionIxs(
        forkSvm.createForkRpc(),
        userSignMsg,
        "fogo-testnet",
        testDomain,
        expires,
        "Unlimited",
        {},
        { user, sponsor, session },
      );

      await assertTxSuccess(createAndSendTx([verifyIx, startIx], userKp, [sponsorKp, sessionKp]));

      sessionSnapshot = forkSvm.save();
    });

    beforeEach(() => forkSvm.load(sessionSnapshot));
    sharedTests(sessionCtx);

    test("authorize intent", async () => {
      const ctx = sessionCtx();
      const [newAuthority] = await genKp();
      const stake          = await ctx.initAndDeposit(fogo(5));

      const authorizeIxs = await composeAuthorizeIntentIxs(
        forkSvm.createForkRpc(),
        "fogo-testnet",
        "Staker",
        userSignMsg,
        { user, stake, sponsor, newAuthority },
      );
      await assertTxSuccess(createAndSendTx(authorizeIxs, sponsorKp));

      const stakeState = await getStakeState(stake);
      assert(stakeState?.__kind === "Initialized", "Stake should be in Initialized state");
      assert.equal(
        stakeState.fields[0].authorized.staker,
        newAuthority,
        "Staker should be updated",
      );
      assert.equal(
        stakeState.fields[0].authorized.withdrawer,
        authority,
        "Withdrawer should remain unchanged",
      );
    });
  });
});
