import React, { useState, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;

const formatRelativeTime = (interval: number): string => {
  const seconds = Math.floor(interval / ONE_SECOND_IN_MS);
  const minutes = Math.floor(interval / ONE_MINUTE_IN_MS);
  const hours = Math.floor(interval / ONE_HOUR_IN_MS);
  const days = Math.floor(interval / ONE_DAY_IN_MS);

  if (days > 0) {
    return `in ${days} day${days === 1 ? '' : 's'}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  } else if (minutes > 0) {
    return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else if (seconds > 0) {
    return `in ${seconds} second${seconds === 1 ? '' : 's'}`;
  } else {
    return 'now';
  }
};

const getRelativeTimeFormatArgs = (interval: number) => {
  if (interval > ONE_DAY_IN_MS) {
    return [ONE_DAY_IN_MS, 'day'] as const;
  } else if (interval > ONE_HOUR_IN_MS) {
    return [ONE_HOUR_IN_MS, 'hour'] as const;
  } else if (interval > ONE_MINUTE_IN_MS) {
    return [ONE_MINUTE_IN_MS, 'minute'] as const;
  } else if (interval > ONE_SECOND_IN_MS) {
    return [ONE_SECOND_IN_MS, 'second'] as const;
  } else {
    return [ONE_SECOND_IN_MS, 'second'] as const;
  }
};

interface TimeUntilExpirationProps {
  expiration: Date;
  style?: any;
  expiredStyle?: any;
}

export const TimeUntilExpiration: React.FC<TimeUntilExpirationProps> = ({
  expiration,
  style,
  expiredStyle,
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const [expired, setExpired] = useState(false);
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    const update = () => {
      const interval = expiration.getTime() - Date.now();
      const args = getRelativeTimeFormatArgs(interval);
      if (args === undefined) {
        setExpired(true);
        setFormatted('Session is expired');
      } else {
        setExpired(false);
        setFormatted(`Session expires ${formatRelativeTime(interval)}`);
        timeoutRef.current = setTimeout(update, args[0]);
      }
    };
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    update();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [expiration]);

  return (
    <View style={expired ? expiredStyle : style}>
      <Text>{formatted}</Text>
    </View>
  );
};
