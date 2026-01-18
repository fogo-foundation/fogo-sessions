import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import { useToast } from "@fogo/component-library/Toast";
import { useDataConfig } from "@fogo/component-library/useData";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import {
  ChecksIcon,
  CodeBlockIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Form } from "react-aria-components";
import { parse, stringify } from "smol-toml";
import { ZodError } from "zod";
import { TransactionVariations, type Variation } from "../../db-schema";
import { createVariation, updateVariation } from "./actions/save-variation";
import { DeleteVariationButton } from "./delete-variation-button";
import { VariationCodeBlock } from "./variation-code-block";
import styles from "./variations-list-item.module.scss";

type VariationListItemProps =
  | {
      domainConfigId: string;
      variation?: Variation;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const VariationListItem = (props: VariationListItemProps) => {
  return props.isLoading ? (
    <Skeleton className={styles.variationListItemSkeleton} />
  ) : (
    <VariationForm {...props} />
  );
};

type VariationFormProps = { domainConfigId: string; variation?: Variation };

const VariationForm = ({ variation, domainConfigId }: VariationFormProps) => {
  const { mutate } = useDataConfig();
  const toast = useToast();
  const sessions = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [name, setName] = useState(variation?.name ?? "");
  const [code, setCode] = useState(() => {
    if (!variation) return "";
    return variation.version === "v0" || isEditingJson
      ? JSON.stringify(variation.transaction_variation, null, 2)
      : generateEditableToml(variation.transaction_variation);
  });
  const [codeError, setCodeError] = useState<string | undefined>();
  const [maxGasSpend, setMaxGasSpend] = useState(
    variation?.max_gas_spend?.toString() ?? "",
  );


  const baselineRef = useRef<{
    name: string;
    maxGasSpend: string;
    code: string;
  } | null>({
    name,
    maxGasSpend: variation?.max_gas_spend?.toString() ?? "",
    code,
  });
  
  useEffect(() => {
    if (variation?.id) {
      setName(variation?.name ?? "");
      setMaxGasSpend(variation?.max_gas_spend?.toString() ?? "");
      setCode(
        variation?.version === "v0" || isEditingJson
          ? JSON.stringify(variation?.transaction_variation, null, 2)
          : generateEditableToml(variation?.transaction_variation),
      );
      baselineRef.current = {
        name: variation?.name ?? "",
        maxGasSpend: variation?.max_gas_spend?.toString() ?? "",
        code:
          variation?.version === "v0" || isEditingJson
            ? JSON.stringify(variation?.transaction_variation, null, 2)
            : generateEditableToml(variation?.transaction_variation),
      };
    }
  }, [variation, isEditingJson]);
  const wrappedUpdateVariation = useCallback(
    async (...args: [unknown, FormData]) => {
      if (isEstablished(sessions)) {
        const sessionToken = await sessions.createLogInToken();
        return updateVariation
          .bind(null, {
            variationId: variation?.id ?? "",
            isEditingJson,
            sessionToken,
          })(...args)
          .then((result) => {
            mutate(["user-data", sessions.walletPublicKey.toBase58()]);
            toast.success(`Variation ${name} updated!`);
            setIsExpanded(false);
            return result;
          });
      } else {
        return;
      }
    },
    [sessions, isEditingJson, variation?.id, name, mutate, toast.success],
  );

  const wrappedCreateVariation = useCallback(
    async (...args: [unknown, FormData]) => {
      if (isEstablished(sessions)) {
        const sessionToken = await sessions.createLogInToken();
        return createVariation
          .bind(null, {
            domainConfigId,
            isEditingJson,
            sessionToken,
          })(...args)
          .then((result) => {
            mutate(["user-data", sessions.walletPublicKey.toBase58()]);
            toast.success(`Variation ${name} created!`);
            setIsExpanded(false);
            return result;
          });
      } else {
        return;
      }
    },
    [sessions, domainConfigId, isEditingJson, name, mutate, toast.success],
  );

  const [, formAction, isSubmitting] = useActionState(
    variation ? wrappedUpdateVariation : wrappedCreateVariation,
    null,
  );

  const validateCode = useCallback(
    (value: string) => {
      try {
        const data = isEditingJson
          ? JSON.parse(value)
          : (
              parse(value) as {
                domains: {
                  tx_variations: { instructions: TransactionVariations };
                };
              }
            ).domains.tx_variations.instructions;
        setCodeError(undefined);
        return TransactionVariations.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          setCodeError(error.errors.map((error) => error.message).join(", "));
        } else if (error instanceof Error) {
          setCodeError(error.message);
        } else {
          setCodeError(String(error));
        }
        return false;
      }
    },
    [isEditingJson],
  );

  // useEffect(() => {
  //   if (variation?.id) {
  //     const code =
  //       ;

  //     baselineRef.current = {
  //       name: variation.name,
  //       maxGasSpend: String(variation.max_gas_spend),
  //       code,
  //     };
  //   } else {
  //     baselineRef.current = {
  //       name: "",
  //       maxGasSpend: "",
  //       code: "",
  //     };
  //   }
  // }, [
  //   variation?.name,
  //   variation?.max_gas_spend,
  //   variation?.transaction_variation,
  //   isEditingJson,
  //   variation?.version,
  //   variation?.id,
  // ]);

  const current = useMemo(() => {
    return { name, maxGasSpend, code };
  }, [name, maxGasSpend, code]);

  const isDirty =
    current.name !== baselineRef.current?.name ||
    current.maxGasSpend !== baselineRef.current?.maxGasSpend ||
    current.code !== baselineRef.current?.code;

  const handleEditClick = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCloseClick = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleEditJsonClick = useCallback(() => {
    const newIsEditingJson = !isEditingJson;
    if (code) {
      const variationObject = validateCode(code);
      if (variationObject) {
        setIsEditingJson(newIsEditingJson);
        setCode(
          newIsEditingJson
            ? JSON.stringify(variationObject, null, 2)
            : generateEditableToml(variationObject),
        );
      }
    } else {
      setIsEditingJson(newIsEditingJson);
    }
  }, [isEditingJson, code, validateCode]);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      validateCode(value);
    },
    [validateCode],
  );
  
  const footerActions = useMemo(() => {
    if (isDirty) {
      return (
        <Button
          variant="secondary"
          type="submit"
          isDisabled={!!isSubmitting || !!codeError}
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      );
    }
    return (
      <Button variant="ghost" onClick={handleCloseClick}>
        Dismiss
      </Button>
    );
  }, [isDirty, isSubmitting, codeError, handleCloseClick]);
