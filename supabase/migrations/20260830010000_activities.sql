create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#7c6cff',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_date_idx
on public.activity_logs(user_id, performed_at desc);

alter table public.activities enable row level security;
alter table public.activity_logs enable row level security;

grant select, insert, update, delete
on public.activities, public.activity_logs
to authenticated;

drop policy if exists "users manage their activities" on public.activities;
create policy "users manage their activities" on public.activities
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users manage their activity logs" on public.activity_logs;
create policy "users manage their activity logs" on public.activity_logs
for all to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (
    select 1 from public.activities
    where id = activity_id and user_id = auth.uid()
  )
);
