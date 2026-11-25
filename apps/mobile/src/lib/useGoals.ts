import type { DogGoal } from '@watchdog/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getGoal, listGoals } from './goals';

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

/** Loads one dog's goals, again each time the screen comes into focus. */
export function useGoals(dogId: string | undefined) {
  const [goals, setGoals] = useState<DogGoal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dogId) return;
    setError(null);
    try {
      setGoals(await listGoals(dogId));
    } catch (e) {
      setError(messageOf(e));
    }
  }, [dogId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { goals, error, reload: load };
}

/** Loads one goal. `goal` is null once loaded if it does not exist. */
export function useGoal(goalId: string | undefined) {
  const [goal, setGoal] = useState<DogGoal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!goalId) return;
    setError(null);
    try {
      setGoal(await getGoal(goalId));
      setLoaded(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { goal, loaded, error, reload: load };
}
