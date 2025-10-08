import { useCallback } from 'react';
import type { KeyedMutator } from 'swr';
import useSWR from 'swr';

/**
 * Enhanced SWR hook with standardized error handling and state management.
 *
 * This hook wraps the standard SWR hook to provide consistent state
 * representations and error handling across the SDK.
 *
 * @example
 * ```tsx
 * import { useData } from '@leapwallet/sessions-sdk-react-native';
 *
 * function MyComponent() {
 *   const result = useData('my-key', () => fetchMyData());
 *
 *   switch (result.type) {
 *     case TokenDataStateType.Loading:
 *       return <Text>Loading...</Text>;
 *     case TokenDataStateType.Loaded:
 *       return <Text>Data: {result.data}</Text>;
 *     case TokenDataStateType.Error:
 *       return <Text>Error: {result.error.message}</Text>;
 *     default:
 *       return <Text>No data</Text>;
 *   }
 * }
 * ```
 *
 * @param args - Arguments to pass to the underlying SWR hook
 * @returns State object with type discriminator and relevant data/error/mutate functions
 *
 * @category Utilities
 * @public
 */
export const useData = <T>(...args: Parameters<typeof useSWR<T>>) => {
  const { data, isLoading, mutate, ...rest } = useSWR(...args);

  const error = rest.error as unknown;

  const reset = useCallback(() => {
    mutate(undefined).catch((resetError: unknown) => {
      console.error('Failed to reset data', resetError);
    });
  }, [mutate]);

  if (error) {
    console.error('Data fetch failed:', error);
    return State.ErrorState(new UseDataError(error), reset);
  } else if (isLoading) {
    return State.Loading();
  } else if (data) {
    return State.Loaded(data, mutate);
  } else {
    return State.NotLoaded(mutate);
  }
};

/**
 * Enumeration of possible data states for useData hook.
 *
 * @category Types & Enums
 * @public
 */
export enum TokenDataStateType {
  /** Data has not been loaded yet */
  NotLoaded,

  /** Data is currently being fetched */
  Loading,

  /** Data has been successfully loaded */
  Loaded,

  /** An error occurred while loading data */
  Error,
}

const State = {
  NotLoaded: <T>(mutate: KeyedMutator<T>) => ({
    type: TokenDataStateType.NotLoaded as const,
    mutate,
  }),
  Loading: () => ({ type: TokenDataStateType.Loading as const }),
  Loaded: <T>(data: T, mutate: KeyedMutator<T>) => ({
    type: TokenDataStateType.Loaded as const,
    mutate,
    data,
  }),
  ErrorState: (error: UseDataError, reset: () => void) => ({
    type: TokenDataStateType.Error as const,
    error,
    reset,
  }),
};

class UseDataError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : '');
    this.name = 'UseDataError';
    this.cause = cause;
  }
}
