CREATE OR REPLACE FUNCTION public.assign_vip_avatar_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 관리자 프로필은 기존 아바타를 유지
  if coalesce(new.role::text, '') = 'admin' then
    return new;
  end if;

  -- 승인 상태로 새로 전환되는 순간에만 자동 배정
  if new.approval_status::text in ('1','approved')
     and coalesce(old.approval_status::text, '') not in ('1','approved') then
    new.avatar := public.pick_least_used_vip_avatar();
  end if;

  return new;
end;
$function$
