CREATE OR REPLACE FUNCTION public.admin_delete_all_assigned_ai_gift_inventory()
 RETURNS TABLE(deleted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_deleted integer := 0;
begin
  if not public.is_ai_gift_admin() then
    raise exception '관리자만 AI 전용 공지완료 상품을 삭제할 수 있습니다.';
  end if;

  delete from public.ai_gift_inventory
  where status = 'assigned';

  get diagnostics v_deleted = row_count;
  return query select v_deleted;
end;
$function$
