-- Lets a signed-in user delete their own account and everything they own.
--
-- Deleting the auth user cascades to dogs (owner_id), and from there to goals and entries,
-- through the foreign keys in the core tables migration. The function runs with the privileges
-- of its owner because regular users cannot touch the auth schema, and it only ever deletes the
-- caller's own row (auth.uid()), never a row chosen by the caller.
--
-- Later tables that hold user data (vet links, briefs, documents) must also cascade from the
-- user or the dog, or be deleted in this function, in the same PR that creates them.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
