CREATE OR REPLACE FUNCTION public.attach_ai_gift_to_winner_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_winner_name text;
  v_ai_id uuid;
  v_event_id uuid;
  v_gift public.ai_gift_inventory%rowtype;
begin
  if new.room_id <> '0a495a02-bcb8-4e38-b3ef-4e7059c2a883'::uuid
     or coalesce(new.is_deleted, false) = true
     or coalesce(new.content, '') like '%🎁 당첨 상품%' or coalesce(new.content, '') not like '%당첨자는%'
     or coalesce(new.content, '') not like '%🏆%'
  then
    return new;
  end if;

  -- "🏆 닉네임 님입니다" 형태에서 닉네임을 추출합니다.
  v_winner_name := nullif(
    trim(
      substring(
        new.content
        from '🏆[[:space:]]*([^[:cntrl:]🏆]+?)[[:space:]]*님(?:입니다|이|께|$)'
      )
    ),
    ''
  );

  -- 정규식이 환경/문구에 따라 잡히지 않을 경우 AI 닉네임 포함 여부로 안전하게 재확인합니다.
  if v_winner_name is not null then
    select a.id
    into v_ai_id
    from public.ai_characters a
    where trim(a.nickname) = trim(v_winner_name)
    limit 1;
  end if;

  if v_ai_id is null then
    select a.id, a.nickname
    into v_ai_id, v_winner_name
    from public.ai_characters a
    where new.content like '%🏆%' || a.nickname || '%'
    order by char_length(a.nickname) desc
    limit 1;
  end if;

  -- AI 캐릭터가 아니면 실제 회원이므로 아무것도 바꾸지 않습니다.
  if v_ai_id is null then
    return new;
  end if;

  -- 해당 AI가 실제로 최근 확정된 이벤트 당첨자인지 한 번 더 확인합니다.
  select ew.event_id
  into v_event_id
  from public.event_winners ew
  where ew.member_id = v_ai_id
  order by ew.id desc
  limit 1;

  if v_event_id is null then
    return new;
  end if;

  -- 이미 이 이벤트에 배정된 AI 전용 상품이 있으면 재사용합니다.
  select *
  into v_gift
  from public.ai_gift_inventory g
  where g.assigned_event_id = v_event_id
  order by g.queue_no
  limit 1;

  if not found then
    -- 가장 오래된 대기 상품 1개를 잠금하여 동시 이벤트에서도 중복 사용하지 않습니다.
    select *
    into v_gift
    from public.ai_gift_inventory g
    where g.status = 'available'
    order by g.queue_no asc
    for update skip locked
    limit 1;

    if found then
      update public.ai_gift_inventory
      set status = 'assigned',
          assigned_event_id = v_event_id,
          assigned_winner_id = v_ai_id,
          assigned_at = now()
      where id = v_gift.id
      returning * into v_gift;
    end if;
  end if;

  if v_gift.id is null then
    return new;
  end if;

  -- 혹시 재실행되더라도 같은 상품 문구를 두 번 붙이지 않습니다.
  if new.content not like '%🎁 당첨 상품%' then
    new.content :=
      rtrim(new.content) ||
      E'\n\n🎁 당첨 상품\n' ||
      v_gift.product_name;
  end if;

  return new;
end;
$function$
