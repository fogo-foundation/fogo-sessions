import type { ProperLayout } from "@xlabs-xyz/binary-layout";

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

//for #[instruction(discriminator = [n])] instructions
const byteDiscriminatorItem = (n: number) =>
  ({ name: "discriminator", binary: "uint", size: 1, custom: n, omit: true } as const);

export const byteDiscriminatedLayout = <const L extends ProperLayout>(
  discriminator: number,
  layout: L,
) =>
  [byteDiscriminatorItem(discriminator), ...layout] as const;

