CREATE OR REPLACE FUNCTION public.admin_kick_member(target_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 회원을 퇴장시킬 수 있습니다.';
  end if;

  if target_member_id = auth.uid() then
    raise exception '관리자 본인은 퇴장시킬 수 없습니다.';
  end if;

  if exists (
    select 1 from public.profiles
    where id = target_member_id and role = 'admin'
  ) then
    raise exception '다른 관리자는 퇴장시킬 수 없습니다.';
  end if;

  update public.profiles
  set approval_status = '0'
  where id = target_member_id;

  update public.members
  set status = 'rejected'
  where id = target_member_id;
end;
$function$
