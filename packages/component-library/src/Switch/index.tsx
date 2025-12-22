import clsx from "clsx";
import type { ComponentProps } from "react";
import { Switch as AriaSwitch } from "react-aria-components";

import styles from "./index.module.css";

type SwitchProps = ComponentProps<typeof AriaSwitch>;

export const Switch = ({ children, className, ...props }: SwitchProps) => {
  return (
    <AriaSwitch className={clsx(styles.switch, className)} {...props}>
      {({ isSelected, isDisabled }) => (
        <>
          <div className={styles.track}>
            <div
              data-disabled={isDisabled || undefined}
              className={clsx(styles.handle, isSelected && styles.selected)}
            />
          </div>
          {children}
        </>
      )}
    </AriaSwitch>
  );
};
