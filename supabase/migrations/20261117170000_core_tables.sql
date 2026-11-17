-- Phase 1 core tables: dogs, goals, entries.
-- Every table has row-level security: an owner can only see and change their own data.
-- Vet access (vet_links) arrives in Phase 2 and will add policies, never loosen these.

-- Keeps updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- dogs
-- ---------------------------------------------------------------------------
create table public.dogs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  breed       text check (breed is null or char_length(breed) <= 80),
  birth_date  date,
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index dogs_owner_id_idx on public.dogs (owner_id);

create trigger dogs_set_updated_at
  before update on public.dogs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- goals
-- A goal is a target for one metric over a period. source says who set it.
-- target_value is a minimum to reach per period (for example 60 walk minutes a day).
-- Ranges such as a healthy weight band are modelled later.
-- ---------------------------------------------------------------------------
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  dog_id        uuid not null references public.dogs (id) on delete cascade,
  label         text not null check (char_length(btrim(label)) between 1 and 80),
  metric        text not null check (char_length(btrim(metric)) between 1 and 40),
  unit          text check (unit is null or char_length(unit) <= 20),
  target_value  numeric not null check (target_value > 0),
  period        text not null check (period in ('daily', 'weekly')),
  source        text not null default 'self' check (source in ('self', 'vet')),
  prescribed_by text check (prescribed_by is null or char_length(prescribed_by) <= 120),
  start_date    date not null default current_date,
  end_date      date,
  status        text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint goals_dates_ordered check (end_date is null or end_date >= start_date),
  constraint goals_prescriber_only_for_vet check (source = 'vet' or prescribed_by is null),
  -- lets entries reference a goal and its dog together, so an entry can never
  -- point at a goal that belongs to a different dog
  constraint goals_id_dog_id_key unique (id, dog_id)
);

create index goals_dog_id_idx on public.goals (dog_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- entries
-- One logged value for a dog. goal_id is optional (for example a weight reading).
-- ---------------------------------------------------------------------------
create table public.entries (
  id         uuid primary key default gen_random_uuid(),
  dog_id     uuid not null references public.dogs (id) on delete cascade,
  goal_id    uuid,
  metric     text not null check (char_length(btrim(metric)) between 1 and 40),
  value      numeric not null check (value >= 0),
  logged_at  timestamptz not null default now(),
  source     text not null default 'manual' check (source in ('manual', 'healthkit', 'fitbark', 'import')),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- when a goal is deleted the entry stays, with goal_id cleared
  constraint entries_goal_same_dog_fkey
    foreign key (goal_id, dog_id) references public.goals (id, dog_id)
    on delete set null (goal_id)
);

create index entries_dog_logged_at_idx on public.entries (dog_id, logged_at desc);
create index entries_goal_id_idx on public.entries (goal_id);

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only. Anonymous visitors get nothing.
-- ---------------------------------------------------------------------------
revoke all on public.dogs, public.goals, public.entries from anon;
grant select, insert, update, delete on public.dogs, public.goals, public.entries to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- (select auth.uid()) is wrapped so Postgres evaluates it once per query.
-- ---------------------------------------------------------------------------
alter table public.dogs    enable row level security;
alter table public.goals   enable row level security;
alter table public.entries enable row level security;

-- dogs: owner only
create policy dogs_select_own on public.dogs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy dogs_insert_own on public.dogs
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy dogs_update_own on public.dogs
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy dogs_delete_own on public.dogs
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- goals: allowed when the goal's dog belongs to the signed-in user
create policy goals_select_own on public.goals
  for select to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy goals_insert_own on public.goals
  for insert to authenticated
  with check (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy goals_update_own on public.goals
  for update to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())))
  with check (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy goals_delete_own on public.goals
  for delete to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

-- entries: same rule
create policy entries_select_own on public.entries
  for select to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy entries_insert_own on public.entries
  for insert to authenticated
  with check (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy entries_update_own on public.entries
  for update to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())))
  with check (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));

create policy entries_delete_own on public.entries
  for delete to authenticated
  using (dog_id in (select id from public.dogs where owner_id = (select auth.uid())));
