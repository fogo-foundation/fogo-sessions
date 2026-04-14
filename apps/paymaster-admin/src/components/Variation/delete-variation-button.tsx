import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import { useUserData } from "../../client/paymaster";
import type { Variation } from "../../db-schema";
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
    await deleteVariationPaymaster({ sessionToken, variationId });
    if ("mutate" in userData) {
      await userData.mutate();
    }
  }, [sessionState, variationId, userData]);

  const onSuccessCallback = useCallback(() => {
    toast.success("Variation deleted");
    onSuccess?.();
  }, [toast, onSuccess]);

  const onErrorCallback = useCallback(() => {
    toast.error("Failed to delete variation");
    onError?.();
  }, [toast, onError]);

  return useAsync(deleteVariation, {
    onError: onErrorCallback,
    onSuccess: onSuccessCallback,
  });
};

const getDeleteButtonProps = (additionalProps?: {
  onClick?: () => void;
  isDisabled?: boolean;
}) => ({
  children: <TrashIcon />,
  className: styles.deleteVariationButton ?? "",
  size: "lg" as const,
  variant: "ghost" as const,
  ...additionalProps,
});

const DeleteVariationButtonWithModal = ({
  sessionState,
  variation,
}: {
  sessionState: EstablishedSessionState;
  variation: Variation;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { execute, state } = useDeleteVariation(sessionState, variation?.id, {
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
        action={
          <Button
            isDisabled={state.type === StateType.Running}
            onClick={execute}
          >
            Delete
          </Button>
        }
        altText="Variant"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        subtitle="This action cannot be undone. Proceed with caution."
        title="Delete variation"
      >
        <span>Are you sure you want to delete this variation?</span>
      </ConfirmModal>
      <Button {...getDeleteButtonProps({ onClick: handleDeleteClick })} />
    </>
  );
};

const DisabledDeleteVariationButton = () => (
  <Button {...getDeleteButtonProps({ isDisabled: true })} />
);

export const DeleteVariationButton = ({
  sessionState,
  variation,
}: {
  sessionState: EstablishedSessionState;
  variation?: Variation;
}) => {
  return variation ? (
    <DeleteVariationButtonWithModal
      sessionState={sessionState}
      variation={variation}
    />
  ) : (
    <DisabledDeleteVariationButton />
  );
};
