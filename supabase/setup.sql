-- Run once in your Supabase SQL editor. Only the server service role can access newsroom data.
begin;
create table if not exists public.aduke_state (
  id integer primary key check (id = 1),
  version bigint not null default 0,
  files jsonb not null default '{}'::jsonb
);
insert into public.aduke_state(id) values (1) on conflict do nothing;
alter table public.aduke_state enable row level security;
revoke all on public.aduke_state from public, anon, authenticated;
grant select, update on public.aduke_state to service_role;
create or replace function public.aduke_read_state() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('version', version, 'files', files) from public.aduke_state where id = 1;
$$;
create or replace function public.aduke_commit_state(expected_version bigint, next_files jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(next_files) <> 'object' then raise exception 'Invalid newsroom state'; end if;
  update public.aduke_state set files = next_files, version = version + 1 where id = 1 and version = expected_version;
  return found;
end;
$$;
revoke all on function public.aduke_read_state() from public, anon, authenticated;
revoke all on function public.aduke_commit_state(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.aduke_read_state() to service_role;
grant execute on function public.aduke_commit_state(bigint, jsonb) to service_role;
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('aduke-uploads', 'aduke-uploads', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
commit;
