import type { Address, Lamports } from "@solana/kit";
import { address, AccountRole } from "@solana/kit";
import { enumItem } from "@xlabs-xyz/binary-layout";
import { valueIndexEntries } from "@xlabs-xyz/const-utils";
import type { SvmClient ,Ix} from "@xlabs-xyz/svm";
import {
  composeIx,
  lamportsItem,
  svmAddressItem,
  instructionsSysvarId,
  systemProgramId,
  tokenProgramId,
  clockSysvarId,
  rentSysvarId,
  stakeHistorySysvarId,
  stakeProgramId,
  nativeMint,
  getDeserializedAccount,
  findPda
} from "@xlabs-xyz/svm";

import { chainIdPda } from "./chainid.js";
import { byteDiscriminatedLayout, nonceLayout } from "./common.js";
import type {ChainId} from "./constants.js";
import { programSignerPda } from "./session-manager.js";
import type {SigningFunc} from "./svm-intent.js";
import {  composeEd25519IntentVerifyIx } from "./svm-intent.js";

export const sessionStakeProgramId = address("sStk2sQ71PdRbmfmMxivMsnowytotYGpDaQrp4WN7qj");

export const authorityTypes = ["Staker", "Withdrawer"] as const;
export type AuthorityType = typeof authorityTypes[number];

const authorizeDescription =
  "Stake Authority Change:\nYou are granting another address control over your stake account.\n";

const authorityAliases = {
  "Staker":     "delegate_staking",
  "Withdrawer": "transfer_ownership",
} as const;

export const sessionStakeAuthorityPda = (user: Address) =>
  findPda("authority", user, sessionStakeProgramId);

export const sessionStakeNoncePda = (authority: Address) =>
  findPda("nonce", authority, sessionStakeProgramId);

export const tmpFogoPda = (signerOrSession: Address) =>
  findPda("tmp_fogo", signerOrSession, sessionStakeProgramId);

const programSigner = programSignerPda(sessionStakeProgramId);

const authorizeUserIxArgs = [
  { name: "newAuthority",  ...svmAddressItem },
  { name: "authorityType", ...enumItem(valueIndexEntries(authorityTypes)) },
] as const;

const lamportsItemAsArg = [ { name: "lamports", ...lamportsItem() } ] as const;

const initializeIxLayout      = byteDiscriminatedLayout( 0, []                 );
const depositIxLayout         = byteDiscriminatedLayout( 1, lamportsItemAsArg  );
const withdrawIxLayout        = byteDiscriminatedLayout( 2, lamportsItemAsArg  );
const delegateIxLayout        = byteDiscriminatedLayout( 3, []                 );
const deactivateIxLayout      = byteDiscriminatedLayout( 4, []                 );
const authorizeUserIxLayout   = byteDiscriminatedLayout( 5, authorizeUserIxArgs);
const authorizeIntentIxLayout = byteDiscriminatedLayout( 6, []                 );
const splitIxLayout           = byteDiscriminatedLayout( 7, lamportsItemAsArg  );
const mergeIxLayout           = byteDiscriminatedLayout( 8, []                 );
const moveStakeIxLayout       = byteDiscriminatedLayout( 9, lamportsItemAsArg  );
const moveLamportsIxLayout    = byteDiscriminatedLayout(10, lamportsItemAsArg  );

