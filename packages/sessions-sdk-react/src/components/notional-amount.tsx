import clsx from "clsx";
import * as dnum from "dnum";

import { stringToAmount } from "../amount-to-string.js";
import { calculateNotional } from "../calculate-notional.js";
import styles from "./notional-amount.module.css";

type Props = {
  amount: string;
  decimals: number;
  price: number;
  className?: string | undefined;
  validationError?: string | undefined;
};

export const NotionalAmount = ({
  amount,
  decimals,
  price,
  className,
  validationError,
}: Props) => {
  console.log("validation Error:", validationError, amount);
  if (validationError) {
    return (
      <div className={clsx(className, styles.error)}>
        Invalid amount specified
      </div>
    );
  }

  if (amount.length === 0) {
    return;
  }

  // use try catch to avoid breaking errors from invalid input
  // even though validation should prevent this, asynchrony across
  // hooks could still cause invalid amount inputs to reach here
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
