import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createDatabase } from './harness';

const alice = '00000000-0000-4000-8000-00000000000a';
const bob = '00000000-0000-4000-8000-00000000000b';

let db: PGlite;

async function count(table: string, where = 'true'): Promise<number> {
  const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table} where ${where}`);
  return rows[0]?.n ?? 0;
}

// Gives a user a dog, a goal and an entry.
async function seed(userId: string, dogName: string) {
  await asUser(db, userId, async () => {
    const dog = await db.query<{ id: string }>(`insert into public.dogs (name) values ($1) returning id`, [dogName]);
    const dogId = dog.rows[0]!.id;
    const goal = await db.query<{ id: string }>(
      `insert into public.goals (dog_id, label, metric, target_value, period)
       values ($1, 'Daily walk', 'walk_minutes', 60, 'daily') returning id`,
      [dogId],
    );
    await db.query(`insert into public.entries (dog_id, goal_id, metric, value) values ($1, $2, 'walk_minutes', 30)`, [
      dogId,
      goal.rows[0]!.id,
    ]);
  });
}

beforeAll(async () => {
  db = await createDatabase();
  await db.exec(`insert into auth.users (id) values ('${alice}'), ('${bob}');`);
  await seed(alice, 'Pickles');
  await seed(bob, 'Thurston');
});

afterAll(async () => {
  await db.close();
});

describe('delete_my_account', () => {
  it('is refused for anonymous visitors', async () => {
    await expect(asAnon(db, () => db.query('select public.delete_my_account()'))).rejects.toThrow(/permission denied/);
    expect(await count('auth.users')).toBe(2);
  });

  it('is refused when no user is signed in', async () => {
    // Runs as the database owner with no signed-in user, so the function itself must refuse.
    await expect(db.query('select public.delete_my_account()')).rejects.toThrow(/Not signed in/);
    expect(await count('auth.users')).toBe(2);
  });

  it('deletes the caller and everything they own, and nothing else', async () => {
    await asUser(db, alice, () => db.query('select public.delete_my_account()'));

    expect(await count('auth.users', `id = '${alice}'`)).toBe(0);
    expect(await count('public.dogs', `owner_id = '${alice}'`)).toBe(0);
    expect(await count('public.goals', `dog_id in (select id from public.dogs where owner_id = '${alice}')`)).toBe(0);

    // Alice's goals and entries are gone altogether, so only Bob's one of each remain.
    expect(await count('public.goals')).toBe(1);
    expect(await count('public.entries')).toBe(1);

    expect(await count('auth.users', `id = '${bob}'`)).toBe(1);
    expect(await count('public.dogs', `owner_id = '${bob}'`)).toBe(1);
  });

  it('takes no argument, so a user cannot choose whose account is deleted', async () => {
    await expect(asUser(db, bob, () => db.query(`select public.delete_my_account('${alice}')`))).rejects.toThrow(
      /does not exist/,
    );
    expect(await count('auth.users', `id = '${bob}'`)).toBe(1);
  });

  it('lets a user delete their own account once, and a second call finds nothing to delete', async () => {
    await asUser(db, bob, () => db.query('select public.delete_my_account()'));
    expect(await count('auth.users')).toBe(0);
    expect(await count('public.dogs')).toBe(0);
    expect(await count('public.entries')).toBe(0);
    // The user is already gone; the call does nothing and does not fail.
    await asUser(db, bob, () => db.query('select public.delete_my_account()'));
  });
});
