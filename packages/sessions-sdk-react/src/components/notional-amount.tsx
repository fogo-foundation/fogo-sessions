import * as dnum from "dnum";

import { stringToAmount } from "../amount-to-string.js";
import { calculateNotional } from "../calculate-notional.js";

type Props = {
  amount: string;
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
  if (amount.length === 0) {
    return;
  }

  // use try catch to avoid breaking errors from invalid input
  try {
    const amountToSend = stringToAmount(amount, decimals);
    const notional = calculateNotional(amountToSend, decimals, price);
    return (
      <div className={className}>
        ${dnum.format(notional, { digits: 2, trailingZeros: true })}
      </div>
    );
  } catch (error) {
    return null;
  }
};
