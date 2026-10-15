CREATE OR REPLACE FUNCTION public.admin_get_or_create_private_chat(target_member_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result_chat_id uuid;
begin
  -- 관리자 확인
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and approval_status = '1'
  ) then
    raise exception '관리자만 사용할 수 있습니다.';
  end if;

  -- 선택한 회원 확인
  if not exists (
    select 1
    from public.profiles
    where id = target_member_id
      and approval_status = '1'
      and show_in_admin_chat = true
      and coalesce(role, 'member') <> 'admin'
  ) then
    raise exception '사용할 수 없는 회원입니다.';
  end if;

  -- 기존 상담방 확인
  select id
  into result_chat_id
  from public.private_chats
  where member_id = target_member_id
  limit 1;

  -- 기존 상담방이 있으면 다시 열기
  if result_chat_id is not null then
    update public.private_chats
    set
      operator_id = auth.uid(),
      status = 'open',
      updated_at = now()
    where id = result_chat_id;

    return result_chat_id;
  end if;

  -- members 테이블에도 회원이 존재하도록 보장
  insert into public.members (
    id,
    nickname,
    password_hash,
    role,
    status,
    approved_at
  )
  select
    id,
    nickname,
    'SUPABASE_AUTH',
    'member',
    'approved',
    now()
  from public.profiles
  where id = target_member_id
  on conflict (id) do update
  set
    nickname = excluded.nickname,
    status = 'approved';

  -- 새 상담방 생성
  insert into public.private_chats (
    member_id,
    operator_id,
    status
  )
  values (
    target_member_id,
    auth.uid(),
    'open'
  )
  returning id into result_chat_id;

  return result_chat_id;
end;
$function$
