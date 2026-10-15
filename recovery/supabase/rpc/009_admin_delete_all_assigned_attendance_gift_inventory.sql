CREATE OR REPLACE FUNCTION public.admin_delete_all_assigned_attendance_gift_inventory()
 RETURNS TABLE(deleted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_deleted integer := 0;
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 출석체크 지급완료 기프티콘을 삭제할 수 있습니다.';
  end if;

  -- 참조 테이블이 있더라도 FK가 ON DELETE SET NULL인 현재 구조에서는
  -- 지급 기록/1:1 메시지는 유지되고 재고 행만 정리됩니다.
  delete from public.attendance_gift_inventory
  where status = 'assigned';

  get diagnostics v_deleted = row_count;
  return query select v_deleted;
end;
$function$
