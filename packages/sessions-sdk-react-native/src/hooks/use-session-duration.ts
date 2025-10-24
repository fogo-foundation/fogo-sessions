import { useState, useCallback } from 'react';

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

export const DURATION = {
  '30-seconds': {
    label: '30 Seconds',
    value: 30 * ONE_SECOND_IN_MS,
  },
  'one-hour': {
    label: 'One Hour',
    value: ONE_HOUR_IN_MS,
  },
  'one-day': {
    label: 'One Day',
    value: ONE_DAY_IN_MS,
  },
  'one-week': {
    label: 'One Week',
    value: 7 * ONE_DAY_IN_MS,
  },
} as const;

export type DurationKey = keyof typeof DURATION;

/**
 * Hook for managing session duration selection
 *
 * @param initialDuration - Initial duration key (defaults to 'one-week')
 * @returns Object with current duration, duration value in ms, and setter function
 *
 * @category React Hooks
 * @public
 */
export const useSessionDuration = (
  initialDuration: DurationKey = 'one-week'
) => {
  const [selectedDuration, setSelectedDuration] =
    useState<DurationKey>(initialDuration);

  const setDuration = useCallback((duration: DurationKey) => {
    setSelectedDuration(duration);
  }, []);

  return {
    selectedDuration,
    durationValue: DURATION[selectedDuration].value,
    durationLabel: DURATION[selectedDuration].label,
    setDuration,
    availableDurations: DURATION,
  };
};
