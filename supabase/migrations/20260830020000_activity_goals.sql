alter table public.activities
add column if not exists goal_minutes integer
check (goal_minutes is null or goal_minutes between 1 and 10080);

alter table public.activities
add column if not exists goal_period text
check (goal_period is null or goal_period in ('daily', 'weekly'));

alter table public.activities
add constraint activities_goal_complete_check
check (
  (goal_minutes is null and goal_period is null)
  or (goal_minutes is not null and goal_period is not null)
) not valid;

alter table public.activities
validate constraint activities_goal_complete_check;
