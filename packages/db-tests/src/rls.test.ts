import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createDatabase } from './harness';

const alice = '00000000-0000-4000-8000-00000000000a';
const bob = '00000000-0000-4000-8000-00000000000b';

let db: PGlite;
let aliceDog: string;
let bobDog: string;
let aliceGoal: string;

async function one<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<T>(sql, params);
  return rows[0] as T;
}

beforeAll(async () => {
  db = await createDatabase();
  await db.exec(`insert into auth.users (id) values ('${alice}'), ('${bob}');`);

  aliceDog = (
    await asUser(db, alice, () =>
      one<{ id: string }>(`insert into public.dogs (name) values ('Pickles') returning id`),
    )
  ).id;
  bobDog = (
    await asUser(db, bob, () =>
      one<{ id: string }>(`insert into public.dogs (name) values ('Thurston') returning id`),
    )
  ).id;
  aliceGoal = (
    await asUser(db, alice, () =>
      one<{ id: string }>(
        `insert into public.goals (dog_id, label, metric, target_value, period)
         values ($1, 'Daily walk', 'walk_minutes', 60, 'daily') returning id`,
        [aliceDog],
      ),
    )
  ).id;
});

afterAll(async () => {
  await db.close();
});

describe('dogs', () => {
  it('fills owner_id from the signed-in user and lets the owner read the dog', async () => {
    const rows = await asUser(db, alice, async () => (await db.query<{ owner_id: string }>('select owner_id from public.dogs')).rows);
    expect(rows).toEqual([{ owner_id: alice }]);
  });

  it('hides a dog from other users', async () => {
    const rows = await asUser(db, bob, async () => (await db.query<{ id: string }>('select id from public.dogs')).rows);
    expect(rows.map((r) => r.id)).toEqual([bobDog]);
  });

  it('rejects creating a dog for someone else', async () => {
    await expect(
      asUser(db, bob, () => db.query(`insert into public.dogs (owner_id, name) values ($1, 'Sneaky')`, [alice])),
    ).rejects.toThrow(/row-level security/);
  });

  it("changes nothing when updating or deleting someone else's dog", async () => {
    const upd = await asUser(db, bob, () => db.query(`update public.dogs set name = 'Hacked' where id = $1`, [aliceDog]));
    const del = await asUser(db, bob, () => db.query(`delete from public.dogs where id = $1`, [aliceDog]));
    expect(upd.affectedRows).toBe(0);
    expect(del.affectedRows).toBe(0);
    const row = await one<{ name: string }>('select name from public.dogs where id = $1', [aliceDog]);
    expect(row.name).toBe('Pickles');
  });

  it("rejects handing a dog to another owner", async () => {
    await expect(
      asUser(db, alice, () => db.query(`update public.dogs set owner_id = $1 where id = $2`, [bob, aliceDog])),
    ).rejects.toThrow(/row-level security/);
  });

  it('keeps updated_at current', async () => {
    const before = await one<{ updated_at: string }>('select updated_at from public.dogs where id = $1', [aliceDog]);
    await new Promise((r) => setTimeout(r, 10));
    await asUser(db, alice, () => db.query(`update public.dogs set breed = 'Beagle' where id = $1`, [aliceDog]));
    const after = await one<{ updated_at: string }>('select updated_at from public.dogs where id = $1', [aliceDog]);
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
  });
});

