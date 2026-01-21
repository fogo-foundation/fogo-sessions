import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import { type EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import { ConfirmModal } from "../ConfirmModal";
import { deleteVariation as deleteVariationPaymaster } from "./actions/variation";
import styles from "./delete-variation-button.module.scss";

const useDeleteVariation = (sessionState: EstablishedSessionState) => {
  const toast = useToast();
  const deleteVariation = useCallback(
    async ({ variationId }: { variationId: string }) => {
      const sessionToken = await sessionState.createLogInToken();
      await deleteVariationPaymaster({ variationId, sessionToken });
      toast.success("Variation deleted");
    },
    [sessionState, toast.success],
  );
  return useAsync(deleteVariation);
};

type DeleteVariationButtonProps =
  | {
      sessionState: EstablishedSessionState;
      variationId: string;
      isDisabled: false;
    }
  | {
      sessionState: EstablishedSessionState;
      isDisabled: true;
    };

export const DeleteVariationButton = (props: DeleteVariationButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { execute, state } = useDeleteVariation(props.sessionState);
  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    execute();
    setIsOpen(false);
  }, [execute]);

  return (
    <>
      <ConfirmModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        altText="Variant"
        title="Delete variation"
        subtitle="This action cannot be undone. Proceed with caution."
        action={
          <Button
            onClick={handleDeleteConfirm}
            isDisabled={state.type === StateType.Running}
          >
            Delete
          </Button>
        }
      >
        <span>Are you sure you want to delete this variation?</span>
      </ConfirmModal>
      <Button
        variant="ghost"
        onClick={handleDeleteClick}
        className={styles.deleteVariationButton ?? ""}
        size="lg"
      >
        <TrashIcon />
      </Button>
    </>
  );
};
