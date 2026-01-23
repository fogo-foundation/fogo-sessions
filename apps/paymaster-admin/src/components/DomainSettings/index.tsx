import { Button } from "@fogo/component-library/Button";
import { errorToString } from "@fogo/component-library/error-to-string";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { Switch } from "@fogo/component-library/Switch";
import { useToast } from "@fogo/component-library/Toast";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useActionState, useCallback, useEffect } from "react";
import { Form } from "react-aria-components";
import { FetchUserDataStateType, useUserData } from "../../client/paymaster";
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
  const updateDomainSettingsAction = useCallback(
    async (
      _prevState: unknown,
      formData: FormData,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const sessionToken = await props.sessionState.createLogInToken();
        console.log(
          formData,
          formData.get("enableSessionManagement"),
          formData.get("enablePreflightSimulation"),
        );
        const newData = await updateDomainSettings({
          domainConfigId: props.domainConfig.id,
          enableSessionManagement:
            formData.get("enableSessionManagement") === "on",
          enablePreflightSimulation:
            formData.get("enablePreflightSimulation") === "on",
          sessionToken,
        });
        if ("mutate" in userData) {
          console.log("mutating user data");
          console.log(newData);
          await userData.mutate(
            {
              type: FetchUserDataStateType.Success,
              user: newData,
            },
            {
              revalidate: false,
              optimisticData: {
                type: FetchUserDataStateType.Success,
                user: newData,
              },
            },
          );
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: errorToString(error),
        };
      }
    },
    [props.sessionState, props.domainConfig.id],
  );

  const [state, formAction, isPending] = useActionState(
    updateDomainSettingsAction,
    { success: false },
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Domain settings updated");
    } else if (state.error) {
      toast.error("Failed to update domain settings: " + state.error);
    }
  }, [state, toast]);

  return (
    <Form className={styles.domainSettingsCheckboxes ?? ""} action={formAction}>
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
        <Button type="submit" isDisabled={isPending}>
          {isPending ? "Saving..." : "Save"}
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
  if (props.isLoading) {
    return <Skeleton className={styles.domainSettingsSkeleton} />;
  }

  return (
    <div className={styles.domainSettings}>
      <ListHeader
        title="Domain Settings"
        icon={<GearIcon size={24} weight="duotone" />}
        count={2}
      />
      <DomainSettingsList
        domainConfig={props.domainConfig}
        sessionState={props.sessionState}
      />
    </div>
  );
};
