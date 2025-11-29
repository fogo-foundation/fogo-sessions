import type { Address } from "@solana/kit";
import { address, AccountRole } from "@solana/kit";
import type { DeriveType, ProperLayout, Item } from "@xlabs-xyz/binary-layout";
import { stringConversion } from "@xlabs-xyz/binary-layout";
import { hashItem, timestampItem } from "@xlabs-xyz/common";
import type { RoArray, RoPair } from "@xlabs-xyz/const-utils";
import { range, mapTo, zip } from "@xlabs-xyz/const-utils";
import type { SvmClient, Ix } from "@xlabs-xyz/svm";
import {
  accountLayout,
  getDeserializedAccount,
  mintAccountLayout,
  svmAddressItem,
  vecBytesItem,
  vecArrayItem,
  findPda,
  composeIx,
  instructionsSysvarId,
  tokenProgramId,
  systemProgramId,
} from "@xlabs-xyz/svm";
import { definedOrThrow } from "@xlabs-xyz/utils";

import { chainIdPda } from "./chainid.js";
import { byteDiscriminatedLayout, amountToString } from "./common.js";
import type { ChainId } from "./constants.js";
import { domainRecordPda } from "./domain-registry.js";
import { getMplMetadataTruncated } from "./mpl-metadata.js";
import type { KV, SigningFunc } from "./svm-intent.js";
import { composeEd25519IntentVerifyIx } from "./svm-intent.js";

const description = "Fogo Sessions:\nSigning this intent will allow this app to interact with " +
  "your on-chain balances. Please make sure you trust this app and the domain in the message " +
  "matches the domain of the current web application.\n";

const tokenPermissions = {
  Unlimited: "this app may spend any amount of any token",
  Tokenless: "this app may not spend any tokens",
};

const version = "0.3";
const reservedKeys = new Set(["version", "chain_id", "domain", "expires", "session_key", "tokens"]);

export const sessionManagerProgramId = address("SesswvJ7puvAgpyqp7N8HnjNnvpnS8447tKNF3sPgbC");

export const programSignerPda =
  (programId: Address) => findPda("fogo_session_program_signer", programId);

export const sessionSetterPda = findPda("session_setter", sessionManagerProgramId);

const versionItem       = { binary: "uint", size: 1 } as const;
const unixTimestampItem = timestampItem("int", 8, "little");
const stringItem        = vecBytesItem(stringConversion);

const authorizedProgramsArrayItem = {
  binary: "array", layout: [
    { name: "programId", ...svmAddressItem },
    { name: "signerPda", ...svmAddressItem },
  ],
} as const;

const specificOrAllItem = <const L extends ProperLayout>(layout: L) => ({
  binary: "switch",
  idSize: 1,
  idTag: "all",
  layouts: [
    [[0, false], layout],
    [[1, true ], []    ],
  ],
} as const);

const revokedOrActiveLayout = <
  const R extends ProperLayout,
  const A extends ProperLayout,
>(revokedLayout: R, activeLayout: A) => [{
  name: "status",
  binary: "switch",
  idSize: 1,
  idTag: "active",
  layouts: [
    [[0, false], revokedLayout],
    [[1, true ], activeLayout ],
  ],
}] as const;

const authorizedProgamsItem =
  specificOrAllItem([{ name: "programs", ...authorizedProgramsArrayItem }]);

const authorizedTokensItem = specificOrAllItem([]);
const authorizedTokensWithMintsItem =
  specificOrAllItem([{ name: "mints", ...vecArrayItem(svmAddressItem) }]);

const revokedSessionInfoLayout = [
  { name: "user",             ...svmAddressItem                },
  { name: "expiration",       ...unixTimestampItem             },
  { name: "authorizedTokens", ...authorizedTokensWithMintsItem },
] as const;

const extraItem = {
  binary: "bytes",
  layout: vecArrayItem([{ name: "key", ...stringItem }, { name: "value", ...stringItem }]),
  custom: {
    to: (entries: RoArray<RoPair<string, string>>) =>
      Object.fromEntries(entries),
    from: (extra: KV) =>
      Object.entries(extra).map(([key, value]) => [key, value] as const),
  }
} as const;

const activeSessionInfoLayout = <const I extends Item>(authorizedTokens: I) => ([
  { name: "user",               ...svmAddressItem        },
  { name: "expiration",         ...unixTimestampItem     },
  { name: "authorizedPrograms", ...authorizedProgamsItem },
  { name: "authorizedTokens",   ...authorizedTokens      },
  { name: "extra",              ...extraItem             },
] as const);

//only a mother can love this
const sessionInfoItem = {
  binary: "switch",
  idSize: 1,
  idTag: "minor",
  layouts: [
    [1, activeSessionInfoLayout(authorizedTokensItem)],
    [2, revokedOrActiveLayout(
          [{ name: "expiration", ...unixTimestampItem }],
          activeSessionInfoLayout(authorizedTokensItem),
        )],
    [3, revokedOrActiveLayout(
          revokedSessionInfoLayout,
          activeSessionInfoLayout(authorizedTokensWithMintsItem),
        )],
    [4, revokedOrActiveLayout(
          revokedSessionInfoLayout,
          [ { name: "domainHash", ...hashItem },
            ...activeSessionInfoLayout(authorizedTokensWithMintsItem)],
        )]
  ],
} as const;

