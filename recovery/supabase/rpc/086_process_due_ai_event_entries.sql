CREATE OR REPLACE FUNCTION public.process_due_ai_event_entries()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row record;
  v_result jsonb;
  v_count integer := 0;
begin
  for v_row in
    select s.event_id, s.ai_id
    from public.ai_event_entry_schedule s
    join public.events e on e.id = s.event_id
    where s.processed_at is null
      and s.participate_at <= now()
      and e.status = 'active'
      and e.ends_at > now()
    order by s.participate_at asc
    for update of s skip locked
  loop
    begin
      v_result := public.insert_ai_event_entry(v_row.event_id, v_row.ai_id);

      update public.ai_event_entry_schedule
      set
        processed_at = now(),
        selected_answer = v_result ->> 'answer',
        result_text = coalesce(v_result ->> 'reason', 'joined')
      where event_id = v_row.event_id
        and ai_id = v_row.ai_id;

      v_count := v_count + 1;
    exception when others then
      -- 일시 오류면 다음 cron에서 다시 시도할 수 있도록 processed_at은 비워둠
      update public.ai_event_entry_schedule
      set result_text = 'retry: ' || sqlerrm
      where event_id = v_row.event_id
        and ai_id = v_row.ai_id;
    end;
  end loop;

  return v_count;
end;
$function$
