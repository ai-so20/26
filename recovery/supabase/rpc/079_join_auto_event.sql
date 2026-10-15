CREATE OR REPLACE FUNCTION public.join_auto_event(target_event_id uuid, submitted_answer text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare

  target_event public.events%rowtype;

  secret_value text;

  quiz_correct integer;

  submitted_number integer;

  submitted_box integer;

begin

  -- 로그인 확인
  if auth.uid() is null then

    raise exception
      '로그인이 필요합니다.';

  end if;


  -- 승인 회원 확인
  if not exists (

    select 1

    from public.profiles

    where id = auth.uid()
      and approval_status = '1'

  ) then

    raise exception
      '승인된 회원만 참여할 수 있습니다.';

  end if;


  -- 이벤트 잠금
  select *
  into target_event

  from public.events

  where id = target_event_id

  for update;


  if not found then

    raise exception
      '이벤트를 찾을 수 없습니다.';

  end if;


  -- 서버시간 기준
  if now() < target_event.starts_at then

    return jsonb_build_object(
      'success', false,
      'message',
      '아직 시작되지 않은 이벤트입니다.'
    );

  end if;


  if now() >= target_event.ends_at then

    return jsonb_build_object(
      'success', false,
      'message',
      '이미 종료된 이벤트입니다.'
    );

  end if;


  if target_event.status = 'completed' then

    return jsonb_build_object(
      'success', false,
      'message',
      '이미 종료된 이벤트입니다.'
    );

  end if;


  -- 중복 참여 확인
  if exists (

    select 1

    from public.event_entries

    where event_id = target_event_id
      and member_id = auth.uid()

  ) then

    return jsonb_build_object(
      'success', false,
      'message',
      '이미 참여한 이벤트입니다.'
    );

  end if;


  -- 게임 설정 보장
  perform public.setup_event_game(
    target_event_id
  );


  select secret_answer
  into secret_value

  from public.event_game_secrets

  where event_id = target_event_id;


  -- =====================================================
  -- 숫자 맞히기
  -- =====================================================

  if target_event.event_type = 'number' then

    begin

      submitted_number :=
        trim(submitted_answer)::integer;

    exception when others then

      return jsonb_build_object(
        'success', false,
        'message',
        '1부터 100까지 숫자를 선택해주세요.'
      );

    end;


    if submitted_number < 1
       or submitted_number > 100 then

      return jsonb_build_object(
        'success', false,
        'message',
        '숫자는 1부터 100까지만 선택할 수 있습니다.'
      );

    end if;


    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      submitted_number::text,

      submitted_number::text =
        secret_value,

      '숫자 선택 완료',
      now()
    );


    return jsonb_build_object(
      'success', true,
      'message',
      submitted_number ||
      '번으로 참여가 완료되었습니다.'
    );


  -- =====================================================
  -- 선물상자
  -- =====================================================

  elsif target_event.event_type = 'gift_box' then

    begin

      submitted_box :=
        trim(submitted_answer)::integer;

    exception when others then

      return jsonb_build_object(
        'success', false,
        'message',
        '선물상자를 선택해주세요.'
      );

    end;


    if submitted_box < 1
       or submitted_box > 4 then

      return jsonb_build_object(
        'success', false,
        'message',
        '1번부터 4번까지의 선물상자 중 하나를 선택해주세요.'
      );

    end if;


    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      submitted_box::text,

      submitted_box::text =
        secret_value,

      submitted_box ||
        '번 선물상자 선택 완료',

      now()
    );


    return jsonb_build_object(
      'success', true,
      'message',
      submitted_box ||
      '번 선물상자를 선택했습니다.'
    );


  -- =====================================================
  -- 퀴즈
  -- =====================================================

  elsif target_event.event_type = 'quiz' then

    begin

      submitted_number :=
        trim(submitted_answer)::integer;

    exception when others then

      return jsonb_build_object(
        'success', false,
        'message',
        '퀴즈 정답을 선택해주세요.'
      );

    end;


    if submitted_number < 1
       or submitted_number > 4 then

      return jsonb_build_object(
        'success', false,
        'message',
        '보기 중 하나를 선택해주세요.'
      );

    end if;


    select q.correct_option
    into quiz_correct

    from public.event_quiz_bank q

    where q.id = secret_value::uuid;


    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      submitted_number::text,

      submitted_number =
        quiz_correct,

      case

        when submitted_number =
          quiz_correct

        then '정답 제출 완료'

        else '답안 제출 완료'

      end,

      now()
    );


    -- 진행 중에는 정답 여부를 바로 공개하지 않음.
    return jsonb_build_object(
      'success', true,
      'message',
      '답안 제출이 완료되었습니다. 정답과 결과는 회차 종료 후 공개됩니다.'
    );


  -- =====================================================
  -- 선착순
  -- 이벤트 row를 FOR UPDATE로 잠근 상태이므로
  -- 동시에 눌러도 먼저 DB에 들어온 요청 1명만 당첨
  -- =====================================================

  elsif target_event.event_type = 'first_come' then


    if exists (

      select 1

      from public.event_winners

      where event_id =
        target_event_id

    ) then

      return jsonb_build_object(
        'success', false,
        'message',
        '선착순 당첨자가 이미 결정되었습니다.'
      );

    end if;


    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      null,
      true,
      '선착순 1위',
      now()
    );


    insert into public.event_winners (
      event_id,
      member_id,
      rank
    )

    values (
      target_event_id,
      auth.uid(),
      1
    )

    on conflict (event_id)
    do nothing;


    update public.events

    set
      status = 'completed',
      completed_at = now()

    where id = target_event_id;


    return jsonb_build_object(
      'success', true,
      'winner', true,
      'message',
      '축하합니다! 가장 먼저 참여하여 선착순 당첨자로 선정되었습니다.'
    );


  -- =====================================================
  -- 룰렛
  -- =====================================================

  elsif target_event.event_type = 'roulette' then

    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      'roulette',
      null,
      '룰렛 참여 완료',
      now()
    );


    return jsonb_build_object(
      'success', true,
      'message',
      '룰렛 참여가 완료되었습니다. 회차 종료 후 참여자 중 1명이 무작위로 선정됩니다.'
    );


  -- =====================================================
  -- 자동 추첨
  -- =====================================================

  elsif target_event.event_type = 'draw' then

    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      null,
      null,
      '자동 추첨 응모 완료',
      now()
    );


    return jsonb_build_object(
      'success', true,
      'message',
      '응모가 완료되었습니다. 회차 종료 후 참여자 중 1명이 무작위로 선정됩니다.'
    );


  -- =====================================================
  -- 출석
  -- =====================================================

  elsif target_event.event_type = 'attendance' then

    insert into public.event_entries (
      event_id,
      member_id,
      answer,
      is_correct,
      result_text,
      submitted_at
    )

    values (
      target_event_id,
      auth.uid(),
      null,
      null,
      '출석 완료',
      now()
    );


    insert into public.attendance_records (
      event_id,
      member_id,
      attendance_date
    )

    values (
      target_event_id,
      auth.uid(),
      (now() at time zone 'Asia/Seoul')::date
    )

    on conflict do nothing;


    return jsonb_build_object(
      'success', true,
      'message',
      '출석이 완료되었습니다.'
    );


  else

    return jsonb_build_object(
      'success', false,
      'message',
      '지원하지 않는 이벤트입니다.'
    );

  end if;

end;
$function$
