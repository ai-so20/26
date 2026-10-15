-- Continuous hourly events, Asia/Seoul. Legacy rounds with participation remain intact.
DROP TRIGGER IF EXISTS trg_force_last_auto_event_end_1820 ON public.events;
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
  for i in 0..23 loop
    event_start := ((target_date::timestamp + interval '1 hour' * i) at time zone 'Asia/Seoul');
    event_end := event_start + interval '1 hour';
    if event_end <= now() then continue; end if;
    v_slot := (i + v_shift) % 5;
    case v_slot
      when 0 then selected_type := 'gift_box'; selected_title := '🎁 랜덤 선물상자'; selected_description := '4개의 선물상자 중 하나를 선택하세요. 당첨 상자를 선택한 회원이 여러 명이면 그중 1명을 무작위로 선정합니다.';
      when 1 then selected_type := 'number'; selected_title := '🎯 숫자 맞히기'; selected_description := '1부터 10까지 숫자 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 1명을 무작위 선정하며, 정답자가 없으면 가장 가까운 숫자를 선택한 회원 중 1명을 선정합니다.';
      when 2 then selected_type := 'roulette'; selected_title := '🎰 행운의 룰렛'; selected_description := '룰렛을 돌려 이벤트에 응모하세요. 회차 종료 후 참여자 중 1명을 서버에서 무작위 선정합니다.';
      when 3 then selected_type := 'quiz'; selected_title := '🧩 오늘의 퀴즈'; selected_description := '4개의 보기 중 정답 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 1명을 무작위로 선정합니다.';
      else selected_type := 'draw'; selected_title := '🎟️ 자동 추첨'; selected_description := '응모 버튼을 눌러 참여하세요. 회차 종료 후 참여자 중 1명을 서버에서 무작위 선정합니다.';
    end case;
    select e.id into created_event_id from public.events e where e.auto_event = true and e.schedule_date = target_date and e.round_number = i + 1 limit 1;
    if created_event_id is null then
      insert into public.events(room_id,title,description,prize,event_type,status,starts_at,ends_at,winner_count,auto_event,schedule_date,round_number)
      values(room_uuid,selected_title,selected_description,'3,000원 ~ 100,000원 상당의 기프티콘',selected_type,'scheduled',event_start,event_end,1,true,target_date,i+1)
      returning id into created_event_id;
    else
      update public.events set title=selected_title,description=selected_description,event_type=selected_type,starts_at=event_start,ends_at=event_end
      where id=created_event_id and status='scheduled' and starts_at>now() and not exists(select 1 from public.event_entries ee where ee.event_id=created_event_id) and not exists(select 1 from public.event_winners ew where ew.event_id=created_event_id);
    end if;
    perform public.setup_event_game(created_event_id);
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.run_auto_event_engine() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare target record;
begin
 perform public.create_daily_auto_events((now() at time zone 'Asia/Seoul')::date);
 -- Finalize overdue rounds first, including yesterday's 23:00 round at midnight.
 for target in select id from public.events where auto_event=true and status in ('active','scheduled') and ends_at<=now() order by ends_at loop
  perform public.finish_auto_event(target.id);
 end loop;
 update public.events set status='active' where auto_event=true and status='scheduled' and starts_at<=now() and ends_at>now();
end;
$function$;

-- Keep old empty rounds as historical rows, outside the new automatic schedule.
UPDATE public.events e SET auto_event=false
WHERE e.auto_event=true AND e.schedule_date=(now() at time zone 'Asia/Seoul')::date
AND (e.ends_at-e.starts_at<>interval '1 hour' OR extract(minute from e.starts_at at time zone 'Asia/Seoul')<>0)
AND NOT EXISTS (SELECT 1 FROM public.event_entries ee WHERE ee.event_id=e.id)
AND NOT EXISTS (SELECT 1 FROM public.event_winners ew WHERE ew.event_id=e.id);
SELECT public.run_auto_event_engine();

-- Hourly reward announcements also run outside the former daytime window.
DROP TRIGGER IF EXISTS trg_block_event_group_message_outside_hours ON public.group_messages;
-- Keep the previous hour's result visible across midnight.
CREATE OR REPLACE FUNCTION public.get_auto_events()
 RETURNS TABLE(event_id uuid, title text, description text, prize text, event_type text, status text, starts_at timestamp with time zone, ends_at timestamp with time zone, round_number integer, participated boolean, winner_nickname text, my_answer text, my_result_text text, quiz_question text, quiz_option_1 text, quiz_option_2 text, quiz_option_3 text, quiz_option_4 text, revealed_answer text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select e.id,e.title,e.description,e.prize,e.event_type,e.status,e.starts_at,e.ends_at,e.round_number,exists (select 1 from public.event_entries ee where ee.event_id = e.id and ee.member_id = auth.uid()) as participated,(select coalesce(p.nickname,m.nickname,a.nickname,'VIP 회원') from public.event_winners ew left join public.profiles p on p.id = ew.member_id left join public.members m on m.id = ew.member_id left join public.ai_characters a on a.id = ew.member_id where ew.event_id = e.id order by ew.rank asc, ew.id asc limit 1) as winner_nickname,(select ee.answer from public.event_entries ee where ee.event_id = e.id and ee.member_id = auth.uid() limit 1) as my_answer,(select ee.result_text from public.event_entries ee where ee.event_id = e.id and ee.member_id = auth.uid() limit 1) as my_result_text,case when e.event_type='quiz' then q.question else null end,case when e.event_type='quiz' then q.option_1 else null end,case when e.event_type='quiz' then q.option_2 else null end,case when e.event_type='quiz' then q.option_3 else null end,case when e.event_type='quiz' then q.option_4 else null end,case when e.status <> 'completed' then null when e.event_type='number' then s.secret_answer when e.event_type='gift_box' then s.secret_answer when e.event_type='quiz' then q.correct_option::text else null end as revealed_answer from public.events e left join public.event_game_secrets s on s.event_id=e.id left join public.event_quiz_bank q on e.event_type='quiz' and s.secret_answer is not null and q.id::text=s.secret_answer where e.auto_event=true and (e.schedule_date=(now() at time zone 'Asia/Seoul')::date or e.id=(select recent.id from public.events recent where recent.auto_event=true and recent.status='completed' and recent.ends_at>=now()-interval '1 hour' order by recent.ends_at desc limit 1)) order by e.starts_at; $function$;
