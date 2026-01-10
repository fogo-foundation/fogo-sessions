import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";

const DomainSettingsModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) => {
  return (
    <ModalDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <div>Domain settings TODO</div>
    </ModalDialog>
  );
};

export const DomainSettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      <DomainSettingsModal isOpen={isOpen} onOpenChange={onOpenChange} />
      <Button variant="outline" onClick={handleClick}>
        Settings <GearIcon />
      </Button>
    </>
  );
};
