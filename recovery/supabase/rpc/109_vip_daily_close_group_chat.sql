CREATE OR REPLACE FUNCTION public.vip_daily_close_group_chat()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_room_id uuid := '0a495a02-bcb8-4e38-b3ef-4e7059c2a883'::uuid;
  v_admin_id uuid;
  v_today_start timestamptz;
  v_tomorrow_start timestamptz;
  v_message text :=
    '오늘 하루도 고생많으셨습니다♥' || E'\n' ||
    '행복한 저녁보내시고 내일도' || E'\n' ||
    '이벤트 및 혜택 도움드리겠습니다 :)' || E'\n\n' ||
    '【이벤트 및 그룹채팅 안내시간】' || E'\n' ||
    '오전 11:00 ~ 오후 18:30 (연중무휴)';
begin
  v_today_start :=
    (((now() at time zone 'Asia/Seoul')::date)::timestamp)
    at time zone 'Asia/Seoul';
  v_tomorrow_start := v_today_start + interval '1 day';

  -- 고객센터/개발자 성격의 관리자 우선, 없으면 승인 관리자
  select p.id
  into v_admin_id
  from public.profiles p
  where p.role = 'admin'
    and p.approval_status::text in ('1','approved')
  order by
    case
      when p.nickname ilike '%개발자%' then 0
      when p.nickname ilike '%고객센터%' then 1
      else 2
    end,
    p.created_at asc
  limit 1;

  -- 공식 메시지는 잠그기 전에 먼저 INSERT
  if v_admin_id is not null
     and not exists (
       select 1
       from public.group_messages gm
       where gm.room_id = v_room_id
         and gm.created_at >= v_today_start
         and gm.created_at < v_tomorrow_start
         and gm.content = v_message
     ) then
    insert into public.group_messages(
      room_id, member_id, message_type, content, is_deleted, created_at
    )
    values(
      v_room_id,
      v_admin_id,
      'notice',
      v_message,
      false,
      now()
    );
  end if;

  -- 공식 마무리 공지 직후 LOCK
  perform public.set_group_chat_frozen_system(v_room_id, true);
end;
$function$
