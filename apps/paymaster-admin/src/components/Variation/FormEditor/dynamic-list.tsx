import { Button } from "@fogo/component-library/Button";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { useCallback } from "react";
import styles from "./form-editor.module.scss";

type DynamicListProps<T> = {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    onChange: (value: T) => void,
  ) => ReactNode;
  createDefault: () => T;
  label: string;
};

export const DynamicList = <T,>({
  items,
  onChange,
  renderItem,
  createDefault,
  label,
}: DynamicListProps<T>) => {
  const handleAdd = useCallback(() => {
    onChange([...items, createDefault()]);
  }, [items, onChange, createDefault]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange],
  );

  const handleItemChange = useCallback(
    (index: number, value: T) => {
      const next = [...items];
      next[index] = value;
      onChange(next);
    },
    [items, onChange],
  );

  return (
    <div className={styles.dynamicList}>
      {items.map((item, index) => (
        <div className={styles.dynamicListItem} key={index}>
          <div className={styles.dynamicListItemContent}>
            {renderItem(item, index, (value) => handleItemChange(index, value))}
          </div>
          <Button
            aria-label={`Remove ${label} ${index}`}
            onClick={() => handleRemove(index)}
            size="sm"
            variant="ghost"
          >
            <TrashIcon />
          </Button>
        </div>
      ))}
      <Button onClick={handleAdd} size="sm" variant="outline">
        <PlusIcon /> Add {label}
      </Button>
    </div>
  );
};
