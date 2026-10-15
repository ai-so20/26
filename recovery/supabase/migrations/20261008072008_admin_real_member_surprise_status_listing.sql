create or replace function public.admin_list_real_surprise_processes()
returns table(member_id uuid,nickname text,real_name text,status text,started_at timestamptz,scheduled_finish_at timestamptz,finished_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자 전용'; end if;
 return query select p.id,p.nickname::text,p.real_name::text,r.status::text,r.started_at,r.scheduled_finish_at,r.finished_at
 from public.vip_surprise_process_runs r join public.profiles p on p.id=r.member_id
 where r.source_type='real' and p.role='member' and coalesce(p.reward_account_type,'real')='real' and r.status in ('running','completed')
 order by case when r.status='running' then 0 else 1 end,coalesce(r.started_at,r.created_at) desc;
end $$;
revoke all on function public.admin_list_real_surprise_processes() from public;
grant execute on function public.admin_list_real_surprise_processes() to authenticated;