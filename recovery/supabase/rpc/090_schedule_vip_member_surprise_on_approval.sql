CREATE OR REPLACE FUNCTION public.schedule_vip_member_surprise_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_start timestamptz;v_finish timestamptz;
begin
 if new.role<>'member' or new.approval_status::text<>'1' or coalesce(new.reward_account_type,'real')<>'real' then return new;end if;
 if tg_op='UPDATE' and old.approval_status::text='1' then return new;end if;
 if exists(select 1 from public.vip_surprise_process_runs where member_id=new.id) then return new;end if;
 v_start:=public.vip_surprise_operating_slot(now(),2,3);
 v_finish:=public.vip_surprise_operating_slot(v_start,1,3);
 insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'real',1,'scheduled',10000,20000+floor(random()*10001)::integer,v_start,v_finish)
 on conflict(member_id,run_number) do nothing;
 return new;
end $function$
