CREATE OR REPLACE FUNCTION public.fulfill_event_reward(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_winner uuid;
  v_winner_name text;
  v_is_ai boolean := false;
  v_virtual_reward boolean := false;
  v_admin_id uuid;
  v_admin_nickname text;
  v_game_name text;
  v_chat_id uuid;
  v_gift public.gift_inventory%rowtype;
  v_delivery public.event_reward_deliveries%rowtype;
  v_payload text;
begin
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'event_not_found');
  end if;

  select ew.member_id
  into v_winner
  from public.event_winners ew
  where ew.event_id = p_event_id
  order by ew.rank asc, ew.id asc
  limit 1;

  if v_winner is null then
    return jsonb_build_object('success', false, 'reason', 'winner_not_found');
  end if;

  select exists(
    select 1
    from public.ai_characters a
    where a.id = v_winner
  )
  into v_is_ai;

  select coalesce(p.reward_account_type, 'real') = 'virtual'
  into v_virtual_reward
  from public.profiles p where p.id = v_winner;

  select coalesce(p.nickname, m.nickname, a.nickname, 'VIP 회원')
  into v_winner_name
  from (select v_winner as id) x
  left join public.profiles p on p.id = x.id
  left join public.members m on m.id = x.id
  left join public.ai_characters a on a.id = x.id;

  select p.id, coalesce(p.nickname, 'VIP고객센터')
  into v_admin_id, v_admin_nickname
  from public.profiles p
  where p.role = 'admin'
    and p.approval_status::text in ('1','approved')
  order by
    case when p.nickname = 'VIP고객센터' then 0 else 1 end,
    p.created_at asc
  limit 1;

  if v_admin_id is null then
    insert into public.event_reward_deliveries(
      event_id, winner_id, last_error, updated_at
    )
    values(p_event_id, v_winner, 'admin_not_found', now())
    on conflict(event_id) do update
    set
      winner_id = excluded.winner_id,
      last_error = excluded.last_error,
      updated_at = now();

    return jsonb_build_object(
      'success', false,
      'reason', 'admin_not_found',
      'winner', v_winner_name
    );
  end if;

  insert into public.event_reward_deliveries(
    event_id, winner_id, updated_at
  )
  values(
    p_event_id, v_winner, now()
  )
  on conflict(event_id) do update
  set
    winner_id = excluded.winner_id,
    updated_at = now();

  select *
  into v_delivery
  from public.event_reward_deliveries
  where event_id = p_event_id
  for update;

  v_game_name := case v_event.event_type
    when 'gift_box' then '선물상자'
    when 'number' then '숫자 선택'
    when 'roulette' then '룰렛'
    when 'quiz' then '퀴즈'
    when 'draw' then '자동 추첨'
    when 'attendance' then '출석'
    else 'VIP'
  end;

  -- AI 시뮬레이션 당첨 공지는 기존 방식 유지
  if (v_is_ai or v_virtual_reward) and v_delivery.group_announced_at is null then
    begin
      insert into public.group_messages(
        room_id,
        member_id,
        message_type,
        content,
        is_deleted,
        created_at
      )
      values(
        v_event.room_id,
        v_admin_id,
        'event',
        '🎉 VIP EVENT · 당첨 안내' || E'\n\n' ||
        '축하드립니다!' || E'\n' ||
        '이번 ' || v_game_name || ' 이벤트 당첨자는' || E'\n' ||
        '🏆 ' || coalesce(v_winner_name, 'VIP 회원') || ' 님입니다!' ||
        case
          when v_is_ai then
            E'\n\n' || '당첨을 진심으로 축하드립니다 ♥️'
          else
            E'\n\n' ||
            '🎁 당첨 혜택' || E'\n' ||
            '3,000원 ~ 100,000원 상당의 기프티콘 랜덤 지급' || E'\n\n' ||
            '상품은 1:1 고객센터에서 지급됩니다.' || E'\n' ||
            '당첨을 진심으로 축하드립니다 ♥️'
        end,
        false,
        now()
      );

      update public.event_reward_deliveries
      set
        group_announced_at = now(),
        last_error = null,
        updated_at = now()
      where event_id = p_event_id;
    exception when others then
      update public.event_reward_deliveries
      set
        last_error = 'group_announce: ' || sqlerrm,
        updated_at = now()
      where event_id = p_event_id;

      return jsonb_build_object(
        'success', false,
        'reason', 'group_announce_failed',
        'winner', v_winner_name,
        'error', sqlerrm
      );
    end;
  end if;

  -- ★ AI 당첨자는 여기서 종료
  -- 기프티콘 재고/1:1 고객센터를 전혀 건드리지 않습니다.
  if v_is_ai or v_virtual_reward then
    update public.event_reward_deliveries
    set
      gift_id = null,
      private_delivered_at = coalesce(private_delivered_at, now()),
      last_error = null,
      updated_at = now()
    where event_id = p_event_id;

    return jsonb_build_object(
      'success', true,
      'reason', case when v_is_ai then 'ai_winner_no_gift_required' else 'virtual_reward_no_gift_required' end,
      'winner', v_winner_name,
      'group_announced', true,
      'private_delivered', false,
      'gift_assigned', false
    );
  end if;

  -- 실제회원: 기존 기프티콘 자동지급 로직 유지
  select *
  into v_delivery
  from public.event_reward_deliveries
  where event_id = p_event_id
  for update;

  if v_delivery.gift_id is not null then
    select *
    into v_gift
    from public.gift_inventory
    where id = v_delivery.gift_id;
  end if;

  if v_gift.id is null then
    select *
    into v_gift
    from public.gift_inventory
    where status = 'available'
    order by queue_no asc nulls last, created_at asc, id asc
    for update skip locked
    limit 1;

    if v_gift.id is null then
      update public.event_reward_deliveries
      set
        last_error = 'gift_inventory_empty',
        updated_at = now()
      where event_id = p_event_id;

      return jsonb_build_object(
        'success', false,
        'reason', 'gift_inventory_empty',
        'winner', v_winner_name,
        'group_announced', true,
        'private_delivered', false
      );
    end if;

    update public.gift_inventory
    set
      status = 'assigned',
      assigned_member_id = v_winner,
      assigned_event_id = p_event_id,
      assigned_at = now()
    where id = v_gift.id
      and status = 'available';

    if not found then
      update public.event_reward_deliveries
      set
        last_error = 'gift_lock_conflict',
        updated_at = now()
      where event_id = p_event_id;

      return jsonb_build_object(
        'success', false,
        'reason', 'gift_lock_conflict',
        'winner', v_winner_name,
        'group_announced', true
      );
    end if;

    update public.event_reward_deliveries
    set
      gift_id = v_gift.id,
      last_error = null,
      updated_at = now()
    where event_id = p_event_id;
  end if;

  select *
  into v_delivery
  from public.event_reward_deliveries
  where event_id = p_event_id
  for update;

  -- 재고 부족 시 상품명을 추측하거나 지급 확정 공지를 게시하지 않는다.
  if v_gift.id is null then
    return jsonb_build_object(
      'success', false,
      'reason', 'gift_not_assigned',
      'winner', v_winner_name,
      'group_announced', false,
      'private_delivered', false
    );
  end if;

  -- 실제 지급 상품 확보 후 그룹 공지 (링크 비공개)
  if v_delivery.group_announced_at is null then
    begin
      insert into public.group_messages(
        room_id,
        member_id,
        message_type,
        content,
        is_deleted,
        created_at
      )
      values(
        v_event.room_id,
        v_admin_id,
        'event',
        '🎉 VIP EVENT · 당첨 안내' || E'\n\n' ||
        '축하드립니다!' || E'\n' ||
        '이번 ' || v_game_name || ' 이벤트 당첨자는' || E'\n' ||
        '🏆 ' || coalesce(v_winner_name, 'VIP 회원') || ' 님입니다!' ||
        E'\n\n' || '당첨을 진심으로 축하드립니다 ♥️' || E'\n\n' ||
        '🎁 당첨 상품' || E'\n' ||
        v_gift.product_name,
        false,
        now()
      );

      update public.event_reward_deliveries
      set
        group_announced_at = now(),
        last_error = null,
        updated_at = now()
      where event_id = p_event_id;
    exception when others then
      update public.event_reward_deliveries
      set
        last_error = 'group_announce: ' || sqlerrm,
        updated_at = now()
      where event_id = p_event_id;

      return jsonb_build_object(
        'success', false,
        'reason', 'group_announce_failed',
        'winner', v_winner_name,
        'error', sqlerrm
      );
    end;
  end if;


  if v_delivery.private_delivered_at is null then
    begin
      select pc.id
      into v_chat_id
      from public.private_chats pc
      where pc.member_id = v_winner
      limit 1;

      if v_chat_id is null then
        insert into public.private_chats(
          member_id, operator_id, status
        )
        values(
          v_winner, v_admin_id, 'open'
        )
        returning id into v_chat_id;
      else
        update public.private_chats
        set
          operator_id = v_admin_id,
          status = 'open',
          updated_at = now()
        where id = v_chat_id;
      end if;

      v_payload :=
        '[[GIFT_REWARD]]' ||
        jsonb_build_object(
          'product_name', v_gift.product_name,
          'gift_url', v_gift.gift_url,
          'amount', v_gift.amount,
          'event_id', p_event_id,
          'queue_no', v_gift.queue_no
        )::text;

      if not exists (
        select 1
        from public.private_messages pm
        where pm.chat_id = v_chat_id
          and coalesce(pm.is_deleted, false) = false
          and pm.content like '[[GIFT_REWARD]]%'
          and pm.content like '%' || p_event_id::text || '%'
      ) then
        insert into public.private_messages(
          chat_id,
          sender_id,
          message_type,
          content,
          is_deleted,
          is_read,
          created_at
        )
        values(
          v_chat_id,
          v_admin_id,
          'text',
          v_payload,
          false,
          false,
          now()
        );
      end if;

      update public.private_chats
      set updated_at = now()
      where id = v_chat_id;

      update public.event_reward_deliveries
      set
        private_delivered_at = now(),
        last_error = null,
        updated_at = now()
      where event_id = p_event_id;
    exception when others then
      update public.event_reward_deliveries
      set
        last_error = 'private_delivery: ' || sqlerrm,
        updated_at = now()
      where event_id = p_event_id;
    end;
  end if;

  select *
  into v_delivery
  from public.event_reward_deliveries
  where event_id = p_event_id;

  return jsonb_build_object(
    'success',
      v_delivery.group_announced_at is not null
      and v_delivery.private_delivered_at is not null,
    'winner', v_winner_name,
    'gift', v_gift.product_name,
    'queue_no', v_gift.queue_no,
    'group_announced', v_delivery.group_announced_at is not null,
    'private_delivered', v_delivery.private_delivered_at is not null,
    'last_error', v_delivery.last_error
  );
end;
$function$

