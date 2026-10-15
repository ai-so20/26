CREATE OR REPLACE FUNCTION public.vip_daily_1130_group_notice()
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
    '🎁 오늘의 이벤트가 시작되었습니다♥' || E'\n' ||
    '참여하시고 다양한 혜택과 상품 받아가세요!';
begin
  v_today_start :=
    (((now() at time zone 'Asia/Seoul')::date)::timestamp)
    at time zone 'Asia/Seoul';
  v_tomorrow_start := v_today_start + interval '1 day';

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

  if v_admin_id is null then
    return;
  end if;

  if not exists (
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
      v_room_id, v_admin_id, 'notice', v_message, false, now()
    );
  end if;
end;
$function$
