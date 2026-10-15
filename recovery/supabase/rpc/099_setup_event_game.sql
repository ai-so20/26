CREATE OR REPLACE FUNCTION public.setup_event_game(target_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare

  target_type text;

  random_number integer;

  random_box integer;

  quiz_row record;

begin

  select event_type
  into target_type
  from public.events
  where id = target_event_id;


  if not found then
    return;
  end if;


  -- 이미 설정되어 있으면 절대 다시 만들지 않음.
  -- 즉 정답이 중간에 바뀌지 않음.
  if exists (
    select 1
    from public.event_game_secrets
    where event_id = target_event_id
  ) then
    return;
  end if;


  -- ==========================================
  -- 숫자 맞히기
  -- 서버에서 1~100 정답 생성
  -- ==========================================

  if target_type = 'number' then

    random_number :=
      floor(random() * 100 + 1)::integer;

    insert into public.event_game_secrets (
      event_id,
      secret_answer
    )
    values (
      target_event_id,
      random_number::text
    )

    on conflict (event_id)
    do nothing;


  -- ==========================================
  -- 랜덤 선물상자
  -- 1~4 중 당첨 상자 지정
  -- ==========================================

  elsif target_type = 'gift_box' then

    random_box :=
      floor(random() * 4 + 1)::integer;

    insert into public.event_game_secrets (
      event_id,
      secret_answer
    )
    values (
      target_event_id,
      random_box::text
    )

    on conflict (event_id)
    do nothing;


  -- ==========================================
  -- 퀴즈
  -- 문제은행에서 랜덤 문제 선택
  -- secret_answer에는 문제 ID 저장
  -- ==========================================

  elsif target_type = 'quiz' then

    select
      q.id,
      q.correct_option
    into quiz_row

    from public.event_quiz_bank q

    where q.active = true

    order by random()

    limit 1;


    if quiz_row.id is not null then

      insert into public.event_game_secrets (
        event_id,
        secret_answer
      )
      values (
        target_event_id,
        quiz_row.id::text
      )

      on conflict (event_id)
      do nothing;

    end if;


  -- ==========================================
  -- 나머지 게임
  -- 별도 정답은 필요 없지만
  -- 설정 완료 표시를 위해 row 생성
  -- ==========================================

  else

    insert into public.event_game_secrets (
      event_id,
      secret_answer
    )
    values (
      target_event_id,
      null
    )

    on conflict (event_id)
    do nothing;

  end if;

end;
$function$
