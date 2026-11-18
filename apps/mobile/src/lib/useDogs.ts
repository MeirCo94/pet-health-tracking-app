import type { Dog } from '@watchdog/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getDog, listDogs } from './dogs';

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}

/** Loads all of the owner's dogs, again each time the screen comes into focus. */
export function useDogs() {
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDogs(await listDogs());
    } catch (e) {
      setError(messageOf(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { dogs, error, reload: load };
}

/** Loads one dog. `dog` is null once loaded if it does not exist. */
export function useDog(id: string | undefined) {
  const [dog, setDog] = useState<Dog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setDog(await getDog(id));
      setLoaded(true);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { dog, loaded, error, reload: load };
}
