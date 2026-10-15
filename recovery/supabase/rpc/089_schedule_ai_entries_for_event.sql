CREATE OR REPLACE FUNCTION public.schedule_ai_entries_for_event(p_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_target_count integer;
  v_duration_seconds numeric;
  v_inserted integer := 0;
  v_ai record;
  v_offset_seconds numeric;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    return 0;
  end if;

  if v_event.event_type = 'attendance' then
    return 0;
  end if;

  -- 이미 이 이벤트의 AI 선정이 끝났으면 중복 선정하지 않음
  if exists (
    select 1
    from public.ai_event_entry_schedule s
    where s.event_id = p_event_id
  ) then
    select count(*)
    into v_inserted
    from public.ai_event_entry_schedule s
    where s.event_id = p_event_id;

    return v_inserted;
  end if;

  -- 정확히 7명 또는 8명
  v_target_count := 7 + floor(random() * 2)::integer;

  v_duration_seconds :=
    greatest(
      60,
      extract(epoch from (v_event.ends_at - v_event.starts_at))
    );

  for v_ai in
    select a.id, a.nickname
    from public.ai_characters a
    where a.is_active = true
      and exists (
        select 1
        from public.members m
        where m.id = a.id
      )
    order by random()
    limit v_target_count
  loop
    -- 이벤트 전체 시간의 약 5% ~ 80% 구간에 분산
    -- 1분 cron 환경에서도 너무 종료 직전에 몰리지 않도록 함
    v_offset_seconds :=
      greatest(
        5,
        least(
          v_duration_seconds - 5,
          v_duration_seconds * (0.05 + random() * 0.75)
        )
      );

    insert into public.ai_event_entry_schedule(
      event_id,
      ai_id,
      participate_at
    )
    values(
      p_event_id,
      v_ai.id,
      v_event.starts_at + make_interval(secs => v_offset_seconds)
    )
    on conflict(event_id, ai_id) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$function$
