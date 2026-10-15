CREATE OR REPLACE FUNCTION public.admin_set_member_approval(target_member_id uuid, target_approval_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
      and me.approval_status::text = '1'
  ) then
    raise exception '관리자만 회원 승인상태를 변경할 수 있습니다.';
  end if;

  if target_approval_status not in ('0','1') then
    raise exception '승인상태는 0 또는 1만 사용할 수 있습니다.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = target_member_id
      and p.role = 'admin'
  ) then
    raise exception '관리자 계정은 이 기능으로 변경할 수 없습니다.';
  end if;

  update public.profiles
  set approval_status = target_approval_status
  where id = target_member_id;

  if not found then
    raise exception '대상 회원을 찾을 수 없습니다.';
  end if;

  return true;
end;
$function$
