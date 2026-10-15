CREATE OR REPLACE FUNCTION public.create_daily_auto_events(target_date date DEFAULT ((now() AT TIME ZONE 'Asia/Seoul'::text))::date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  room_uuid uuid := '0a495a02-bcb8-4e38-b3ef-4e7059c2a883';
  i integer;
  v_shift integer;
  v_slot integer;
  event_start timestamptz;
  event_end timestamptz;
  selected_type text;
  selected_title text;
  selected_description text;
  created_event_id uuid;
begin
  v_shift := abs(hashtext(target_date::text)) % 5;

  for i in 0..19 loop
    event_start :=
      (
        target_date::timestamp
        + time '11:00'
        + (interval '435 minutes' * i / 19.0)
      ) at time zone 'Asia/Seoul';

    event_end := event_start + interval '15 minutes';

    -- 마지막 20회차는 18:20 KST에 정확히 종료
    if i = 19 then
      event_end :=
        (target_date::timestamp + time '18:20')
        at time zone 'Asia/Seoul';
    end if;

    v_slot := (i + v_shift) % 5;

    case v_slot
      when 0 then
        selected_type := 'gift_box';
        selected_title := '🎁 랜덤 선물상자';
        selected_description :=
          '4개의 선물상자 중 하나를 선택하세요. 당첨 상자를 선택한 회원이 여러 명이면 그중 1명을 무작위로 선정합니다.';
      when 1 then
        selected_type := 'number';
        selected_title := '🎯 숫자 맞히기';
        selected_description :=
          '1부터 10까지 숫자 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 1명을 무작위 선정하며, 정답자가 없으면 가장 가까운 숫자를 선택한 회원 중 1명을 선정합니다.';
      when 2 then
        selected_type := 'roulette';
        selected_title := '🎰 행운의 룰렛';
        selected_description :=
          '룰렛을 돌려 이벤트에 응모하세요. 회차 종료 후 참여자 중 1명을 서버에서 무작위 선정합니다.';
      when 3 then
        selected_type := 'quiz';
        selected_title := '🧩 오늘의 퀴즈';
        selected_description :=
          '4개의 보기 중 정답 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 1명을 무작위로 선정합니다.';
      else
        selected_type := 'draw';
        selected_title := '🎟️ 자동 추첨';
        selected_description :=
          '응모 버튼을 눌러 참여하세요. 회차 종료 후 참여자 중 1명을 서버에서 무작위 선정합니다.';
    end case;

    select e.id
    into created_event_id
    from public.events e
    where e.auto_event = true
      and e.schedule_date = target_date
      and e.round_number = i + 1
    limit 1;

    if created_event_id is null then
      insert into public.events(
        room_id,title,description,prize,event_type,status,
        starts_at,ends_at,winner_count,auto_event,schedule_date,round_number
      )
      values(
        room_uuid,
        selected_title,
        selected_description,
        '3,000원 ~ 100,000원 상당의 기프티콘',
        selected_type,
        'scheduled',
        event_start,
        event_end,
        1,
        true,
        target_date,
        i + 1
      )
      returning id into created_event_id;
    else
      update public.events
      set
        title = selected_title,
        description = selected_description,
        event_type = selected_type,
        starts_at = event_start,
        ends_at = event_end
      where id = created_event_id
        and status = 'scheduled'
        and starts_at > now()
        and not exists (
          select 1 from public.event_entries ee
          where ee.event_id = created_event_id
        )
        and not exists (
          select 1 from public.event_winners ew
          where ew.event_id = created_event_id
        );
    end if;

    perform public.setup_event_game(created_event_id);
  end loop;
end;
$function$
