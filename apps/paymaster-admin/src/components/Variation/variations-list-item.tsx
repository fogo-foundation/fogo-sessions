import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { errorToString } from "@fogo/component-library/error-to-string";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import { useToast } from "@fogo/component-library/Toast";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  ChecksIcon,
  CodeBlockIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import { useCallback, useMemo, useState } from "react";
import { Form } from "react-aria-components";
import { parse, stringify } from "smol-toml";
import z, { ZodError } from "zod";
import { useUserData } from "../../client/paymaster";
import type { Variation } from "../../db-schema";
import {
  Base58Pubkey,
  TransactionVariations,
  VariationSchema,
} from "../../db-schema";
import { createOrUpdateVariation } from "./actions/variation";
import { DeleteVariationButton } from "./delete-variation-button";
import { VariationCodeBlock } from "./variation-code-block";
import styles from "./variations-list-item.module.scss";

type VariationListItemProps =
  | {
      sessionState: EstablishedSessionState;
      domainConfigId: string;
      domainName: string;
      variation?: Variation;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const VariationListItem = (props: VariationListItemProps) => {
  return (
    <div className={styles.variationListItem}>
      {props.isLoading ? (
        <Skeleton height={12} />
      ) : (
        <VariationForm {...props} />
      )}
    </div>
  );
};

type VariationFormProps = {
  sessionState: EstablishedSessionState;
  domainConfigId: string;
  variation?: Variation;
  domainName: string;
};

const VariationForm = ({
  sessionState,
  variation,
  domainConfigId,
  domainName,
}: VariationFormProps) => {
  const userData = useUserData(sessionState);
  const toast = useToast();
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
    variation?.version === "v1" ? variation.max_gas_spend.toString() : "",
  );
  const [paymasterFeeLamports, setPaymasterFeeLamports] = useState(
    variation?.version === "v1" && variation.paymaster_fee_lamports
      ? variation.paymaster_fee_lamports?.toString()
      : "",
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: v0 doesn't have max_gas_spend
  const baseline = useMemo(() => {
    if (!variation?.id) {
      // When creating a new variation, baseline is the initial empty state
      return {
        name: "",
        maxGasSpend: "",
        paymasterFeeLamports: "",
        code: "",
      };
    }
    const variationCode =
      variation?.version === "v0" || isEditingJson
        ? JSON.stringify(variation?.transaction_variation, null, 2)
        : generateEditableToml(variation?.transaction_variation ?? []);
    return {
      name: variation?.name ?? "",
      maxGasSpend:
        variation?.version === "v1" ? variation.max_gas_spend.toString() : "",
      paymasterFeeLamports:
        variation?.version === "v1" && variation.paymaster_fee_lamports
          ? variation.paymaster_fee_lamports.toString()
          : "",
      code: variationCode,
    };
  }, [
    variation?.id,
    variation?.name,
    variation?.version,
    variation?.transaction_variation,
    isEditingJson,
    variation?.version === "v1" ? variation.max_gas_spend.toString() : "",
    variation?.version === "v1" ? variation.paymaster_fee_lamports : undefined,
  ]);

  const resetForm = useCallback(() => {
    setName("");
    setMaxGasSpend("");
    setPaymasterFeeLamports("");
    setCode("");
    setCodeError(undefined);
  }, []);

  const validateCode = useCallback(
    (value: string) => {
      try {
        const data = isEditingJson
          ? JSON.parse(value)
          : parseTomlToObject(value).domains.tx_variations.instructions;
        setCodeError(undefined);
        return TransactionVariations.parse(data);
      } catch (error) {
        if (error instanceof ZodError) {
          setCodeError(error.errors.map((error) => error.message).join(", "));
        } else {
          setCodeError(errorToString(error));
        }
        return false;
      }
    },
    [isEditingJson],
  );

  const variationForTest = useMemo<Variation | null>(() => {
    if (!code) return null;

    try {
      if (variation?.version === "v0") {
        const data = JSON.parse(code);
        const transactionVariation = z.array(Base58Pubkey).parse(data);
        return VariationSchema.parse({
          id: variation?.id ?? crypto.randomUUID(),
          version: "v0",
          name,
          transaction_variation: transactionVariation,
          created_at: variation?.created_at ?? new Date(),
          updated_at: new Date(),
        });
      }

      const transactionVariation = validateCode(code);
      if (!transactionVariation) return null;

      const maxGasSpendNumber = Number(maxGasSpend || 0);
      if (!Number.isFinite(maxGasSpendNumber)) return null;

      return VariationSchema.parse({
        id: variation?.id ?? crypto.randomUUID(),
        version: "v1",
        name,
        transaction_variation: transactionVariation,
        max_gas_spend: maxGasSpendNumber,
        paymaster_fee_lamports: Number(paymasterFeeLamports),
        created_at: variation?.created_at ?? new Date(),
        updated_at: new Date(),
      });
    } catch {
      return null;
    }
  }, [
    code,
    name,
    maxGasSpend,
    paymasterFeeLamports,
    variation?.id,
    variation?.version,
    variation?.created_at,
    validateCode,
  ]);

  const wrappedCreateOrUpdateVariation = useCallback(async () => {
    const sessionToken = await sessionState.createLogInToken();
    const variationObject = validateCode(code);
    if (!variationObject) {
      throw new Error("Invalid variation");
    }
    return createOrUpdateVariation({
      variationId: variation?.id,
      domainConfigId,
      name,
      maxGasSpend,
      paymasterFeeLamports,
      variation: variationObject,
      sessionToken,
    });
  }, [
    sessionState,
    domainConfigId,
    name,
    maxGasSpend,
    paymasterFeeLamports,
    code,
    variation?.id,
    validateCode,
  ]);

  const { execute, state } = useAsync(wrappedCreateOrUpdateVariation, {
    onSuccess: () => {
      toast.success(
        variation ? `Variation ${name} updated!` : `Variation ${name} created!`,
      );
      if ("mutate" in userData) {
        userData.mutate();
        // reset the empty component that was used to create the variation
        if (!variation) {
          resetForm();
        }
      }
      setIsExpanded(false);
    },
    onError: (error) => {
      toast.error(
        `Failed to update variation ${name}: ${errorToString(error)}`,
      );
    },
  });

  const current = useMemo(() => {
    return { name, maxGasSpend, paymasterFeeLamports, code };
  }, [name, maxGasSpend, paymasterFeeLamports, code]);

  const isDirty =
    current.name !== baseline?.name ||
    current.maxGasSpend !== baseline?.maxGasSpend ||
    current.paymasterFeeLamports !== baseline?.paymasterFeeLamports ||
    current.code !== baseline?.code;

  const handleEditClick = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleEditClick();
      }
    },
    [handleEditClick],
  );

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

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      execute();
    },
    [execute],
  );

  return (
    <Form validationBehavior="aria" onSubmit={handleSubmit}>
      <div className={styles.variationListItemContent}>
        <div
          {...(isExpanded
            ? {}
            : {
                role: "button",
                onClick: handleEditClick,
                onKeyDown: handleCardKeyDown,
              })}
          className={styles.variationListCard}
          data-is-expanded={isExpanded ? "" : undefined}
          data-is-editable={isExpanded ? "" : undefined}
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
          {(!variation || variation?.version === "v1") && (
            <>
              <TextField
                type="number"
                inputMode="numeric"
                name="maxGasSpend"
                placeholder="Max gas spend"
                value={maxGasSpend}
                isRequired
                onChange={setMaxGasSpend}
                rightExtra={<GasPumpIcon />}
                className={styles.fieldVariationInput ?? ""}
                aria-label="Max gas spend"
              />
              <TextField
                type="number"
                inputMode="numeric"
                name="paymasterFeeLamports"
                placeholder="Fee lamports"
                value={paymasterFeeLamports}
                onChange={setPaymasterFeeLamports}
                rightExtra={<CoinsIcon />}
                className={styles.fieldVariationInput ?? ""}
                aria-label="Paymaster fee lamports"
              />
            </>
          )}
          {isExpanded ? (
            <Button variant="ghost" onClick={handleCloseClick}>
              <XIcon />
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEditClick}>
              <CodeBlockIcon />
            </Button>
          )}
        </div>
        <DeleteVariationButton
          {...(variation?.id
            ? {
                sessionState,
                variation,
                isDisabled: false,
              }
            : {
                sessionState,
                isDisabled: true,
              })}
        />
      </div>
      <VariationCodeBlock
        mode={isEditingJson ? "json" : "toml"}
        isExpanded={isExpanded}
        value={code}
        onChange={handleCodeChange}
        domain={domainName}
        variationForTest={variationForTest}
        footer={
          (!variation || variation?.version === "v1") && (
            <>
              <div className={styles.variationFormFooterActions}>
                <Button variant="ghost" onClick={handleEditJsonClick} size="sm">
                  {isEditingJson ? "TOML" : "JSON"}
                </Button>
                {codeError || state.type === StateType.Error ? (
                  <p className={styles.variationFormFooterError}>
                    {state.type === StateType.Error
                      ? errorToString(state.error)
                      : codeError}
                  </p>
                ) : (
                  <Badge variant="success" size="xs">
                    All passed <ChecksIcon />
                  </Badge>
                )}
              </div>
              {isDirty ? (
                <Button
                  variant="secondary"
                  type="submit"
                  isDisabled={state.type === StateType.Running || !!codeError}
                >
                  {state.type === StateType.Running ? "Saving..." : "Save"}
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleCloseClick}>
                  Dismiss
                </Button>
              )}
            </>
          )
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

const parseTomlToObject = (value: string) => {
  return z
    .object({
      domains: z.object({
        tx_variations: z.object({
          instructions: TransactionVariations,
        }),
      }),
    })
    .parse(parse(value));
};