describe('goals', () => {
  it("hides one owner's goals from another", async () => {
    const rows = await asUser(db, bob, async () => (await db.query('select id from public.goals')).rows);
    expect(rows).toHaveLength(0);
  });

  it("rejects adding a goal to someone else's dog", async () => {
    await expect(
      asUser(db, bob, () =>
        db.query(
          `insert into public.goals (dog_id, label, metric, target_value, period)
           values ($1, 'x', 'walk_minutes', 10, 'daily')`,
          [aliceDog],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects moving a goal onto someone else's dog", async () => {
    await expect(
      asUser(db, alice, () => db.query(`update public.goals set dog_id = $1 where id = $2`, [bobDog, aliceGoal])),
    ).rejects.toThrow(/row-level security/);
  });

  it('only allows a prescriber on vet-set goals', async () => {
    await expect(
      asUser(db, alice, () =>
        db.query(
          `insert into public.goals (dog_id, label, metric, target_value, period, source, prescribed_by)
           values ($1, 'x', 'walk_minutes', 10, 'daily', 'self', 'Dr. Lee')`,
          [aliceDog],
        ),
      ),
    ).rejects.toThrow(/goals_prescriber_only_for_vet/);

    const ok = await asUser(db, alice, () =>
      db.query(
        `insert into public.goals (dog_id, label, metric, target_value, period, source, prescribed_by)
         values ($1, 'Medication', 'doses', 2, 'daily', 'vet', 'Dr. Lee') returning id`,
        [aliceDog],
      ),
    );
    expect(ok.rows).toHaveLength(1);
  });

  it('rejects a non-positive target and an unknown period', async () => {
    await expect(
      asUser(db, alice, () =>
        db.query(
          `insert into public.goals (dog_id, label, metric, target_value, period) values ($1, 'x', 'm', 0, 'daily')`,
          [aliceDog],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      asUser(db, alice, () =>
        db.query(
          `insert into public.goals (dog_id, label, metric, target_value, period) values ($1, 'x', 'm', 5, 'monthly')`,
          [aliceDog],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe('entries', () => {
  it('lets the owner log an entry for a goal and read it back', async () => {
    const rows = await asUser(db, alice, async () => {
      await db.query(`insert into public.entries (dog_id, goal_id, metric, value) values ($1, $2, 'walk_minutes', 25)`, [aliceDog, aliceGoal]);
      return (await db.query<{ value: string }>('select value from public.entries')).rows;
    });
    expect(rows.map((r) => Number(r.value))).toEqual([25]);
  });

  it("hides entries from other users and rejects logging for someone else's dog", async () => {
    const rows = await asUser(db, bob, async () => (await db.query('select id from public.entries')).rows);
    expect(rows).toHaveLength(0);
    await expect(
      asUser(db, bob, () => db.query(`insert into public.entries (dog_id, metric, value) values ($1, 'walk_minutes', 5)`, [aliceDog])),
    ).rejects.toThrow(/row-level security/);
  });

  it("rejects an entry that points at another dog's goal", async () => {
    await expect(
      asUser(db, bob, () =>
        db.query(`insert into public.entries (dog_id, goal_id, metric, value) values ($1, $2, 'walk_minutes', 5)`, [bobDog, aliceGoal]),
      ),
    ).rejects.toThrow(/foreign key|row-level security/);
  });

  it('rejects a negative value', async () => {
    await expect(
      asUser(db, alice, () => db.query(`insert into public.entries (dog_id, metric, value) values ($1, 'weight_kg', -1)`, [aliceDog])),
    ).rejects.toThrow(/check constraint/);
  });
});

describe('deleting', () => {
  it('keeps entries but clears goal_id when a goal is deleted', async () => {
    const dog = (await asUser(db, alice, () => one<{ id: string }>(`insert into public.dogs (name) values ('Temp') returning id`))).id;
    const goal = (
      await asUser(db, alice, () =>
        one<{ id: string }>(
          `insert into public.goals (dog_id, label, metric, target_value, period) values ($1, 'g', 'm', 5, 'daily') returning id`,
          [dog],
        ),
      )
    ).id;
    await asUser(db, alice, () => db.query(`insert into public.entries (dog_id, goal_id, metric, value) values ($1, $2, 'm', 3)`, [dog, goal]));
    await asUser(db, alice, () => db.query(`delete from public.goals where id = $1`, [goal]));

    const entry = await one<{ goal_id: string | null; dog_id: string }>('select goal_id, dog_id from public.entries where dog_id = $1', [dog]);
    expect(entry.goal_id).toBeNull();
    expect(entry.dog_id).toBe(dog);
  });

  it('removes goals and entries when their dog is deleted', async () => {
    const dog = (await asUser(db, alice, () => one<{ id: string }>(`insert into public.dogs (name) values ('Gone') returning id`))).id;
    await asUser(db, alice, () =>
      db.query(`insert into public.goals (dog_id, label, metric, target_value, period) values ($1, 'g', 'm', 5, 'daily')`, [dog]),
    );
    await asUser(db, alice, () => db.query(`insert into public.entries (dog_id, metric, value) values ($1, 'm', 1)`, [dog]));
    await asUser(db, alice, () => db.query(`delete from public.dogs where id = $1`, [dog]));

    expect((await db.query('select 1 from public.goals where dog_id = $1', [dog])).rows).toHaveLength(0);
    expect((await db.query('select 1 from public.entries where dog_id = $1', [dog])).rows).toHaveLength(0);
  });
});

describe('anonymous visitors', () => {
  it('cannot read or write any table', async () => {
    for (const table of ['dogs', 'goals', 'entries']) {
      await expect(asAnon(db, () => db.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(asAnon(db, () => db.query(`insert into public.dogs (name) values ('x')`))).rejects.toThrow(/permission denied/);
  });
});
