CREATE OR REPLACE FUNCTION public.run_auto_event_engine()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_today date;
  v_kst_time time;
  target record;
  activated record;
begin
  v_today := (now() at time zone 'Asia/Seoul')::date;
  v_kst_time := (now() at time zone 'Asia/Seoul')::time;

  if v_kst_time < time '11:00'
     or v_kst_time >= time '18:30' then
    return;
  end if;

  perform public.create_daily_auto_events(v_today);

  for target in
    select id
    from public.events
    where auto_event = true
      and schedule_date = v_today
  loop
    perform public.setup_event_game(target.id);
  end loop;

  for activated in
    update public.events
    set status = 'active'
    where auto_event = true
      and schedule_date = v_today
      and status = 'scheduled'
      and starts_at <= now()
      and ends_at > now()
      and starts_at >=
        (v_today::timestamp + time '11:00') at time zone 'Asia/Seoul'
      and starts_at <
        (v_today::timestamp + time '18:30') at time zone 'Asia/Seoul'
    returning id, title, prize, event_type
  loop
    perform public.schedule_ai_entries_for_event(activated.id);

    begin
      perform net.http_post(
        url := 'https://vip-event-gamma.vercel.app/api/ai-chat',
        headers := jsonb_build_object('Content-Type','application/json'),
        body := jsonb_build_object(
          'mode','event',
          'message_id','event-start-' || activated.id::text,
          'announcement',
            'VIP EVENT 이벤트 시작 · 지금 참여 가능' || E'\n' ||
            '이벤트: ' || coalesce(activated.title,'VIP 이벤트') || E'\n' ||
            '🎁 이벤트 상품: ' || coalesce(activated.prize,'기프티콘')
        ),
        timeout_milliseconds := 5000
      );
    exception when others then
      null;
    end;
  end loop;

  for target in
    select id
    from public.events
    where auto_event = true
      and schedule_date = v_today
      and status = 'active'
      and ends_at > now()
      and now() <
        (v_today::timestamp + time '18:30') at time zone 'Asia/Seoul'
  loop
    perform public.schedule_ai_entries_for_event(target.id);
  end loop;

  perform public.process_due_ai_event_entries();

  for target in
    select e.id
    from public.events e
    where e.auto_event = true
      and e.schedule_date = v_today
      and e.ends_at <= now()
      and e.ends_at <=
        (v_today::timestamp + time '18:30') at time zone 'Asia/Seoul'
    order by e.ends_at asc
  loop
    perform public.finish_auto_event(target.id);
  end loop;
end;
$function$
