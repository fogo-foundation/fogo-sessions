import { useCallback, useState } from "react";

export const useAsync = <T, Args extends unknown[]>(fn: (...args: Args) => Promise<T>) => {
  const [state, setState] = useState<State<T>>(State.Base());

  const execute = useCallback((...args: Args) => {
    if (state.type === StateType.Running) {
      throw new AlreadyInProgressError();
    }
    setState(State.Running());
    fn(...args)
      .then((result) => {
        setState(State.Complete(result));
      })
      .catch((error: unknown) => {
        // biome-ignore lint/suspicious/noConsole: we want to log the error
        console.error(error);
        setState(State.ErrorState(error));
        throw error;
      });
  }, [state, fn]);

  return { state, execute };
};

export enum StateType {
  Base,
  Running,
  Error,
  Complete,
}

const State = {
  Base: () => ({ type: StateType.Base as const }),
  Running: () => ({ type: StateType.Running as const }),
  Complete: <T>(result: T) => ({ type: StateType.Complete as const, result }),
  ErrorState: (error: unknown) => ({
    type: StateType.Error as const,
    error,
  }),
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
