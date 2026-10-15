CREATE OR REPLACE FUNCTION public.insert_ai_event_entry(p_event_id uuid, p_ai_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_secret text;
  v_quiz_correct integer;
  v_answer integer;
  v_is_correct boolean;
  v_result text;
begin
  if not exists (
    select 1
    from public.ai_characters a
    where a.id = p_ai_id
      and a.is_active = true
  ) then
    return jsonb_build_object('success', false, 'reason', 'ai_not_found');
  end if;

  if not exists (
    select 1
    from public.members m
    where m.id = p_ai_id
  ) then
    return jsonb_build_object('success', false, 'reason', 'ai_member_mirror_missing');
  end if;

  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;

  if v_event.event_type = 'attendance' then
    return jsonb_build_object('success', false, 'reason', 'attendance_skipped');
  end if;

  if v_event.status = 'cancelled' or now() >= v_event.ends_at then
    return jsonb_build_object('success', false, 'reason', 'event_closed');
  end if;

  if exists (
    select 1
    from public.event_entries ee
    where ee.event_id = p_event_id
      and ee.member_id = p_ai_id
  ) then
    return jsonb_build_object('success', true, 'reason', 'already_joined');
  end if;

  perform public.setup_event_game(p_event_id);

  select secret_answer
  into v_secret
  from public.event_game_secrets
  where event_id = p_event_id;

  -- 숫자 맞히기: 1~10 완전 랜덤
  if v_event.event_type = 'number' then
    v_answer := 1 + floor(random() * 10)::integer;
    v_is_correct := (v_secret ~ '^[0-9]+$' and v_answer = v_secret::integer);
    v_result := '숫자 선택 완료';

    insert into public.event_entries(
      event_id, member_id, answer, is_correct, result_text, submitted_at
    )
    values(
      p_event_id, p_ai_id, v_answer::text, v_is_correct, v_result, now()
    );

  -- 선물상자: 1~4 완전 랜덤
  elsif v_event.event_type = 'gift_box' then
    v_answer := 1 + floor(random() * 4)::integer;
    v_is_correct := (v_secret ~ '^[0-9]+$' and v_answer = v_secret::integer);
    v_result := v_answer::text || '번 선물상자 선택 완료';

    insert into public.event_entries(
      event_id, member_id, answer, is_correct, result_text, submitted_at
    )
    values(
      p_event_id, p_ai_id, v_answer::text, v_is_correct, v_result, now()
    );

  -- 퀴즈: 정답을 미리 맞추게 하지 않고 1~4 중 완전 랜덤
  elsif v_event.event_type = 'quiz' then
    v_answer := 1 + floor(random() * 4)::integer;

    if v_secret is not null then
      select q.correct_option
      into v_quiz_correct
      from public.event_quiz_bank q
      where q.id::text = v_secret
      limit 1;
    end if;

    v_is_correct := (v_quiz_correct is not null and v_answer = v_quiz_correct);
    v_result := case
      when v_is_correct then '정답 제출 완료'
      else '답안 제출 완료'
    end;

    insert into public.event_entries(
      event_id, member_id, answer, is_correct, result_text, submitted_at
    )
    values(
      p_event_id, p_ai_id, v_answer::text, v_is_correct, v_result, now()
    );

  -- 룰렛
  elsif v_event.event_type = 'roulette' then
    insert into public.event_entries(
      event_id, member_id, answer, is_correct, result_text, submitted_at
    )
    values(
      p_event_id, p_ai_id, 'roulette', null, '룰렛 참여 완료', now()
    );

  -- 자동추첨
  elsif v_event.event_type = 'draw' then
    insert into public.event_entries(
      event_id, member_id, answer, is_correct, result_text, submitted_at
    )
    values(
      p_event_id, p_ai_id, null, null, '자동 추첨 응모 완료', now()
    );

  else
    return jsonb_build_object('success', false, 'reason', 'unsupported_event_type');
  end if;

  return jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'ai_id', p_ai_id,
    'answer', case when v_answer is null then null else v_answer::text end
  );
exception
  when unique_violation then
    return jsonb_build_object('success', true, 'reason', 'already_joined');
end;
$function$
