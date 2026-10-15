CREATE OR REPLACE FUNCTION public.get_or_create_admin_chat()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin_id uuid;
  chat_id uuid;
begin
  -- 승인된 관리자 찾기
  select id into admin_id
  from public.profiles
  where role = 'admin'
    and approval_status = '1'
  limit 1;

  if admin_id is null then
    raise exception '관리자 계정을 찾을 수 없습니다.';
  end if;

  -- 관리자가 자기 자신과 상담방을 만드는 것은 막기
  if auth.uid() = admin_id then
    raise exception '관리자 계정입니다.';
  end if;

  -- 승인된 회원만 사용 가능
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approval_status = '1'
  ) then
    raise exception '승인된 회원만 이용할 수 있습니다.';
  end if;

  -- 기존 상담방 찾기
  select id into chat_id
  from public.private_chats
  where member_id = auth.uid()
    and operator_id = admin_id
  limit 1;

  -- 없으면 새 상담방 생성
  if chat_id is null then
    insert into public.private_chats (
      member_id,
      operator_id,
      status
    )
    values (
      auth.uid(),
      admin_id,
      'open'
    )
    returning id into chat_id;
  end if;

  return chat_id;
end;
$function$
