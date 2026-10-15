create or replace function public.schedule_vip_member_surprise_on_approval()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz; v_finish timestamptz; v_final integer;
begin
 if new.role <> 'member' or new.approval_status::text <> '1' or coalesce(new.reward_account_type,'real') <> 'real' then return new; end if;
 if tg_op = 'UPDATE' and old.approval_status::text = '1' then return new; end if;
 if exists (select 1 from public.vip_surprise_process_runs where member_id=new.id) then return new; end if;
 v_start := now() + interval '2 days' + (random() * interval '1 day');
 v_finish := v_start + interval '1 day' + (random() * interval '2 days');
 v_final := 20000 + floor(random() * 10001)::integer;
 insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'real',1,'scheduled',10000,v_final,v_start,v_finish)
 on conflict(member_id,run_number) do nothing;
 return new;
end $$;