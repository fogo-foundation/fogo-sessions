import { useCallback, useState } from "react";

export const useAsync = <T>(fn: () => Promise<T>) => {
  const [state, setState] = useState<State<T>>(State.Base());

  const execute = useCallback(() => {
    if (state.type === StateType.Running) {
      throw new AlreadyInProgressError();
    }
    setState(State.Running());
    fn()
      .then((result) => {
        setState(State.Complete(result));
      })
      .catch((error: unknown) => {
        // biome-ignore lint/suspicious/noConsole: need to print error to console
        console.error(error);
        setState(State.ErrorState(error));
        throw error;
      });
  }, [state, fn]);

  return { execute, state };
};

export enum StateType {
  Base,
  Running,
  Error,
  Complete,
}

const State = {
  Base: () => ({ type: StateType.Base as const }),
  Complete: <T>(result: T) => ({ result, type: StateType.Complete as const }),
  ErrorState: (error: unknown) => ({
    error,
    type: StateType.Error as const,
  }),
  Running: () => ({ type: StateType.Running as const }),
};

type Base = ReturnType<typeof State.Base>;
type Running = ReturnType<typeof State.Running>;
type Complete<T> = ReturnType<typeof State.Complete<T>>;
type ErrorState = ReturnType<typeof State.ErrorState>;
type State<T> = Base | Running | Complete<T> | ErrorState;

class AlreadyInProgressError extends Error {
  constructor() {
    super("Can't run async hook when already in progress");
    this.name = "AlreadyInProgressError";
  }
}
