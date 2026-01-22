import { useCallback } from "react";
import type { KeyedMutator } from "swr";
import useSWR from "swr";

export const useData = <T>(...args: Parameters<typeof useSWR<T>>) => {
  const { data, isLoading, mutate, ...rest } = useSWR(...args);

  const error = rest.error as unknown;
  const reset = useCallback(() => {
    mutate(undefined).catch((error: unknown) => {
      // biome-ignore lint/suspicious/noConsole: we want to log the error
      console.error("Failed to reset data", error);
    });
  }, [mutate]);

  if (error) {
    // biome-ignore lint/suspicious/noConsole: we want to log the error
    console.error("Data fetch failed:", error);
    return State.ErrorState(new UseDataError(error), reset);
  } else if (isLoading) {
    return State.Loading();
  } else if (data) {
    return State.Loaded(data, mutate);
  } else {
    return State.NotLoaded(mutate);
  }
};

export enum StateType {
  NotLoaded,
  Loading,
  Loaded,
  Error,
}

const State = {
  NotLoaded: <T>(mutate: KeyedMutator<T>) => ({
    type: StateType.NotLoaded as const,
    mutate,
  }),
  Loading: () => ({ type: StateType.Loading as const }),
  Loaded: <T>(data: T, mutate: KeyedMutator<T>) => ({
    type: StateType.Loaded as const,
    mutate,
    data,
  }),
  ErrorState: (error: UseDataError, reset: () => void) => ({
    type: StateType.Error as const,
    error,
    reset,
  }),
};

class UseDataError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "");
    this.name = "UseDataError";
    this.cause = cause;
  }
}
