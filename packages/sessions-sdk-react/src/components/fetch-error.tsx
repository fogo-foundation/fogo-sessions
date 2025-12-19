import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

import { errorToString } from "../error-to-string.js";
import { Button } from "./component-library/Button/index.js";
import { createStyles } from "./component-library/css/bind.js";

type Props = {
  headline: ReactNode;
  error: unknown;
  reset?: (() => void) | undefined;
} & ComponentProps<"div">;

export const FetchError = ({
  headline,
  error,
  reset,
  className,
  ...props
}: Props) => (
  <div className={clsx(classes.fetchError, className)} {...props}>
    <WarningCircleIcon className={classes.icon} />
    <span className={classes.headline}>{headline}</span>
    <span className={classes.message}>{errorToString(error)}</span>
    {reset !== undefined && (
      <Button className={classes.retryButton} variant="solid" onPress={reset}>
        Retry
      </Button>
    )}
  </div>
);

const { classes } = createStyles("fogo-fetch-error", (theme) => {
  const headlineAndIconRules = {
    color: theme.color.states.error.foreground,
  };

  return {
    fetchError: {
      alignItems: "center",
      display: "flex",
      gap: theme.spacing(3),
      flexFlow: "column nowrap",
      justifyContent: "center",
      textAlign: "center",
    },
    headline: {
      ...headlineAndIconRules,
      fontSize: theme.spacing(8),
    },
    icon: {
      ...headlineAndIconRules,
      ...theme.textStyles(),
    },
    message: {
      ...theme.textStyles("xs"),
      color: theme.color.muted,
    },
    retryButton: {
      marginTop: theme.spacing(2),
    },
  };
});
