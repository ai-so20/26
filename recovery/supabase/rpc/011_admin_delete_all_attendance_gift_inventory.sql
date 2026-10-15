CREATE OR REPLACE FUNCTION public.admin_delete_all_attendance_gift_inventory()
 RETURNS TABLE(deleted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_deleted integer := 0;
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 출석체크 지급대기 기프티콘을 삭제할 수 있습니다.';
  end if;

  delete from public.attendance_gift_inventory
  where status = 'available';

  get diagnostics v_deleted = row_count;
  return query select v_deleted;
end;
$function$
