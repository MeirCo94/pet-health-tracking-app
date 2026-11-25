import { msUntilNextDay } from '@watchdog/shared';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, refreshed at local midnight and whenever the app returns to the foreground.
 * Screens that show "today" or "this week" use this so yesterday's totals never stay on screen.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), msUntilNextDay(now) + 1000);
    return () => clearTimeout(timer);
  }, [now]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);

  return now;
}
