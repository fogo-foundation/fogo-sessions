import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import { useUserData } from "../../client/paymaster";
import { ConfirmModal } from "../ConfirmModal";
import { deleteVariation as deleteVariationPaymaster } from "./actions/variation";
import styles from "./delete-variation-button.module.scss";

const useDeleteVariation = (
  sessionState: EstablishedSessionState,
  variationId: string,
  { onSuccess, onError }: { onSuccess?: () => void; onError?: () => void } = {},
) => {
  const userData = useUserData(sessionState);

  const toast = useToast();
  const deleteVariation = useCallback(async () => {
    const sessionToken = await sessionState.createLogInToken();
    await deleteVariationPaymaster({ variationId, sessionToken });
    if ("mutate" in userData) {
      await userData.mutate();
    }
  }, [sessionState, variationId, userData]);

  const onSuccessCallback = useCallback(() => {
    toast.success("Variation deleted");
    onSuccess?.();
  }, [toast.success, onSuccess]);

  const onErrorCallback = useCallback(() => {
    toast.error("Failed to delete variation");
    onError?.();
  }, [toast.error, onError]);

  return useAsync(deleteVariation, {
    onSuccess: onSuccessCallback,
    onError: onErrorCallback,
  });
};

const DeleteVariationButtonWithModal = ({
  sessionState,
  variationId,
}: {
  sessionState: EstablishedSessionState;
  variationId: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { execute, state } = useDeleteVariation(sessionState, variationId, {
    onSuccess: () => {
      setIsOpen(false);
    },
  });
  const onOpenChange = useCallback((isOpen: boolean) => {
    setIsOpen(isOpen);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setIsOpen(true);
  }, []);

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
            onClick={execute}
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

const DisabledDeleteVariationButton = () => (
  <Button
    variant="ghost"
    className={styles.deleteVariationButton ?? ""}
    size="lg"
    isDisabled={true}
  >
    <TrashIcon />
  </Button>
);

export const DeleteVariationButton = ({
  sessionState,
  variationId,
}: {
  sessionState: EstablishedSessionState;
  variationId?: string;
}) => {
  return variationId ? (
    <DeleteVariationButtonWithModal
      sessionState={sessionState}
      variationId={variationId}
    />
  ) : (
    <DisabledDeleteVariationButton />
  );
};
