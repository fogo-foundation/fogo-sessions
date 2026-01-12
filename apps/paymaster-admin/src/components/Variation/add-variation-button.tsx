import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import { StackPlusIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";

const AddVariationModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <ModalDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <div>Add variation TODO</div>
    </ModalDialog>
  );
};

export const AddVariationButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      <AddVariationModal isOpen={isOpen} onOpenChange={onOpenChange} />
      <Button variant="secondary" onClick={handleClick}>
        Add Variation <StackPlusIcon />
      </Button>
    </>
  );
};
