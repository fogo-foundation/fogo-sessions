import { Skeleton } from "@fogo/component-library/Skeleton";
import { Switch } from "@fogo/component-library/Switch";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import type { DomainConfig } from "../../db-schema";
import { ListHeader } from "../ListHeader";
import styles from "./index.module.scss";

type DomainSettingsSwitchProps = {
  label: string;
  isEnabled: boolean;
};

export const DomainSettingsSwitch = (props: DomainSettingsSwitchProps) => {
  const [isEnabled, setIsEnabled] = useState(props.isEnabled);

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <Switch isSelected={isEnabled} onChange={handleToggle}>
      {props.label}
    </Switch>
  );
};

type DomainSettingsProps =
  | {
      domainConfig: DomainConfig;
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
      <div className={styles.domainSettingsCheckboxes}>
        <DomainSettingsSwitch
          label="Enable Session Management"
          isEnabled={props.domainConfig.enable_session_management}
        />
        <DomainSettingsSwitch
          label="Enable Preflight Simulation"
          isEnabled={props.domainConfig.enable_preflight_simulation}
        />
      </div>
    </div>
  );
};
