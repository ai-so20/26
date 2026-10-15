CREATE OR REPLACE FUNCTION public.announce_event_winner_to_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_winner_name text;
  v_admin_id uuid;
  v_game_name text;
  v_chat_id uuid;
  v_gift public.gift_inventory%rowtype;
  v_gift_payload text;
  v_product_text text;
begin
  select *
  into v_event
  from public.events
  where id = new.event_id;

  if not found then
    return new;
  end if;

  select p.nickname
  into v_winner_name
  from public.profiles p
  where p.id = new.member_id;

  -- 실제 승인된 관리자 중 가장 먼저 생성된 관리자 사용
  select p.id
  into v_admin_id
  from public.profiles p
  where p.role = 'admin'
    and p.approval_status = 'approved'
    and exists (
      select 1
      from public.members m
      where m.id = p.id
    )
  order by p.created_at asc
  limit 1;

  if v_admin_id is null then
    raise exception '당첨 공지/지급에 사용할 승인된 관리자 계정을 찾지 못했습니다.';
  end if;

  v_game_name := public.event_type_korean(v_event.event_type);

  -- 같은 이벤트에 이미 지급된 상품이 있다면 재사용하지 않고 그 상품을 확인
  select *
  into v_gift
  from public.gift_inventory
  where assigned_event_id = new.event_id
    and assigned_member_id = new.member_id
    and status = 'assigned'
  order by assigned_at asc
  limit 1;

  -- 아직 지급 전이면 queue_no가 가장 작은 미사용 상품을 잠금 후 1개 확보
  if v_gift.id is null then
    select *
    into v_gift
    from public.gift_inventory
    where status = 'available'
    order by queue_no asc nulls last, created_at asc, id asc
    for update skip locked
    limit 1;

    if v_gift.id is not null then
      update public.gift_inventory
      set
        status = 'assigned',
        assigned_member_id = new.member_id,
        assigned_event_id = new.event_id,
        assigned_at = now()
      where id = v_gift.id
        and status = 'available';

      if not found then
        raise exception '기프티콘 재고 동시 처리 중 상태가 변경되었습니다.';
      end if;
    end if;
  end if;

  if v_gift.id is not null then
    v_product_text := v_gift.product_name;
  else
    v_product_text := '기프티콘 (관리자 재고 확인 필요)';
  end if;

  -- 그룹채팅: 실제 지급 상품명 공개 / 링크는 절대 공개하지 않음
  insert into public.group_messages(
    room_id, member_id, message_type, content, is_deleted, created_at
  )
  values(
    v_event.room_id,
    v_admin_id,
    'text',
    '🎉 VIP EVENT · 당첨 안내' || E'\n\n' ||
    '축하드립니다!' || E'\n' ||
    '이번 ' || v_game_name || ' 이벤트 당첨자는' || E'\n' ||
    '🏆 ' || coalesce(v_winner_name, 'VIP 회원') || ' 님입니다!' || E'\n\n' ||
    '🎁 당첨 상품' || E'\n' ||
    v_product_text || E'\n\n' ||
    '상품은 1:1 고객센터에서 즉시 지급됩니다.' || E'\n' ||
    '당첨을 진심으로 축하드립니다 ♥️',
    false,
    now()
  );

  -- 실제 상품이 확보된 경우 1:1 고객센터 자동 지급
  if v_gift.id is not null then
    insert into public.private_chats(member_id, operator_id, status)
    values(new.member_id, v_admin_id, 'open')
    on conflict (member_id)
    do update set
      operator_id = coalesce(public.private_chats.operator_id, excluded.operator_id),
      status = 'open',
      updated_at = now()
    returning id into v_chat_id;

    v_gift_payload :=
      '[[GIFT_REWARD]]' ||
      jsonb_build_object(
        'product_name', v_gift.product_name,
        'gift_url', v_gift.gift_url,
        'amount', v_gift.amount,
        'event_id', new.event_id,
        'queue_no', v_gift.queue_no
      )::text;

    -- 같은 이벤트 기프티콘 메시지가 이미 있으면 중복 발송하지 않음
    if not exists (
      select 1
      from public.private_messages pm
      where pm.chat_id = v_chat_id
        and pm.content like '[[GIFT_REWARD]]%'
        and pm.content like '%' || new.event_id::text || '%'
        and pm.is_deleted = false
    ) then
      insert into public.private_messages(
        chat_id, sender_id, message_type, content, is_deleted, is_read, created_at
      )
      values(
        v_chat_id,
        v_admin_id,
        'text',
        v_gift_payload,
        false,
        false,
        now()
      );
    end if;

    update public.private_chats
    set updated_at = now()
    where id = v_chat_id;
  end if;

  return new;
end;
$function$
