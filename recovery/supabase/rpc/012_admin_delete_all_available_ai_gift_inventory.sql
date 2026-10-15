CREATE OR REPLACE FUNCTION public.admin_delete_all_available_ai_gift_inventory()
 RETURNS TABLE(deleted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer := 0;
begin
  if not public.is_ai_gift_admin() then
    raise exception '관리자만 AI 전용 당첨상품을 삭제할 수 있습니다.';
  end if;

  delete from public.ai_gift_inventory
  where status = 'available';

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$function$
