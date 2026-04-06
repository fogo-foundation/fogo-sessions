import { Select } from "@fogo/component-library/Select";
import { useCallback } from "react";
import type { z } from "zod";
import type { DataConstraintSpecificationSchema } from "../../../db-schema";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";
import type {
  PrimitiveDataValue,
  ValueType,
} from "./primitive-data-value-input";
import {
  getDefaultForType,
  PrimitiveDataValueInput,
} from "./primitive-data-value-input";

type DataConstraintSpec = z.infer<typeof DataConstraintSpecificationSchema>;

type OperatorType = "LessThan" | "GreaterThan" | "EqualTo" | "Neq";

const ALL_OPERATOR_ITEMS: Array<{ key: OperatorType; label: string }> = [
  { key: "LessThan", label: "Less than" },
  { key: "GreaterThan", label: "Greater than" },
  { key: "EqualTo", label: "Equal to one of" },
  { key: "Neq", label: "Not equal to any of" },
];

const SCALAR_OPERATOR_ITEMS: Array<{ key: OperatorType; label: string }> = [
  { key: "EqualTo", label: "Equal To" },
  { key: "Neq", label: "Not Equal To" },
];

// Integer types support all operators; scalar/bytes types only support EqualTo/Neq
const INTEGER_TYPES = new Set(["U8", "U16", "U32", "U64"]);

function getValueTypeKey(value: PrimitiveDataValue): ValueType {
  for (const key of Object.keys(value)) return key as ValueType;
  return "U8";
}

function isIntegerValue(value: PrimitiveDataValue): boolean {
  return INTEGER_TYPES.has(getValueTypeKey(value));
}

function getOperator(spec: DataConstraintSpec): OperatorType {
  if ("LessThan" in spec) return "LessThan";
  if ("GreaterThan" in spec) return "GreaterThan";
  if ("EqualTo" in spec) return "EqualTo";
  if ("Neq" in spec) return "Neq";
  return "EqualTo";
}

function getFirstValue(spec: DataConstraintSpec): PrimitiveDataValue {
  if ("LessThan" in spec) return spec.LessThan;
  if ("GreaterThan" in spec) return spec.GreaterThan;
  if ("EqualTo" in spec) return spec.EqualTo[0] ?? getDefaultForType("U8");
  if ("Neq" in spec) return spec.Neq[0] ?? getDefaultForType("U8");
  return getDefaultForType("U8");
}

function getSingleValue(spec: DataConstraintSpec): PrimitiveDataValue {
  if ("LessThan" in spec) return spec.LessThan;
  if ("GreaterThan" in spec) return spec.GreaterThan;
  return getDefaultForType("U8");
}

function getArrayValues(spec: DataConstraintSpec): PrimitiveDataValue[] {
  if ("EqualTo" in spec) return spec.EqualTo;
  if ("Neq" in spec) return spec.Neq;
  return [getDefaultForType("U8")];
}

type DataConstraintSpecInputProps = {
  value: DataConstraintSpec;
  onChange: (value: DataConstraintSpec) => void;
};

export const DataConstraintSpecInput = ({
  value,
  onChange,
}: DataConstraintSpecInputProps) => {
  const operator = getOperator(value);
  const firstValue = getFirstValue(value);
  const currentType = getValueTypeKey(firstValue);
  const supportsInequality = isIntegerValue(firstValue);
  const operatorItems = supportsInequality
    ? ALL_OPERATOR_ITEMS
    : SCALAR_OPERATOR_ITEMS;

  // "Add value" creates a default matching the current array type
  const createDefaultValue = useCallback(
    () => getDefaultForType(currentType),
    [currentType],
  );

  const handleOperatorChange = useCallback(
    (key: OperatorType) => {
      const defaultVal = getDefaultForType("U8");
      switch (key) {
        case "LessThan":
          onChange({ LessThan: defaultVal });
          break;
        case "GreaterThan":
          onChange({ GreaterThan: defaultVal });
          break;
        case "EqualTo":
          onChange({ EqualTo: [defaultVal] });
          break;
        case "Neq":
          onChange({ Neq: [defaultVal] });
          break;
      }
    },
    [onChange],
  );

  const handleSingleValueChange = useCallback(
    (val: PrimitiveDataValue) => {
      if (operator === "LessThan") {
        onChange({ LessThan: val });
      } else if (operator === "GreaterThan") {
        onChange({ GreaterThan: val });
      }
    },
    [operator, onChange],
  );

  // When the first value's type changes, drop all other values
  const handleArrayValuesChange = useCallback(
    (values: PrimitiveDataValue[]) => {
      const changedValue = values.find(
        (v) => getValueTypeKey(v) !== currentType,
      );

      const normalizedValues = changedValue ? [changedValue] : values;

      if (operator === "EqualTo") {
        onChange({ EqualTo: normalizedValues });
      } else if (operator === "Neq") {
        onChange({ Neq: normalizedValues });
      }
    },
    [operator, onChange, currentType],
  );

  const isArrayOperator = operator === "EqualTo" || operator === "Neq";

  return (
    <div className={styles.fieldGroup ?? ""}>
      <span className={styles.fieldLabel ?? ""}>Constraint</span>
      <Select<OperatorType>
        aria-label="Constraint operator"
        className={styles.selectField ?? ""}
        items={operatorItems}
        onSelectionChange={(key) => handleOperatorChange(key as OperatorType)}
        selectedKey={operator}
      />
      {isArrayOperator ? (
        <DynamicList
          createDefault={createDefaultValue}
          items={getArrayValues(value)}
          label="constraint value"
          onChange={handleArrayValuesChange}
          renderItem={(item, index, onItemChange) => (
            <PrimitiveDataValueInput
              disableTypeSelector={index > 0}
              onChange={onItemChange}
              value={item}
            />
          )}
        />
      ) : (
        <PrimitiveDataValueInput
          integerOnly
          onChange={handleSingleValueChange}
          value={getSingleValue(value)}
        />
      )}
    </div>
  );
};
