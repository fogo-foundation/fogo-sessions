import clsx from "clsx";
import type { ReactNode, ComponentProps } from "react";
import {
  FieldError,
  Input,
  Label,
  TextField as TextFieldImpl,
  NumberField as NumberFieldImpl,
  Text,
  Group,
  Button,
} from "react-aria-components";

import styles from "./field.module.css";

export const TextField = ({
  label,
  description,
  className,
  controls,
  ...props
}: ComponentProps<typeof TextFieldImpl> & {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  controls?: ReactNode;
}) => (
  <TextFieldImpl className={clsx(styles.textField, className)} {...props}>
    <Field label={label} description={description}>
      <Input className={styles.input ?? ""} />
      {controls && <div className={styles.controls}>{controls}</div>}
    </Field>
  </TextFieldImpl>
);

export const NumberField = ({
  label,
  description,
  className,
  ...props
}: ComponentProps<typeof NumberFieldImpl> & {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
}) => (
  <NumberFieldImpl className={clsx(styles.numberField, className)} {...props}>
    <Field label={label} description={description}>
      <Input className={styles.input ?? ""} />
      <Button slot="increment">+</Button>
      <Button slot="decrement">-</Button>
    </Field>
  </NumberFieldImpl>
);

const Field = ({
  label,
  description,
  children,
}: {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  children: ReactNode;
}) => (
  <>
    {label && <Label className={styles.label ?? ""}>{label}</Label>}
    <Group className={styles.inputGroup ?? ""}>
      {children}
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
    {description && (
      <Text className={styles.description} slot="description">
        {description}
      </Text>
    )}
  </>
);