// console.log("name", { name, varName: variation?.name });
  return (
    <Form action={formAction} validationBehavior="aria">
      <div className={styles.variationListItem}>
        <button
          type="button"
          className={styles.variationListCard}
          data-is-expanded={isExpanded ? "" : undefined}
          data-is-editable={isExpanded ? "" : undefined}
          onClick={handleEditClick}
        >
          <VariationVersionBadge version={variation?.version ?? "v1"} />
          <TextField
            name="name"
            value={name}
            inputMode="text"
            placeholder={
              isExpanded ? "Variation name" : "Click to add variation"
            }
            minLength={1}
            maxLength={255}
            isRequired
            className={styles.fieldVariationName ?? ""}
            onChange={setName}
            aria-label="Variation name"
          />
          <TextField
            type="number"
            inputMode="numeric"
            name="maxGasSpend"
            placeholder="Max gas spend"
            value={maxGasSpend}
            isRequired
            onChange={setMaxGasSpend}
            rightExtra={<GasPumpIcon />}
            className={styles.fieldMaxGasSpend ?? ""}
            aria-label="Max gas spend"
          />
          {isExpanded ? (
            <Button variant="ghost" onClick={handleCloseClick}>
              <XIcon />
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEditClick}>
              <CodeBlockIcon />
            </Button>
          )}
        </button>
        <DeleteVariationButton />
      </div>
      <VariationCodeBlock
        mode={isEditingJson ? "json" : "toml"}
        isExpanded={isExpanded}
        value={code}
        onChange={handleCodeChange}
        footer={
          <>
            <div className={styles.variationFormFooterActions}>
              <Button variant="ghost" onClick={handleEditJsonClick} size="sm">
                {isEditingJson ? "TOML" : "JSON"}
              </Button>
              {codeError ? (
                <p className={styles.variationFormFooterError}>{codeError}</p>
              ) : (
                <Badge variant="success" size="xs">
                  All passed <ChecksIcon />
                </Badge>
              )}
            </div>
            {footerActions}
          </>
        }
      />
    </Form>
  );
};

const VariationVersionBadge = ({
  version,
}: {
  version: Variation["version"];
}) => {
  return (
    <Badge variant="info" size="xs">
      {version === "v0" ? "V0" : "V1"}
    </Badge>
  );
};

const generateEditableToml = (transaction_variation: TransactionVariations) => {
  return stringify({
    domains: {
      tx_variations: { instructions: transaction_variation },
    },
  });
};