export function composeInitializeIx(
  addresses: {
    signerOrSession: Address;
    payer:           Address;
    stake:           Address;
  },
) {
  const { signerOrSession, payer, stake } = addresses;

  const accounts = [
    [signerOrSession, AccountRole.READONLY_SIGNER],
    [payer,           AccountRole.WRITABLE_SIGNER],
    [stake,           AccountRole.WRITABLE_SIGNER],
    [stakeProgramId,  AccountRole.READONLY       ],
    [systemProgramId, AccountRole.READONLY       ],
    [rentSysvarId,    AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, initializeIxLayout, {}, sessionStakeProgramId);
}

export function composeDepositIx(
  lamports: Lamports,
  addresses: {
    user:            Address;
    signerOrSession: Address;
    payer:           Address;
    stake:           Address;
    userFogo:        Address;
  },
) {
  const { user, signerOrSession, payer, stake, userFogo } = addresses;
  const pSigner   = user === signerOrSession ? sessionStakeProgramId : programSigner;
  const authority = sessionStakeAuthorityPda(addresses.user);
  const tmpFogo   = tmpFogoPda(addresses.signerOrSession);

  const accounts = [
    [signerOrSession, AccountRole.READONLY_SIGNER],
    [pSigner,         AccountRole.READONLY       ],
    [payer,           AccountRole.WRITABLE_SIGNER],
    [stake,           AccountRole.WRITABLE       ],
    [authority,       AccountRole.READONLY       ],
    [userFogo,        AccountRole.WRITABLE       ],
    [tmpFogo,         AccountRole.WRITABLE       ],
    [nativeMint,      AccountRole.READONLY       ],
    [tokenProgramId,  AccountRole.READONLY       ],
    [systemProgramId, AccountRole.READONLY       ],
    [rentSysvarId,    AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, depositIxLayout, { lamports }, sessionStakeProgramId);
}

export function composeWithdrawIx(
  lamports: Lamports,
  addresses: {
    user:            Address,
    signerOrSession: Address,
    stake:           Address,
    userFogo:        Address,
  },
) {
  const { user, signerOrSession, stake, userFogo } = addresses;
  const authority = sessionStakeAuthorityPda(user);

  const accounts = [
    [signerOrSession,      AccountRole.READONLY_SIGNER],
    [stake,                AccountRole.WRITABLE       ],
    [authority,            AccountRole.WRITABLE       ],
    [userFogo,             AccountRole.WRITABLE       ],
    [nativeMint,           AccountRole.READONLY       ],
    [clockSysvarId,        AccountRole.READONLY       ],
    [stakeHistorySysvarId, AccountRole.READONLY       ],
    [stakeProgramId,       AccountRole.READONLY       ],
    [tokenProgramId,       AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, withdrawIxLayout, { lamports }, sessionStakeProgramId);
}

export function composeDelegateIx(
  addresses: {
    user:            Address;
    signerOrSession: Address;
    stake:           Address;
    voteAccount:     Address;
  },
) {
  const { user, signerOrSession, stake, voteAccount } = addresses;
  const authority = sessionStakeAuthorityPda(user);

  const accounts = [
    [signerOrSession,     AccountRole.READONLY_SIGNER],
    [stake,                AccountRole.WRITABLE       ],
    [authority,            AccountRole.READONLY       ],
    [voteAccount,          AccountRole.READONLY       ],
    [stakeProgramId,       AccountRole.READONLY       ],
    [stakeHistorySysvarId, AccountRole.READONLY       ],
    [clockSysvarId,        AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, delegateIxLayout, {}, sessionStakeProgramId);
}

export function composeDeactivateIx(
  addresses: {
    user:            Address;
    signerOrSession: Address;
    stake:           Address;
  },
) {
  const { user, signerOrSession, stake } = addresses;
  const authority = sessionStakeAuthorityPda(user);

  const accounts = [
    [signerOrSession, AccountRole.READONLY_SIGNER],
    [stake,           AccountRole.WRITABLE       ],
    [authority,       AccountRole.READONLY       ],
    [stakeProgramId,  AccountRole.READONLY       ],
    [clockSysvarId,   AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, deactivateIxLayout, {}, sessionStakeProgramId);
}

export function composeAuthorizeUserIx(
  authorityType: AuthorityType,
  addresses: {
    newAuthority:  Address;
    user:          Address;
    stake:         Address;
  },
) {
  const { user, stake, newAuthority } = addresses;
  const authority = sessionStakeAuthorityPda(user);

  const accounts = [
    [user,            AccountRole.READONLY_SIGNER],
    [stake,           AccountRole.WRITABLE       ],
    [authority,       AccountRole.READONLY       ],
    [clockSysvarId,   AccountRole.READONLY       ],
    [stakeProgramId,  AccountRole.READONLY       ],
  ] as const;

  return composeIx(
    accounts,
    authorizeUserIxLayout,
    { newAuthority, authorityType },
    sessionStakeProgramId,
  );
}

export async function composeAuthorizeIntentIxs(
  client:        SvmClient,
  chainId:       ChainId,
  authorityType: AuthorityType,
  signMessage:   SigningFunc,
  addresses: {
    user:         Address;
    stake:        Address;
    sponsor:      Address;
    newAuthority: Address;
  },
  currentNonce?: bigint,
): Promise<[Ix, Ix]> {
  const { user, stake, sponsor, newAuthority } = addresses;
  const authority = sessionStakeAuthorityPda(user);
  const nonceAddr = sessionStakeNoncePda(authority);

  currentNonce ??= await getDeserializedAccount(client, nonceAddr, nonceLayout) ?? 0n;
  const intent = {
    description: authorizeDescription,
    parameters: {
      chain_id:       chainId,
      stake_account:  stake,
      authority_type: authorityAliases[authorityType],
      new_authority:  newAuthority,
      nonce:          (currentNonce + 1n).toString(),
    },
  };

  return [
    await composeEd25519IntentVerifyIx(user, signMessage, intent),
    composeAuthorizeIntentIx({ stake, authority, nonce: nonceAddr, sponsor }),
  ];
}

export function composeAuthorizeIntentIx(
  addresses: {
    stake:     Address;
    authority: Address;
    nonce:     Address;
    sponsor:   Address;
  },
) {
  const { stake, authority, nonce, sponsor } = addresses;

  const accounts = [
    [chainIdPda,           AccountRole.READONLY       ],
    [instructionsSysvarId, AccountRole.READONLY       ],
    [stake,                AccountRole.WRITABLE       ],
    [authority,            AccountRole.READONLY       ],
    [nonce,                AccountRole.WRITABLE       ],
    [sponsor,              AccountRole.WRITABLE_SIGNER],
    [clockSysvarId,        AccountRole.READONLY       ],
    [systemProgramId,      AccountRole.READONLY       ],
    [stakeProgramId,       AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, authorizeIntentIxLayout, {}, sessionStakeProgramId);
}

type TransferAddresses = {
  signerOrSession:  Address,
  sourceStake:      Address,
  destinationStake: Address,
  authority:        Address,
};

const transferAccounts = (
  addresses:                TransferAddresses,
  destinationStakeIsSigner = false
) => {
  const { signerOrSession, sourceStake, destinationStake, authority } = addresses;
  const destinationStakeRole =
    destinationStakeIsSigner
    ? AccountRole.WRITABLE_SIGNER
    : AccountRole.WRITABLE;

  return [
    [signerOrSession,  AccountRole.READONLY_SIGNER],
    [sourceStake,      AccountRole.WRITABLE       ],
    [destinationStake, destinationStakeRole       ],
    [authority,        AccountRole.READONLY       ],
    [stakeProgramId,   AccountRole.READONLY       ],
  ] as const;
}

export function composeSplitIx(
  lamports: Lamports,
  addresses: TransferAddresses & { payer: Address },
) {
  const { payer } = addresses;

  const accounts = [
    ...transferAccounts(addresses, true),
    [payer,            AccountRole.WRITABLE_SIGNER],
    [systemProgramId,  AccountRole.READONLY       ],
    [rentSysvarId,     AccountRole.READONLY       ],
  ] as const;

  return composeIx(accounts, splitIxLayout, { lamports }, sessionStakeProgramId);
}

export function composeMergeIx(addresses: TransferAddresses) {
  const accounts = [
    ...transferAccounts(addresses),
    [clockSysvarId,        AccountRole.READONLY],
    [stakeHistorySysvarId, AccountRole.READONLY],
  ] as const;

  return composeIx(accounts, mergeIxLayout, {}, sessionStakeProgramId);
}

export function composeMoveStakeIx(lamports: Lamports, addresses: TransferAddresses) {
  const accounts = transferAccounts(addresses);

  return composeIx(accounts, moveStakeIxLayout, { lamports }, sessionStakeProgramId);
}

export function composeMoveLamportsIx(lamports: Lamports, addresses: TransferAddresses) {
  const accounts = transferAccounts(addresses);

  return composeIx(accounts, moveLamportsIxLayout, { lamports }, sessionStakeProgramId);
}
