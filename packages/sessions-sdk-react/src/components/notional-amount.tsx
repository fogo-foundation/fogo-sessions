import * as dnum from "dnum";
import { useMemo } from "react";

import { calculateNotional } from "../calculate-notional.js";

type Props = {
  amount: bigint;
  decimals: number;
  price: number;
  className?: string | undefined;
};

export const NotionalAmount = ({
  amount,
  decimals,
  price,
  className,
}: Props) => {
  const notional = useMemo(
    () => calculateNotional(amount, decimals, price),
    [amount, decimals, price],
  );

  return (
    <div className={className}>
      ${dnum.format(notional, { digits: 2, trailingZeros: true })}
    </div>
  );
};
