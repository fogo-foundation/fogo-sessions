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
  amountValidationError?: string | undefined;
};

export const NotionalAmount = ({
  amount,
  decimals,
  price,
  className,
  amountValidationError,
}: Props) => {
  if (amountValidationError) {
    return (
      <div className={clsx(className, styles.error)}>
        Invalid amount specified
      </div>
    );
  }

  // if amount is empty, don't attempt to parse it
  // TODO: should we amend stringToAmount to handle empty string better?
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
  } catch {
    return;
  }
};
