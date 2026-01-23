import { Skeleton } from "@fogo/component-library/Skeleton";
import { Switch } from "@fogo/component-library/Switch";
import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import type { DomainConfig } from "../../db-schema";
import { ListHeader } from "../ListHeader";
import styles from "./index.module.scss";

type DomainSettingsSwitchProps = {
  label: string;
  isEnabled: boolean;
  onChange?: (isEnabled: boolean) => void;
};

export const DomainSettingsSwitch = (props: DomainSettingsSwitchProps) => {
  const [isEnabled, setIsEnabled] = useState(props.isEnabled);

  useEffect(() => {
    setIsEnabled(props.isEnabled);
  }, [props.isEnabled]);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    props.onChange?.(newValue);
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
          onChange={() => {
            // No-op for now
          }}
        />
        <DomainSettingsSwitch
          label="Enable Preflight Simulation"
          isEnabled={props.domainConfig.enable_preflight_simulation}
          onChange={() => {
            // No-op for now
          }}
        />
      </div>
    </div>
  );
};
