import { earliestPeriodStart, type DogEntry } from '@watchdog/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { listEntriesSince } from './entries';

/** Loads this week's entries for a dog, again each time the screen comes into focus. This covers every goal's current period. */
export function useWeekEntries(dogId: string | undefined) {
  const [entries, setEntries] = useState<DogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dogId) return;
    setError(null);
    try {
      setEntries(await listEntriesSince(dogId, earliestPeriodStart(new Date())));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [dogId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { entries, error, reload: load };
}
