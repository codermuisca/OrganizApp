-- Security helpers and RLS policies for Organiza.
-- Apply this migration after the base tables exist in Supabase.

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where workspace_id = target_workspace and user_id = auth.uid() and role = 'owner'
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.tasks enable row level security;

-- Remove the original broad policies. PostgreSQL policies are permissive by
-- default, so leaving these in place would override the stricter rules below.
drop policy if exists "tasks_member_insert" on public.tasks;
drop policy if exists "tasks_member_update" on public.tasks;
drop policy if exists "tasks_member_delete" on public.tasks;

drop policy if exists "workspace members can read workspaces" on public.workspaces;
create policy "workspace members can read workspaces" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));

drop policy if exists "members can read memberships" on public.memberships;
create policy "members can read memberships" on public.memberships
for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists "owners can manage invitations" on public.invitations;
create policy "owners can manage invitations" on public.invitations
for all to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "members can read tasks" on public.tasks;
create policy "members can read tasks" on public.tasks
for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists "owners can create tasks" on public.tasks;
create policy "owners can create tasks" on public.tasks
for insert to authenticated with check (
  public.is_workspace_owner(workspace_id) and created_by = auth.uid()
);

drop policy if exists "owners can update tasks" on public.tasks;
create policy "owners can update tasks" on public.tasks
for update to authenticated
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "assignees can update tasks" on public.tasks;
create policy "assignees can update tasks" on public.tasks
for update to authenticated
using (assignee_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (assignee_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "owners can delete tasks" on public.tasks;
create policy "owners can delete tasks" on public.tasks
for delete to authenticated using (public.is_workspace_owner(workspace_id));

-- RLS decides which rows can be updated. This trigger additionally prevents a
-- member from changing fields other than status through the Supabase API.
create or replace function public.enforce_task_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_workspace_owner(old.workspace_id) then
    return new;
  end if;

  if old.assignee_id = auth.uid()
    and new.id is not distinct from old.id
    and new.workspace_id is not distinct from old.workspace_id
    and new.title is not distinct from old.title
    and new.description is not distinct from old.description
    and new.priority is not distinct from old.priority
    and new.label is not distinct from old.label
    and new.due_date is not distinct from old.due_date
    and new.assignee_id is not distinct from old.assignee_id
    and new.created_by is not distinct from old.created_by
    and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  raise exception 'Solo puedes cambiar el estado de tus tareas asignadas';
end;
$$;

drop trigger if exists enforce_task_update_permissions on public.tasks;
create trigger enforce_task_update_permissions
before update on public.tasks
for each row execute function public.enforce_task_update_permissions();
