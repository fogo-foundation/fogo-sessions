import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import styles from "./delete-variation-button.module.scss";

export const DeleteVariationModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <ModalDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <div>Delete variation TODO</div>
    </ModalDialog>
  );
};

export const DeleteVariationButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      <DeleteVariationModal isOpen={isOpen} onOpenChange={onOpenChange} />
      <Button
        variant="ghost"
        onClick={handleClick}
        className={styles.deleteVariationButton ?? ""}
        size="lg"
      >
        <TrashIcon />
      </Button>
    </>
  );
};
