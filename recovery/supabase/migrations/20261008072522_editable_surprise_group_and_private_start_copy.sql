create table if not exists public.vip_surprise_copy_settings (
 id integer primary key default 1 check(id=1),
 group_start_title text not null default '{닉네임}님 돌발 이벤트 당첨!',
 group_start_body text not null default '모의 체험 지원금 10,000원으로\nAI프로세스 진행이 시작되었습니다.',
 group_complete_title text not null default '{닉네임}님 AI프로세스 진행 완료되셨습니다.\n진심으로 축하드립니다!',
 group_complete_body text not null default '이벤트 완료 안내는 1:1 고객센터에서 확인해 주세요.',
 private_start_body text not null default '🎉 AI프로세스 돌발 이벤트 당첨을 축하드립니다!\nAI프로세스 진행이 시작되었습니다!\n\n모의 지원 금액 : {지원금}원\n진행 기간 : 1~3일 이내 (예시 안내)\n모의 수익률 : 실제 진행 결과에 따라 달라지는 시뮬레이션 수치\n\n진행 완료 시 1:1 메시지로 안내드립니다.\n본 이벤트는 모의 체험이며 실제 수익 또는 출금이 발생하지 않습니다.',
 updated_at timestamptz not null default now()
);
insert into public.vip_surprise_copy_settings(id) values(1) on conflict do nothing;
alter table public.vip_surprise_copy_settings enable row level security;
drop policy if exists vip_surprise_copy_read on public.vip_surprise_copy_settings;
create policy vip_surprise_copy_read on public.vip_surprise_copy_settings for select to authenticated using(true);
create or replace function public.admin_update_vip_surprise_copy(p_group_start_title text,p_group_start_body text,p_group_complete_title text,p_group_complete_body text,p_private_start_body text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자 전용'; end if;
 update public.vip_surprise_copy_settings set
 group_start_title=left(coalesce(p_group_start_title,''),250),
 group_start_body=left(coalesce(p_group_start_body,''),700),
 group_complete_title=left(coalesce(p_group_complete_title,''),250),
 group_complete_body=left(coalesce(p_group_complete_body,''),700),
 private_start_body=left(coalesce(p_private_start_body,''),1800),updated_at=now() where id=1;
end $$;
revoke all on function public.admin_update_vip_surprise_copy(text,text,text,text,text) from public;
grant execute on function public.admin_update_vip_surprise_copy(text,text,text,text,text) to authenticated;