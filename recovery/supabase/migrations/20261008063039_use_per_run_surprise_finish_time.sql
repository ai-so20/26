create or replace function public.advance_vip_surprise_processes() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run record; v_started int:=0; v_completed int:=0;
begin
 for v_run in select * from public.vip_surprise_process_runs where source_type='real' and member_id is not null and status='scheduled' and scheduled_start_at<=now() order by scheduled_start_at for update skip locked loop
   insert into public.ai_process_members(user_id,available_count,status,investment_amount,target_mode,target_return,duration_hours,min_return,max_return,started_at,updated_at)
   values(v_run.member_id,0,'running',v_run.support_amount,'fixed',v_run.final_balance-v_run.support_amount,24,v_run.final_balance-v_run.support_amount,v_run.final_balance-v_run.support_amount,now(),now())
   on conflict(user_id) do update set status='running',investment_amount=excluded.investment_amount,target_mode=excluded.target_mode,target_return=excluded.target_return,duration_hours=excluded.duration_hours,min_return=excluded.min_return,max_return=excluded.max_return,started_at=excluded.started_at,completed_at=null,updated_at=now()
   where ai_process_members.status not in ('running','waiting') and coalesce(ai_process_members.available_count,0)=0;
   if found then
     update public.vip_surprise_process_runs set status='running',started_at=now(),linked_to_ai_process_at=now() where id=v_run.id;
     v_started:=v_started+1;
   end if;
 end loop;
 for v_run in select * from public.vip_surprise_process_runs where source_type='real' and status='running' and linked_to_ai_process_at is not null and scheduled_finish_at<=now() for update skip locked loop
   update public.ai_process_members set status='completed',completed_at=now(),updated_at=now() where user_id=v_run.member_id and status='running' and started_at>=v_run.linked_to_ai_process_at-interval '1 minute';
   if found then
     update public.vip_surprise_process_runs set status='completed',finished_at=now() where id=v_run.id;
     v_completed:=v_completed+1;
   end if;
 end loop;
 return jsonb_build_object('started',v_started,'completed',v_completed);
end $$;