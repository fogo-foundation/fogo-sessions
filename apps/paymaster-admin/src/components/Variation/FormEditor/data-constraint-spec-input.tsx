import { Select } from "@fogo/component-library/Select";
import { useCallback } from "react";
import type { z } from "zod";
import type { DataConstraintSpecificationSchema } from "../../../db-schema";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";
import type { PrimitiveDataValue } from "./primitive-data-value-input";
import {
  getDefaultForType,
  PrimitiveDataValueInput,
} from "./primitive-data-value-input";

type DataConstraintSpec = z.infer<typeof DataConstraintSpecificationSchema>;

type OperatorType = "LessThan" | "GreaterThan" | "EqualTo" | "Neq";

const ALL_OPERATOR_ITEMS: Array<{ key: OperatorType; label: string }> = [
  { key: "LessThan", label: "Less Than" },
  { key: "GreaterThan", label: "Greater Than" },
  { key: "EqualTo", label: "Equal To" },
  { key: "Neq", label: "Not Equal" },
];

const SCALAR_OPERATOR_ITEMS: Array<{ key: OperatorType; label: string }> = [
  { key: "EqualTo", label: "Equal To" },
  { key: "Neq", label: "Not Equal" },
];

// Integer types support all operators; scalar/bytes types only support EqualTo/Neq
const INTEGER_TYPES = new Set(["U8", "U16", "U32", "U64"]);

function getValueTypeKey(value: PrimitiveDataValue): string {
  for (const key of Object.keys(value)) return key;
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

const createDefaultValue = () => getDefaultForType("U8");

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
  const supportsInequality = isIntegerValue(firstValue);
  const operatorItems = supportsInequality
    ? ALL_OPERATOR_ITEMS
    : SCALAR_OPERATOR_ITEMS;

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

  // For array operators, when a value type changes to non-integer while on
  // an integer operator, no issue since EqualTo/Neq work for all types.
  // But we need to handle the case where we're editing values in an array.
  const handleArrayValuesChange = useCallback(
    (values: PrimitiveDataValue[]) => {
      if (operator === "EqualTo") {
        onChange({ EqualTo: values });
      } else if (operator === "Neq") {
        onChange({ Neq: values });
      }
    },
    [operator, onChange],
  );

  const isArrayOperator = operator === "EqualTo" || operator === "Neq";

  return (
    <div className={styles.fieldGroup ?? ""}>
      <span className={styles.fieldLabel ?? ""}>Constraint</span>
      <Select<OperatorType>
        items={operatorItems}
        selectedKey={operator}
        onSelectionChange={(key) => handleOperatorChange(key as OperatorType)}
        aria-label="Constraint operator"
        className={styles.selectField ?? ""}
      />
      {isArrayOperator ? (
        <DynamicList
          items={getArrayValues(value)}
          onChange={handleArrayValuesChange}
          renderItem={(item, _index, onItemChange) => (
            <PrimitiveDataValueInput value={item} onChange={onItemChange} />
          )}
          createDefault={createDefaultValue}
          label="constraint value"
        />
      ) : (
        <PrimitiveDataValueInput
          value={getSingleValue(value)}
          onChange={handleSingleValueChange}
          integerOnly
        />
      )}
    </div>
  );
};
