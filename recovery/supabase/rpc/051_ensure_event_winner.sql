CREATE OR REPLACE FUNCTION public.ensure_event_winner(p_event_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_winner uuid;
  v_secret text;
  v_min_diff integer;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return null;
  end if;

  -- 이미 선착순 등으로 당첨자가 정해졌으면 그대로 유지
  select ew.member_id
  into v_winner
  from public.event_winners ew
  where ew.event_id = p_event_id
  order by ew.rank asc, ew.id asc
  limit 1;

  if v_winner is not null then
    return v_winner;
  end if;

  perform public.setup_event_game(p_event_id);

  select secret_answer
  into v_secret
  from public.event_game_secrets
  where event_id = p_event_id;

  if v_event.event_type = 'gift_box' then
    select ee.member_id
    into v_winner
    from public.event_entries ee
    where ee.event_id = p_event_id
      and ee.answer = v_secret
    order by random()
    limit 1;

  elsif v_event.event_type = 'number' then
    select ee.member_id
    into v_winner
    from public.event_entries ee
    where ee.event_id = p_event_id
      and ee.answer ~ '^[0-9]+$'
      and v_secret ~ '^[0-9]+$'
      and ee.answer::integer = v_secret::integer
    order by random()
    limit 1;

    if v_winner is null and v_secret ~ '^[0-9]+$' then
      select min(abs(ee.answer::integer - v_secret::integer))
      into v_min_diff
      from public.event_entries ee
      where ee.event_id = p_event_id
        and ee.answer ~ '^[0-9]+$';

      if v_min_diff is not null then
        select ee.member_id
        into v_winner
        from public.event_entries ee
        where ee.event_id = p_event_id
          and ee.answer ~ '^[0-9]+$'
          and abs(ee.answer::integer - v_secret::integer) = v_min_diff
        order by random()
        limit 1;
      end if;
    end if;

  elsif v_event.event_type = 'quiz' then
    select ee.member_id
    into v_winner
    from public.event_entries ee
    where ee.event_id = p_event_id
      and ee.is_correct = true
    order by random()
    limit 1;

  else
    select ee.member_id
    into v_winner
    from public.event_entries ee
    where ee.event_id = p_event_id
    order by random()
    limit 1;
  end if;

  -- 기존 정책 유지: 규칙상 당첨자가 없더라도 참가자가 있으면 1명 선정
  if v_winner is null then
    select ee.member_id
    into v_winner
    from public.event_entries ee
    where ee.event_id = p_event_id
    order by random()
    limit 1;
  end if;

  if v_winner is not null then
    insert into public.event_winners(event_id, member_id, rank)
    values(p_event_id, v_winner, 1)
    on conflict(event_id) do nothing;

    select ew.member_id
    into v_winner
    from public.event_winners ew
    where ew.event_id = p_event_id
    order by ew.rank asc, ew.id asc
    limit 1;
  end if;

  return v_winner;
end;
$function$
