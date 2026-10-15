-- Additive schema; preserves existing AI process schedules and event history.
alter table public.profiles add column if not exists reward_account_type text not null default 'real';
create table if not exists public.vip_surprise_process_runs (
 id uuid primary key default gen_random_uuid(),
 member_id uuid,
 ai_character_id uuid,
 source_type text not null,
 run_number integer not null default 1,
 status text not null default 'scheduled',
 support_amount integer not null default 10000,
 final_balance integer not null,
 scheduled_start_at timestamptz not null,
 scheduled_finish_at timestamptz not null,
 started_at timestamptz,
 finished_at timestamptz,
 next_eligible_at timestamptz,
 created_at timestamptz not null default now(),
 unique(member_id,run_number),
 unique(ai_character_id,run_number)
);
create unique index if not exists vip_surprise_one_real_member on public.vip_surprise_process_runs(member_id) where source_type='real';
create table if not exists public.vip_surprise_settings (
 id integer primary key default 1,
 completion_message text not null default 'AI프로세스 모의 체험이 완료되었습니다.',
 action_label text not null default 'AI프로세스 확인하기',
 action_url text not null default '',
 updated_at timestamptz not null default now()
);
insert into public.vip_surprise_settings(id) values(1) on conflict(id) do nothing;
create table if not exists public.vip_member_welcome_deliveries (
 member_id uuid primary key,
 private_message_id uuid,
 created_at timestamptz not null default now()
);

-- Only one subject may own a simulation run.
alter table public.vip_surprise_process_runs
 add constraint vip_surprise_subject_check check (
  (member_id is not null and ai_character_id is null)
  or (member_id is null and ai_character_id is not null)
 );
alter table public.vip_surprise_process_runs
 add constraint vip_surprise_type_check check (source_type in ('real','ai_gift','ai_character'));
alter table public.vip_surprise_process_runs
 add constraint vip_surprise_status_check check (status in ('scheduled','running','completed','cancelled'));
alter table public.vip_surprise_process_runs
 add constraint vip_surprise_amount_check check (support_amount = 10000 and final_balance between 20000 and 30000);
alter table public.vip_surprise_process_runs
 add constraint vip_surprise_dates_check check (scheduled_finish_at > scheduled_start_at);
create index if not exists vip_surprise_due_runs
 on public.vip_surprise_process_runs(status,scheduled_start_at,scheduled_finish_at);
alter table public.vip_surprise_process_runs enable row level security;
alter table public.vip_surprise_settings enable row level security;
alter table public.vip_member_welcome_deliveries enable row level security;
