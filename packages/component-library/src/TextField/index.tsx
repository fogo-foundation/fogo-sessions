"use client";

import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import {
  FieldError,
  Group,
  Input,
  Label,
  TextArea,
  TextField as TextFieldImpl,
} from "react-aria-components";

import styles from "./index.module.css";

export const TextField = ({
  label,
  className,
  labelExtra,
  placeholder,
  inputGroupClassName,
  labelLineClassName,
  isPending,
  rightExtra,
  ...props
}: ComponentProps<typeof TextFieldImpl> & {
  label?: ReactNode | undefined;
  labelExtra?: ReactNode;
  placeholder?: ComponentProps<typeof Input>["placeholder"] | undefined;
  inputGroupClassName?: string | undefined;
  labelLineClassName?: string | undefined;
  isPending?: boolean | undefined;
  double?: boolean | undefined;
  rightExtra?: ReactNode;
}) => (
  <TextFieldImpl
    className={clsx(styles.textField, className)}
    data-double={props.double ? "" : undefined}
    data-pending={isPending ? "" : undefined}
    isDisabled={isPending ?? props.isDisabled ?? false}
    {...props}
  >
    {(label || labelExtra) && (
      <div className={clsx(styles.labelLine, labelLineClassName)}>
        {label && <Label className={styles.label ?? ""}>{label}</Label>}
        {labelExtra && <div className={styles.labelExtra}>{labelExtra}</div>}
      </div>
    )}
    <Group className={clsx(styles.inputGroup, inputGroupClassName)}>
      {props.double ? (
        <TextArea
          className={styles.input ?? ""}
          data-1p-ignore
          data-has-right-extra={rightExtra ? "" : undefined}
          placeholder={placeholder}
        />
      ) : (
        <Input
          className={styles.input ?? ""}
          data-1p-ignore
          data-has-right-extra={rightExtra ? "" : undefined}
          placeholder={placeholder ?? ""}
        />
      )}
      {rightExtra && <div className={styles.rightExtra}>{rightExtra}</div>}
      <FieldError className={styles.error ?? ""}>
        {({ defaultChildren }) => (
          <>
            <svg
              className={styles.overlayArrow}
              height={12}
              viewBox="0 0 12 12"
              width={12}
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