export const sessionAccountLayout = accountLayout("Session", [
  { name: "sponsor",     ...svmAddressItem  },
  { name: "major",       ...versionItem     },
  { name: "sessionInfo", ...sessionInfoItem },
] as const);

export type SessionAccount = DeriveType<typeof sessionAccountLayout>;

const [
  startSessionIxLayout,
  revokeSessionIxLayout,
  closeSessionIxLayout
] = mapTo(range(3))(v => byteDiscriminatedLayout(v, []));

type RoAddressRecord<T> = Readonly<Record<Address, T>>;

export async function composeStartSessionIxs(
  client:      SvmClient,
  signMessage: SigningFunc,
  chainId:     ChainId,
  domain:      string,
  expires:     Date,
  tokens:      "Unlimited" | RoAddressRecord<bigint>,
  extra:       KV,
  addresses: {
    user:    Address;
    sponsor: Address;
    session: Address;
  },
  cachedTokenInfo?: RoAddressRecord<Readonly<{ symbol?: string; decimals?: number }>>  ,
): Promise<[Ix, Ix]> {
  const { user, sponsor, session } = addresses;

  for (const [key, value] of Object.entries(extra)) {
    if (reservedKeys.has(key))
      throw new Error(`Extra key ${key} is reserved`);

    if (!/^[a-z]+(_[a-z0-9]+)*$/.test(key))
      throw new Error(`Extra key must be a snake_case string: ${key}`);

    if (value.includes("\n"))
      throw new Error(`Extra value must not contain a line break: ${value}`);
  }

  const [tokenStr, userTokens] = await (() => {
    if (tokens === "Unlimited")
      return [tokenPermissions.Unlimited, []] as const;

    const filtered = Object.entries(tokens).filter(([, amount]) => amount > 0) as
      unknown as RoArray<RoPair<Address, bigint>>;
    if (filtered.length === 0)
      return [tokenPermissions.Tokenless, []] as const;

    const getDecimals = (mint: Address) =>
      getDeserializedAccount(client, mint, mintAccountLayout())
        .then(acc => definedOrThrow(acc, `mint ${mint} not found`).decimals);

    const getSymbol = (mint: Address) =>
      getMplMetadataTruncated(client, { mint }).then(val => val?.symbol);

    return Promise.all(
      filtered.map(([mint, amount]) =>
        Promise.all([
          cachedTokenInfo?.[mint]?.decimals ?? getDecimals(mint),
          cachedTokenInfo?.[mint]?.symbol   ?? getSymbol(mint),
        ])
        .then(([decimals, symbol]) =>
          [`\n-${symbol ?? mint}: ${amountToString(amount, decimals)}`, mint] as const
        )
      )
    ).then(v => {
      const [tokenStrs, userTokens] = zip(v);
      return [tokenStrs.join(""), userTokens] as const
    });
  })();

  const intent = {
    description,
    parameters: {
      version,
      chain_id:    chainId,
      domain,
      expires:     expires.toISOString(),
      session_key: session,
      tokens:      tokenStr,
      ...extra,
    }
  };

  return [
    await composeEd25519IntentVerifyIx(user, signMessage, intent),
    composeStartSessionIx(
      { sponsor, session, domainRegistry: domainRecordPda(domain), userTokens }
    ),
  ];
}

export function composeStartSessionIx(
  addresses: {
    sponsor:        Address;
    session:        Address;
    domainRegistry: Address;
    userTokens?:    RoArray<Address> | undefined,
  },
) {
  const { sponsor, session, domainRegistry, userTokens } = addresses;

  const accounts = [
    [sponsor,              AccountRole.WRITABLE_SIGNER],
    [chainIdPda,           AccountRole.READONLY       ],
    [session,              AccountRole.WRITABLE_SIGNER],
    [instructionsSysvarId, AccountRole.READONLY       ],
    [domainRegistry,       AccountRole.READONLY       ],
    [sessionSetterPda,     AccountRole.READONLY       ],
    [tokenProgramId,       AccountRole.READONLY       ],
    [systemProgramId,      AccountRole.READONLY       ],
    ...(userTokens?.map(token => [token, AccountRole.WRITABLE] as const) ?? []),
  ] as const;

  return composeIx(accounts, startSessionIxLayout, {}, sessionManagerProgramId);
}

export function composeRevokeSessionIx(
  addresses: {
    session: Address;
    sponsor: Address;
  }
) {
  const { session, sponsor } = addresses;

  const accounts = [
    [session,         AccountRole.WRITABLE_SIGNER],
    [sponsor,         AccountRole.READONLY],
    [systemProgramId, AccountRole.READONLY],
  ] as const;

  return composeIx(accounts, revokeSessionIxLayout, {}, sessionManagerProgramId);
}

export function composeCloseSessionIx(
  addresses: {
    session:     Address;
    sponsor:     Address;
    userTokens?: RoArray<Address> | undefined;
  }
) {
  const { session, sponsor, userTokens } = addresses;

  const accounts = [
    [session,          AccountRole.WRITABLE],
    [sponsor,          AccountRole.READONLY],
    [sessionSetterPda, AccountRole.READONLY],
    [tokenProgramId,   AccountRole.READONLY],
    [systemProgramId,  AccountRole.READONLY],
    ...(userTokens?.map(token => [token, AccountRole.WRITABLE] as const) ?? []),
  ] as const;

  return composeIx(accounts, closeSessionIxLayout, {}, sessionManagerProgramId);
}

