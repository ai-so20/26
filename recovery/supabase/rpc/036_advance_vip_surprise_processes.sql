CREATE OR REPLACE FUNCTION public.advance_vip_surprise_processes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_run record;v_started int:=0;v_completed int:=0;v_now timestamptz:=now();v_kst time;v_next timestamptz;
begin
 v_kst:=(v_now at time zone 'Asia/Seoul')::time;
 for v_run in select * from public.vip_surprise_process_runs where status='scheduled' and scheduled_start_at<=v_now order by scheduled_start_at for update skip locked loop
   if v_kst<time '11:00' or v_kst>=time '18:30' then continue;end if;
   if v_run.source_type='ai_character' then
     if not exists(select 1 from public.ai_characters where id=v_run.ai_character_id and is_active) then
       update public.vip_surprise_process_runs set status='cancelled' where id=v_run.id;continue;
     end if;
   else
     if not exists(select 1 from public.profiles where id=v_run.member_id and approval_status='1' and role='member' and coalesce(reward_account_type,'real')=case when v_run.source_type='ai_gift' then 'virtual' else 'real' end) then
       update public.vip_surprise_process_runs set status='cancelled' where id=v_run.id;continue;
     end if;
     insert into public.ai_process_members(user_id,available_count,status,investment_amount,target_mode,target_return,duration_hours,min_return,max_return,started_at,updated_at)
     values(v_run.member_id,0,'running',v_run.support_amount,'daily',v_run.final_balance-v_run.support_amount,24,v_run.final_balance-v_run.support_amount,v_run.final_balance-v_run.support_amount,v_now,v_now)
     on conflict(user_id) do update set status='running',investment_amount=excluded.investment_amount,target_mode=excluded.target_mode,target_return=excluded.target_return,duration_hours=excluded.duration_hours,min_return=excluded.min_return,max_return=excluded.max_return,started_at=excluded.started_at,completed_at=null,updated_at=v_now
     where ai_process_members.status not in ('running','waiting') and coalesce(ai_process_members.available_count,0)=0;
     if not found then continue;end if;
   end if;
   update public.vip_surprise_process_runs set status='running',started_at=v_now,linked_to_ai_process_at=v_now where id=v_run.id;
   v_started:=v_started+1;
 end loop;
 for v_run in select * from public.vip_surprise_process_runs where status='running' and scheduled_finish_at<=v_now order by scheduled_finish_at for update skip locked loop
   if v_kst<time '11:00' or v_kst>=time '18:30' then continue;end if;
   if v_run.source_type='ai_character' then
     update public.vip_surprise_process_runs set status='completed',finished_at=v_now where id=v_run.id;
     v_completed:=v_completed+1;
   else
     update public.ai_process_members set status='completed',completed_at=v_now,updated_at=v_now where user_id=v_run.member_id and status='running' and started_at>=v_run.linked_to_ai_process_at-interval '1 minute';
     if found then
       update public.vip_surprise_process_runs set status='completed',finished_at=v_now where id=v_run.id;
       v_completed:=v_completed+1;
     end if;
   end if;
 end loop;
 for v_run in select * from public.vip_surprise_process_runs r where r.status='completed' and r.source_type in ('ai_character','ai_gift') and not exists(
   select 1 from public.vip_surprise_process_runs n where n.source_type=r.source_type and
   ((n.ai_character_id is not null and n.ai_character_id=r.ai_character_id) or (n.member_id is not null and n.member_id=r.member_id))
   and n.run_number>r.run_number
 ) for update skip locked loop
   if v_run.source_type='ai_character' and not exists(select 1 from public.ai_characters where id=v_run.ai_character_id and is_active) then continue;end if;
   if v_run.source_type='ai_gift' and not exists(select 1 from public.profiles where id=v_run.member_id and reward_account_type='virtual' and approval_status='1') then continue;end if;
   v_next:=public.vip_surprise_operating_slot(coalesce(v_run.finished_at,v_now),4,8);
   insert into public.vip_surprise_process_runs(member_id,ai_character_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
   values(v_run.member_id,v_run.ai_character_id,v_run.source_type,v_run.run_number+1,'scheduled',10000,20000+floor(random()*10001)::integer,v_next,public.vip_surprise_operating_slot(v_next,1,3))
   on conflict do nothing;
 end loop;
 return jsonb_build_object('started',v_started,'completed',v_completed);
end $function$
