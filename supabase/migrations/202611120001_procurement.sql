begin;

create table public.procurement_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ?& array['requests', 'vendors', 'orders', 'sequence']
    and jsonb_typeof(payload -> 'requests') = 'array'
    and jsonb_typeof(payload -> 'vendors') = 'array'
    and jsonb_typeof(payload -> 'orders') = 'array'
    and jsonb_typeof(payload -> 'sequence') = 'object'
  )
);

alter table public.procurement_workspaces enable row level security;

revoke all on public.procurement_workspaces from public, anon, authenticated;
grant select, insert on public.procurement_workspaces to authenticated;
grant update (revision, payload) on public.procurement_workspaces to authenticated;

create policy "Read own procurement workspace"
  on public.procurement_workspaces for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Create own procurement workspace"
  on public.procurement_workspaces for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Update own procurement workspace"
  on public.procurement_workspaces for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
