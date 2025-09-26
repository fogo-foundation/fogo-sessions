import clsx from "clsx";
import type { ReactNode, ComponentProps } from "react";
import {
  FieldError,
  Input,
  TextArea,
  Label,
  TextField as TextFieldImpl,
  Group,
} from "react-aria-components";

import styles from "./field.module.css";

export const TextField = ({
  label,
  className,
  labelExtra,
  placeholder,
  inputGroupClassName,
  isPending,
  ...props
}: ComponentProps<typeof TextFieldImpl> & {
  label?: ReactNode | undefined;
  labelExtra?: ReactNode;
  placeholder?: ComponentProps<typeof Input>["placeholder"] | undefined;
  inputGroupClassName?: string | undefined;
  isPending?: boolean | undefined;
} & (
    | {
        double?: false | undefined;
      }
    | {
        double: true;
      }
  )) => (
  <TextFieldImpl
    className={clsx(styles.textField, className)}
    data-double={props.double ? "" : undefined}
    data-pending={isPending ? "" : undefined}
    isDisabled={isPending ?? props.isDisabled ?? false}
    {...props}
  >
    <div className={styles.labelLine}>
      {label && <Label className={styles.label ?? ""}>{label}</Label>}
      {labelExtra && <div className={styles.labelExtra}>{labelExtra}</div>}
    </div>
    <Group className={clsx(styles.inputGroup, inputGroupClassName)}>
      {props.double ? (
        <TextArea placeholder={placeholder} className={styles.input ?? ""} />
      ) : (
        <Input placeholder={placeholder} className={styles.input ?? ""} />
      )}
      <FieldError className={styles.error ?? ""}>
        {({ defaultChildren }) => (
          <>
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              className={styles.overlayArrow}
            >
              <path d="M0 0 L6 6 L12 0" />
            </svg>
            {defaultChildren}
          </>
        )}
      </FieldError>
    </Group>
  </TextFieldImpl>
);
