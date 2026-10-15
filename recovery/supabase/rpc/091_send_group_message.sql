CREATE OR REPLACE FUNCTION public.send_group_message(target_room_id uuid, message_content text)
 RETURNS SETOF group_messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me public.profiles%rowtype;
  frozen boolean := false;
  inserted public.group_messages%rowtype;
  kst_time time;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into me
  from public.profiles
  where id = auth.uid();

  if me.id is null or me.approval_status <> '1' then
    raise exception '승인된 VIP 회원만 이용할 수 있습니다.';
  end if;

  if nullif(btrim(message_content), '') is null then
    raise exception '메시지를 입력해주세요.';
  end if;

  if me.role <> 'admin' then
    kst_time := (timezone('Asia/Seoul', now()))::time;

    if kst_time < time '11:00' or kst_time >= time '18:30' then
      raise exception '그룹채팅 운영시간은 11:00 ~ 18:30입니다.';
    end if;

    select coalesce(is_frozen, false)
      into frozen
    from public.room_chat_settings
    where room_id = target_room_id;

    if coalesce(frozen, false) then
      raise exception '현재 그룹채팅이 잠겨 있습니다.';
    end if;
  end if;

  insert into public.group_messages(
    room_id,
    member_id,
    message_type,
    content,
    is_deleted
  )
  values(
    target_room_id,
    auth.uid(),
    'text',
    btrim(message_content),
    false
  )
  returning * into inserted;

  return next inserted;
end;
$function$
