CREATE OR REPLACE FUNCTION public.admin_approve_all_pending_members()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  changed_count integer := 0;
begin
  if not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
      and me.approval_status::text = '1'
  ) then
    raise exception '관리자만 전체 승인을 실행할 수 있습니다.';
  end if;

  update public.profiles
  set approval_status = '1'
  where coalesce(approval_status::text,'0') = '0'
    and coalesce(role,'member') <> 'admin';

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$function$
