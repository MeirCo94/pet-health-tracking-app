import { buildExport, type AccountExport } from '@watchdog/shared';
import { supabase } from './supabase';

const PAGE_SIZE = 1000;

type Row = Record<string, unknown>;

/** Reads every row of a table the signed-in owner can see, a page at a time. */
async function readAll(table: 'dogs' | 'goals' | 'entries', orderBy: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Everything the signed-in owner has saved, including archived goals and entries whose goal was deleted. */
export async function loadAccountExport(email: string | null): Promise<AccountExport> {
  const [dogs, goals, entries] = await Promise.all([
    readAll('dogs', 'created_at'),
    readAll('goals', 'created_at'),
    readAll('entries', 'logged_at'),
  ]);
  return buildExport({ exportedAt: new Date(), email, dogs, goals, entries });
}

/** Deletes the signed-in owner's account and all their data. This cannot be undone. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  // The account is gone, so clear the saved session on this device without asking the server.
  await supabase.auth.signOut({ scope: 'local' });
}
