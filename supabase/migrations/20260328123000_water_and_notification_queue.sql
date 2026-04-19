-- Water intake + Supabase-native notification queue
-- Order:
-- 1) water_logs + summary view
-- 2) user_push_tokens
-- 3) notification_queue + enums
-- 4) enqueue functions
-- 5) pg_cron schedules

create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Water intake tracking
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz default now()
);

create index if not exists idx_water_logs_user_date
  on public.water_logs (user_id, log_date);

alter table public.water_logs enable row level security;

drop policy if exists users_own_water_logs on public.water_logs;
create policy users_own_water_logs on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace view public.daily_water_summary as
  select
    user_id,
    log_date,
    sum(amount_ml) as total_ml,
    count(*) as entries
  from public.water_logs
  group by user_id, log_date;

-- 2) FCM token storage
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  fcm_token text not null,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, fcm_token)
);

alter table public.user_push_tokens enable row level security;

drop policy if exists users_manage_own_tokens on public.user_push_tokens;
create policy users_manage_own_tokens on public.user_push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_push_tokens_updated_at on public.user_push_tokens;
create trigger user_push_tokens_updated_at
  before update on public.user_push_tokens
  for each row execute function public.update_updated_at();

-- 3) Notification queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_status AS ENUM (
      'pending',
      'processing',
      'sent',
      'failed',
      'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_type AS ENUM (
      'water_reminder',
      'workout_reminder',
      'meal_reminder',
      'streak_alert',
      'goal_reached'
    );
  END IF;
END
$$;

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type public.notification_type not null,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  scheduled_for timestamptz not null default now(),
  process_after timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_nq_status_schedule
  on public.notification_queue (status, process_after)
  where status = 'pending';

create index if not exists idx_nq_user_type
  on public.notification_queue (user_id, type, created_at desc);

create unique index if not exists idx_nq_dedup
  on public.notification_queue (user_id, type)
  where status = 'pending';

alter table public.notification_queue enable row level security;

drop policy if exists users_read_own_queue on public.notification_queue;
create policy users_read_own_queue on public.notification_queue
  for select
  using (auth.uid() = user_id);

drop policy if exists service_role_manage_queue on public.notification_queue;
create policy service_role_manage_queue on public.notification_queue
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 4) Enqueue functions
create or replace function public.enqueue_water_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_queue (user_id, type, title, body, data, scheduled_for)
  select
    p.id as user_id,
    'water_reminder'::public.notification_type,
    'Stay Hydrated 💧',
    'You''ve had '
      || round(coalesce(w.total_ml, 0) / 1000.0, 1)::text
      || 'L today. '
      || round(greatest((coalesce(p.daily_water_goal_liters, 2) * 1000 - coalesce(w.total_ml, 0)), 0) / 1000.0, 1)::text
      || 'L to go to hit your '
      || round(coalesce(p.daily_water_goal_liters, 2), 1)::text
      || 'L goal!',
    jsonb_build_object('screen', '/(tabs)', 'action', 'water'),
    now()
  from public.profiles p
  inner join public.user_push_tokens t
    on t.user_id = p.id
   and t.is_active = true
  left join (
    select user_id, sum(amount_ml) as total_ml
    from public.water_logs
    where log_date = current_date
    group by user_id
  ) w on w.user_id = p.id
  where coalesce(w.total_ml, 0) < (coalesce(p.daily_water_goal_liters, 2) * 1000)
    and extract(hour from now() at time zone 'utc') between 8 and 21
  on conflict (user_id, type) where status = 'pending' do nothing;
end;
$$;

create or replace function public.enqueue_workout_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_queue (user_id, type, title, body, data, scheduled_for)
  select
    p.id,
    'workout_reminder'::public.notification_type,
    'Time to Move 🏋️',
    'Your '
      || trim(to_char(current_date, 'Day'))
      || ' workout is ready. Don''t break the streak!',
    jsonb_build_object('screen', '/workouts', 'action', 'workout'),
    now()
  from public.profiles p
  inner join public.user_push_tokens t
    on t.user_id = p.id
   and t.is_active = true
  left join public.workout_logs wl
    on wl.user_id = p.id
   and date(wl.completed_at) = current_date
  where wl.id is null
    and extract(hour from now() at time zone 'utc') = 8
  on conflict (user_id, type) where status = 'pending' do nothing;
end;
$$;

-- 5) Cron schedules
do $$
begin
  if exists (select 1 from cron.job where jobname = 'enqueue-water-reminders') then
    perform cron.unschedule('enqueue-water-reminders');
  end if;
end;
$$;

select cron.schedule(
  'enqueue-water-reminders',
  '*/15 * * * *',
  $$select public.enqueue_water_reminders();$$
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'enqueue-workout-reminders') then
    perform cron.unschedule('enqueue-workout-reminders');
  end if;
end;
$$;

select cron.schedule(
  'enqueue-workout-reminders',
  '5 8 * * *',
  $$select public.enqueue_workout_reminders();$$
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'process-notification-queue') then
    perform cron.unschedule('process-notification-queue');
  end if;
end;
$$;

select cron.schedule(
  'process-notification-queue',
  '* * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Configure these settings manually with project-specific values:
-- alter database postgres
--   set "app.settings.supabase_url" = 'https://<your-project>.supabase.co';
-- alter database postgres
--   set "app.settings.service_role_key" = '<your-service-role-key>';