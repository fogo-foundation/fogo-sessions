import { Button } from "@fogo/component-library/Button";
import { errorToString } from "@fogo/component-library/error-to-string";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { Switch } from "@fogo/component-library/Switch";
import { useToast } from "@fogo/component-library/Toast";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useRef } from "react";
import { Form } from "react-aria-components";
import { useUserData } from "../../client/paymaster";
import type { DomainConfig } from "../../db-schema";
import { ListHeader } from "../ListHeader";
import { updateDomainSettings } from "./actions/domainSettings";
import styles from "./index.module.scss";

type DomainSettingsListProps = {
  domainConfig: DomainConfig;
  sessionState: EstablishedSessionState;
};

export const DomainSettingsList = (props: DomainSettingsListProps) => {
  const toast = useToast();
  const userData = useUserData(props.sessionState);
  const formRef = useRef<HTMLFormElement>(null);

  const wrappedUpdateDomainSettings = useCallback(async () => {
    if (formRef.current) {
      // using a form ref to get the uncontrolled input values since we can't use useActionState as it resets the form after submission
      const formData = new FormData(formRef.current);
      const enableSessionManagement =
        formData.get("enableSessionManagement") === "on";
      const enablePreflightSimulation =
        formData.get("enablePreflightSimulation") === "on";
      const sessionToken = await props.sessionState.createLogInToken();
      await updateDomainSettings({
        domainConfigId: props.domainConfig.id,
        enableSessionManagement,
        enablePreflightSimulation,
        sessionToken,
      });
      if ("mutate" in userData) {
        await userData.mutate();
      }
    }
  }, [props.sessionState, props.domainConfig.id, userData]);

  const { execute, state } = useAsync(wrappedUpdateDomainSettings, {
    onSuccess: () => {
      toast.success("Domain settings updated");
    },
    onError: (error) => {
      toast.error(`Failed to update domain settings: ${errorToString(error)}`);
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      execute();
    },
    [execute],
  );

  return (
    <Form
      ref={formRef}
      className={styles.domainSettingsCheckboxes ?? ""}
      onSubmit={handleSubmit}
    >
      <Switch
        name="enableSessionManagement"
        defaultSelected={props.domainConfig.enable_session_management}
      >
        Enable Session Management
      </Switch>
      <Switch
        name="enablePreflightSimulation"
        defaultSelected={props.domainConfig.enable_preflight_simulation}
      >
        Enable Preflight Simulation
      </Switch>
      <div>
        <Button
          type="submit"
          variant="secondary"
          isDisabled={state.type === StateType.Running}
        >
          {state.type === StateType.Running ? "Saving..." : "Save"}
        </Button>
      </div>
    </Form>
  );
};

type DomainSettingsProps =
  | {
      domainConfig: DomainConfig;
      sessionState: EstablishedSessionState;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const DomainSettings = (props: DomainSettingsProps) => {
  return (
    <div className={styles.domainSettings}>
      <ListHeader
        isLoading={props.isLoading}
        title="Domain Settings"
        icon={<GearIcon size={24} weight="duotone" />}
        count={2}
      />
      {props.isLoading ? (
        <Skeleton className={styles.domainSettingsSkeleton} />
      ) : (
        <DomainSettingsList
          domainConfig={props.domainConfig}
          sessionState={props.sessionState}
        />
      )}
    </div>
  );
};
