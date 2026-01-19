import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import {
  type EstablishedSessionState,
  useSession,
} from '@fogo/sessions-sdk-react';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr';
import { useCallback, useState } from 'react';
import { ConfirmModal } from '../ConfirmModal';
import styles from './delete-variation-button.module.scss';

export const DeleteVariationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sessionState = useSession();

  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const onSuccess = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <ConfirmModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        altText="Variant"
        title="Delete variation"
        subtitle="This action cannot be undone. Proceed with caution."
      >
        <div>Delete variation TODO</div>
      </ConfirmModal>
      <Button
        variant="ghost"
        onClick={handleClick}
        className={styles.deleteVariationButton ?? ''}
        size="lg"
      >
        <TrashIcon />
      </Button>
    </>
  );
};
