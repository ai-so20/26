CREATE OR REPLACE FUNCTION public.fulfill_attendance_reward(p_member_id uuid, p_milestone_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_admin_nickname text;
  v_member_nickname text;
  v_chat_id uuid;
  v_gift public.attendance_gift_inventory%rowtype;
  v_delivery public.attendance_reward_deliveries%rowtype;
  v_payload text;
begin
  if p_member_id is null
     or p_milestone_count <= 0
     or p_milestone_count % 10 <> 0 then
    return jsonb_build_object('success', false, 'reason', 'invalid_milestone');
  end if;

  -- 회원 members 행 보장
  insert into public.members(id, nickname, password_hash, role, status, approved_at)
  select
    p.id,
    coalesce(p.nickname, 'VIP 회원'),
    'SUPABASE_AUTH',
    'member',
    'approved',
    now()
  from public.profiles p
  where p.id = p_member_id
  on conflict(id) do update
  set
    nickname = excluded.nickname,
    status = 'approved',
    approved_at = coalesce(public.members.approved_at, excluded.approved_at);

  select coalesce(p.nickname, m.nickname, 'VIP 회원')
  into v_member_nickname
  from public.profiles p
  full join public.members m on m.id = p.id
  where coalesce(p.id, m.id) = p_member_id
  limit 1;

  -- VIP 고객센터 관리자
  select p.id, p.nickname
  into v_admin_id, v_admin_nickname
  from public.profiles p
  where p.role = 'admin'
    and p.approval_status::text in ('1','approved')
  order by
    case when p.nickname = 'VIP고객센터' then 0 else 1 end,
    p.created_at asc
  limit 1;

  if v_admin_id is null then
    return jsonb_build_object('success', false, 'reason', 'admin_not_found');
  end if;

  insert into public.members(id, nickname, password_hash, role, status, approved_at)
  values(
    v_admin_id,
    coalesce(v_admin_nickname, 'VIP고객센터'),
    'SUPABASE_AUTH',
    'admin',
    'approved',
    now()
  )
  on conflict(id) do update
  set
    nickname = excluded.nickname,
    role = 'admin',
    status = 'approved',
    approved_at = coalesce(public.members.approved_at, excluded.approved_at);

  -- 10/20/30... 회차별 지급기록 1개만 생성
  insert into public.attendance_reward_deliveries(
    member_id, milestone_count, status, updated_at
  )
  values(p_member_id, p_milestone_count, 'pending', now())
  on conflict(member_id, milestone_count) do nothing;

  select *
  into v_delivery
  from public.attendance_reward_deliveries
  where member_id = p_member_id
    and milestone_count = p_milestone_count
  for update;

  if v_delivery.status = 'delivered'
     and v_delivery.private_delivered_at is not null then
    return jsonb_build_object(
      'success', true,
      'already_delivered', true,
      'milestone_count', p_milestone_count
    );
  end if;

  -- 이전 시도에서 출석 전용 상품이 이미 연결돼 있으면 그대로 복구
  if v_delivery.attendance_gift_id is not null then
    select *
    into v_gift
    from public.attendance_gift_inventory
    where id = v_delivery.attendance_gift_id;
  end if;

  -- 새 지급: 출석체크 전용 재고에서만 위에서부터 1개 선점
  if v_gift.id is null then
    select *
    into v_gift
    from public.attendance_gift_inventory
    where status = 'available'
    order by queue_no asc, created_at asc, id asc
    for update skip locked
    limit 1;

    if v_gift.id is null then
      update public.attendance_reward_deliveries
      set
        status = 'inventory_empty',
        last_error = 'attendance_gift_inventory_empty',
        updated_at = now()
      where id = v_delivery.id;

      return jsonb_build_object(
        'success', false,
        'reason', 'attendance_gift_inventory_empty',
        'milestone_count', p_milestone_count
      );
    end if;

    update public.attendance_gift_inventory
    set
      status = 'assigned',
      assigned_member_id = p_member_id,
      assigned_milestone_count = p_milestone_count,
      assigned_at = now()
    where id = v_gift.id
      and status = 'available';

    if not found then
      update public.attendance_reward_deliveries
      set status = 'error', last_error = 'attendance_gift_lock_conflict', updated_at = now()
      where id = v_delivery.id;

      return jsonb_build_object('success', false, 'reason', 'attendance_gift_lock_conflict');
    end if;

    update public.attendance_reward_deliveries
    set
      attendance_gift_id = v_gift.id,
      gift_id = null,
      status = 'pending',
      last_error = null,
      updated_at = now()
    where id = v_delivery.id;
  end if;

  -- 1:1 고객센터 채팅 확보
  select pc.id
  into v_chat_id
  from public.private_chats pc
  where pc.member_id = p_member_id
  limit 1;

  if v_chat_id is null then
    insert into public.private_chats(member_id, operator_id, status)
    values(p_member_id, v_admin_id, 'open')
    returning id into v_chat_id;
  else
    update public.private_chats
    set operator_id = v_admin_id, status = 'open', updated_at = now()
    where id = v_chat_id;
  end if;

  -- 기존 일반 이벤트와 동일한 GIFT_REWARD 렌더링 사용
  v_payload :=
    '[[GIFT_REWARD]]' ||
    jsonb_build_object(
      'product_name', v_gift.product_name,
      'gift_url', v_gift.gift_url,
      'amount', v_gift.amount,
      'event_id', 'attendance-' || p_member_id::text || '-' || p_milestone_count::text,
      'queue_no', v_gift.queue_no,
      'reward_type', 'attendance'
    )::text;

  -- 동일 마일스톤 1:1 메시지 중복 방지
  if not exists (
    select 1
    from public.private_messages pm
    where pm.chat_id = v_chat_id
      and coalesce(pm.is_deleted,false) = false
      and pm.content like '[[GIFT_REWARD]]%'
      and pm.content like '%attendance-' || p_member_id::text || '-' || p_milestone_count::text || '%'
  ) then
    insert into public.private_messages(
      chat_id, sender_id, message_type, content,
      is_deleted, is_read, created_at
    )
    values(
      v_chat_id, v_admin_id, 'text', v_payload,
      false, false, now()
    );
  end if;

  update public.private_chats
  set updated_at = now()
  where id = v_chat_id;

  update public.attendance_reward_deliveries
  set
    status = 'delivered',
    private_delivered_at = coalesce(private_delivered_at, now()),
    last_error = null,
    updated_at = now()
  where id = v_delivery.id;

  return jsonb_build_object(
    'success', true,
    'milestone_count', p_milestone_count,
    'member', v_member_nickname,
    'gift', v_gift.product_name,
    'amount', v_gift.amount,
    'reward_type', 'attendance'
  );

exception when others then
  update public.attendance_reward_deliveries
  set status = 'error', last_error = sqlerrm, updated_at = now()
  where member_id = p_member_id
    and milestone_count = p_milestone_count;

  return jsonb_build_object(
    'success', false,
    'reason', 'delivery_error',
    'error', sqlerrm
  );
end;
$function$
