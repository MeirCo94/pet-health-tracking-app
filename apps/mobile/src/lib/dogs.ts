import type { Dog, DogValues } from '@watchdog/shared';
import { supabase } from './supabase';

interface DogRow {
  id: string;
  owner_id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, owner_id, name, breed, birth_date, created_at, updated_at';

function toDog(row: DogRow): Dog {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    breed: row.breed,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(values: DogValues) {
  return { name: values.name, breed: values.breed, birth_date: values.birthDate };
}

/** Row-level security limits every query here to the signed-in owner's own dogs. */
export async function listDogs(): Promise<Dog[]> {
  const { data, error } = await supabase.from('dogs').select(COLUMNS).order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as DogRow[]).map(toDog);
}

/** Returns null when the dog does not exist or belongs to someone else. */
export async function getDog(id: string): Promise<Dog | null> {
  const { data, error } = await supabase.from('dogs').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDog(data as DogRow) : null;
}

export async function createDog(values: DogValues): Promise<Dog> {
  // owner_id is filled in by the database from the signed-in user.
  const { data, error } = await supabase.from('dogs').insert(toRow(values)).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toDog(data as DogRow);
}

export async function updateDog(id: string, values: DogValues): Promise<Dog> {
  const { data, error } = await supabase.from('dogs').update(toRow(values)).eq('id', id).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toDog(data as DogRow);
}

/** Also deletes the dog's goals and entries. */
export async function deleteDog(id: string): Promise<void> {
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
