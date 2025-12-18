"use client";

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

import { classes } from "./index.styles.js";

export const TextField = ({
  label,
  className,
  labelExtra,
  placeholder,
  inputGroupClassName,
  labelLineClassName,
  isPending,
  ...props
}: ComponentProps<typeof TextFieldImpl> & {
  label?: ReactNode | undefined;
  labelExtra?: ReactNode;
  placeholder?: ComponentProps<typeof Input>["placeholder"] | undefined;
  inputGroupClassName?: string | undefined;
  labelLineClassName?: string | undefined;
  isPending?: boolean | undefined;
  double?: boolean | undefined;
}) => (
  <TextFieldImpl
    className={clsx(classes.textField, className)}
    data-double={props.double ? "" : undefined}
    data-pending={isPending ? "" : undefined}
    isDisabled={isPending ?? props.isDisabled ?? false}
    {...props}
  >
    <div className={clsx(classes.labelLine, labelLineClassName)}>
      {label && <Label className={classes.label}>{label}</Label>}
      {labelExtra && <div className={classes.labelExtra}>{labelExtra}</div>}
    </div>
    <Group className={clsx(classes.inputGroup, inputGroupClassName)}>
      {props.double ? (
        <TextArea
          data-1p-ignore
          placeholder={placeholder}
          className={classes.input}
        />
      ) : (
        <Input
          data-1p-ignore
          placeholder={placeholder}
          className={classes.input}
        />
      )}
      <FieldError className={classes.error}>
        {({ defaultChildren }) => (
          <>
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              className={classes.overlayArrow}
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
