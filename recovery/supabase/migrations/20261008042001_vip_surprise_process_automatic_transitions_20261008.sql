create or replace function public.advance_vip_surprise_processes()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_started integer:=0;v_completed integer:=0;v_late integer:=0;
begin
 update public.vip_surprise_process_runs set status='completed',finished_at=now()
 where status='running' and scheduled_finish_at<=now();
 get diagnostics v_completed=row_count;
 update public.vip_surprise_process_runs set status='running',started_at=now()
 where status='scheduled' and scheduled_start_at<=now() and scheduled_finish_at>now();
 get diagnostics v_started=row_count;
 update public.vip_surprise_process_runs set status='completed',started_at=coalesce(started_at,scheduled_start_at),finished_at=now()
 where status='scheduled' and scheduled_finish_at<=now();
 get diagnostics v_late=row_count;
 return jsonb_build_object('started',v_started,'completed',v_completed+v_late);
end $$;
revoke all on function public.advance_vip_surprise_processes() from public,anon,authenticated;
select cron.schedule('vip-surprise-process-advance','*/5 * * * *',$cron$select public.advance_vip_surprise_processes()$cron$);