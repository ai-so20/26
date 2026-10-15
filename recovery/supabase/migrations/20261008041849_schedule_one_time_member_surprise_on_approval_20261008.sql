create or replace function public.schedule_vip_member_surprise_on_approval()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz;
begin
 if new.role='admin' or new.approval_status::text <> '1' then return new; end if;
 if tg_op='UPDATE' and old.approval_status::text='1' then return new; end if;
 if exists(select 1 from public.vip_surprise_process_runs where member_id=new.id) then return new; end if;
 v_start:=greatest(now(),new.created_at + interval '2 days 12 hours');
 insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'real',1,'scheduled',10000,25000,v_start,v_start+interval '1 day')
 on conflict(member_id,run_number) do nothing;
 return new;
end $$;
drop trigger if exists trg_schedule_vip_member_surprise_on_approval on public.profiles;
create trigger trg_schedule_vip_member_surprise_on_approval
after insert or update of approval_status on public.profiles
for each row execute function public.schedule_vip_member_surprise_on_approval();