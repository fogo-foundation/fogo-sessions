import type { Address } from "@solana/kit";
import type { ProperLayout } from "@xlabs-xyz/binary-layout";
import type { Seed, RefuseAddress } from "@xlabs-xyz/svm";
import { accountLayout, findPda } from "@xlabs-xyz/svm";

export type Opts<T> = { [K in keyof T]?: T[K] | undefined };

export const amountToString = (amount: bigint, decimals: number): string => {
  const asStr = amount.toString();
  const intLength = asStr.length - decimals;
  const [int, atomic] =
    intLength > 0
    ? [asStr.slice(0, intLength), asStr.slice(intLength)]
    : ["0", asStr];

  const frac = atomic.padStart(decimals, "0").replace(/0+$/, "");
  return int + (frac === "" ? "" : "." + frac);
};

export const u64Item = { binary: "uint", size: 8, endianness: "little" } as const;

export const nonceLayout = accountLayout("Nonce", u64Item);

//helper to improve readability
export const pdaOfProgram =
  (programId: Address) =>
    <const S extends Parameters<typeof findPda>[0]>(
      firstSeed: RefuseAddress<S>,
      ...seeds: Seed<Address>[]
    ): Address =>
      findPda(firstSeed, ...seeds, programId);

//for #[instruction(discriminator = [n])] instructions
const byteDiscriminatorItem = (n: number) =>
  ({ name: "discriminator", binary: "uint", size: 1, custom: n, omit: true } as const);

export const byteDiscriminatedLayout = <const L extends ProperLayout>(
  discriminator: number,
  layout: L,
) =>
  [byteDiscriminatorItem(discriminator), ...layout] as const;
