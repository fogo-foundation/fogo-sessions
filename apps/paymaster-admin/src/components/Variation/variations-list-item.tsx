import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import {
  ChecksIcon,
  CodeBlockIcon,
  SpinnerIcon,
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
import { stringify } from "smol-toml";
import type { Variation } from "../../db-schema";
import { saveVariation } from "./actions/save-variation";
import { DeleteVariationButton } from "./delete-variation-button";
import { VariationCodeBlock } from "./variation-code-block";
import styles from "./variations-list-item.module.scss";

type VariationListItemProps =
  | {
      variation: Variation;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const VariationListItem = (props: VariationListItemProps) => {
  return props.isLoading ? (
    <Skeleton className={styles.variationListItemSkeleton} />
  ) : (
    <VariationForm variation={props.variation} />
  );
};

const VariationForm = ({ variation }: { variation: Variation }) => {
  const sessions = useSession();

  const wrappedSaveVariation = useCallback(
    async (...args: [unknown, FormData]) => {
      if (isEstablished(sessions)) {
        const sessionToken = await sessions.createLogInToken();
        return saveVariation.bind(null, {
          variationId: variation.id,
          sessionToken,
        })(...args);
      }
    },
    [sessions, variation.id],
  );

  const [state, formAction, isSubmitting] = useActionState(
    wrappedSaveVariation,
    null,
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState(variation.name);
  const [code, setCode] = useState(generateEditableToml(variation));
  const [maxGasSpend, setMaxGasSpend] = useState(
    variation.max_gas_spend.toString(),
  );

  const baselineRef = useRef<{
    name: string;
    maxGasSpend: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    baselineRef.current = {
      name: variation.name,
      maxGasSpend: String(variation.max_gas_spend),
      code: stringify({
        domains: {
          tx_variations: { instructions: variation.transaction_variation },
        },
      }),
    };

    // also reset local state when variation changes
    setName(variation.name);
    setMaxGasSpend(String(variation.max_gas_spend));
    setCode(
      stringify({
        domains: {
          tx_variations: { instructions: variation.transaction_variation },
        },
      }),
    );
  }, [variation]);

  const current = useMemo(() => {
    return { name, maxGasSpend, code };
  }, [name, maxGasSpend, code]);

  const isDirty =
    current.name !== baselineRef.current?.name ||
    current.maxGasSpend !== baselineRef.current?.maxGasSpend ||
    current.code !== baselineRef.current?.code;

  const handleExpand = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  return (
    <Form action={formAction} validationBehavior="aria">
      <div className={styles.variationListItem}>
        <div
          className={styles.variationListCard}
          data-is-expanded={isExpanded ? "" : undefined}
        >
          <VariationVersionBadge version={variation.version} />
          <TextField
            name="name"
            value={name}
            inputMode="text"
            minLength={1}
            maxLength={255}
            isRequired
            className={styles.fieldVariationName ?? ""}
            onChange={setName}
          />
          <TextField
            type="number"
            inputMode="numeric"
            name="maxGasSpend"
            value={maxGasSpend}
            isRequired
            onChange={setMaxGasSpend}
            rightExtra={<GasPumpIcon />}
            className={styles.fieldMaxGasSpend ?? ""}
          />
          <Button variant="outline" onClick={handleExpand}>
            <CodeBlockIcon />
          </Button>
        </div>
        <DeleteVariationButton />
      </div>
      <VariationCodeBlock
        isExpanded={isExpanded}
        value={code}
        onChange={setCode}
        footer={
          <>
            {isDirty ? "aaa" : "bbb"}
            <Badge variant="success" size="xs">
              All passed <ChecksIcon />
            </Badge>
            <Button
              variant="secondary"
              type="submit"
              isDisabled={!!isSubmitting}
            >
              {isSubmitting ? (
                <>
                  Saving...
                  <SpinnerIcon />
                </>
              ) : (
                "Save"
              )}
            </Button>
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

const generateEditableToml = (variation: Variation) => {
  return stringify({
    domains: {
      tx_variations: { instructions: variation.transaction_variation },
    },
  });
};