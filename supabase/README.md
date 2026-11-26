# Supabase

Database migrations and row-level security (RLS) policies live in `migrations/`. Schema changes go through migrations only, and every new table ships with RLS policies in the same PR.

Project reference: `mzawvhigdxwcqpadjeml`. The app reads its URL and publishable key from `apps/mobile/.env` (see `.env.example`). Never commit the key file, and never put the service role key in the app.

## Migrations

| File | What it does |
|---|---|
| `20261117170000_core_tables.sql` | `dogs`, `goals`, `entries` with RLS: an owner only sees and changes their own data. Anonymous visitors get no access. |
| `20261126160000_delete_my_account.sql` | `delete_my_account()`: a signed-in user deletes their own account, which cascades to their dogs, goals and entries. Takes no argument, refuses anonymous callers. Needed for Settings > Delete account. |

## Applying a migration

The migrations are not applied to the hosted project automatically.

1. Open the project in the Supabase dashboard, then **SQL Editor** > **New query**.
2. Paste the whole contents of the migration file and click **Run**.
3. For the core tables migration, open **Table Editor**. `dogs`, `goals` and `entries` should appear, each marked as having RLS enabled. For the delete account migration, open **Database** > **Functions**: `delete_my_account` should be listed.

Apply migrations in filename order. Each file runs once. Do not edit a migration that has been applied; add a new one instead.

## Tests

`packages/db-tests` applies every migration to an in-process Postgres (PGlite) with a stand-in for Supabase's `auth` schema and roles, then checks the RLS rules: owners see only their own rows, other users and anonymous visitors are blocked, and constraints hold. It runs with `npm test` and in CI.

This is a close approximation, not the hosted service. After applying a migration for real, spot-check it in the dashboard.
