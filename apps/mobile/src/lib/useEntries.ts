import { earliestPeriodStart, type DogEntry } from '@watchdog/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { countGoalEntries, listEntriesSince } from './entries';
import { useNow } from './useNow';

/**
 * Loads this week's entries for a dog, again each time the screen comes into focus, at local midnight
 * and when the app returns to the foreground. This covers every goal's current period.
 * Use the returned `now` for progress so the totals and the loaded entries always agree.
 */
export function useWeekEntries(dogId: string | undefined) {
  const [entries, setEntries] = useState<DogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();

  const load = useCallback(async () => {
    if (!dogId) return;
    setError(null);
    try {
      setEntries(await listEntriesSince(dogId, earliestPeriodStart(now)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [dogId, now]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { entries, error, reload: load, now };
}

/** How many entries are logged against a goal. null until loaded. */
export function useGoalEntryCount(goalId: string | undefined) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!goalId) return;
    setError(null);
    try {
      setCount(await countGoalEntries(goalId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { count, error, reload: load };
}
