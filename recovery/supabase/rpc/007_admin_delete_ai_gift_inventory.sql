CREATE OR REPLACE FUNCTION public.admin_delete_ai_gift_inventory(p_gift_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_ai_gift_admin() then
    raise exception '관리자만 AI 전용 당첨상품을 삭제할 수 있습니다.';
  end if;

  delete from public.ai_gift_inventory
  where id = p_gift_id;

  return found;
end;
$function$
