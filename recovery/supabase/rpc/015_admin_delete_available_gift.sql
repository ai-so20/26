CREATE OR REPLACE FUNCTION public.admin_delete_available_gift(p_gift_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 기프티콘을 삭제할 수 있습니다.';
  end if;

  delete from public.gift_inventory
  where id = p_gift_id
    and status = 'available';

  return found;
end;
$function$
