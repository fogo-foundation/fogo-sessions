import type { Address } from "@solana/kit";
import type { Layout, Item, ProperLayout } from "@xlabs-xyz/binary-layout";
import { unwrapSingleton } from "@xlabs-xyz/binary-layout";
import { isArray, omit, assertType } from "@xlabs-xyz/const-utils";
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

//helper to improve readability
export const pdaOfProgram =
  (programId: Address) =>
    (seeds: Parameters<typeof findPda>[0]) =>
      findPda(seeds, programId);

export const u64Item = { binary: "uint", size: 8, endianness: "little" } as const;

export const nonceLayout = accountLayout("Nonce", u64Item);

//for #[instruction(discriminator = [n])] instructions
const byteDiscriminatorItem = (n: number) =>
  ({ name: "discriminator", binary: "uint", size: 1, custom: n, omit: true } as const);

const byteDiscriminatedItem = <const I extends Item>(
  discriminator: number,
  item: I,
) => unwrapSingleton(assertType<ProperLayout>()(
  [byteDiscriminatorItem(discriminator), {name: "singleton", ...item}]
));

const byteDiscriminatedProperLayout = <const L extends ProperLayout>(
  discriminator: number,
  layout: L,
) => [byteDiscriminatorItem(discriminator), ...layout] as const;

type ByteDiscriminatedLayout<L extends Layout> =
  L extends readonly []
  ? Omit<ReturnType<typeof byteDiscriminatorItem>, "name">
  : L extends Item
  ? ReturnType<typeof byteDiscriminatedItem<L>>
  : L extends ProperLayout
  ? ReturnType<typeof byteDiscriminatedProperLayout<L>>
  : never;
export const byteDiscriminatedLayout = <const L extends Layout>(
  discriminator: number,
  layout: L,
): ByteDiscriminatedLayout<L> => (
  isArray(layout)
  ? (layout.length ===  0
    ? omit(byteDiscriminatorItem(discriminator), "name")
    : byteDiscriminatedProperLayout(discriminator, layout))
  : byteDiscriminatedItem(discriminator, layout)
) as ByteDiscriminatedLayout<L>;
