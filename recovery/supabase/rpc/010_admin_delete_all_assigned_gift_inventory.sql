CREATE OR REPLACE FUNCTION public.admin_delete_all_assigned_gift_inventory()
 RETURNS TABLE(deleted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_deleted integer := 0;
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 일반 이벤트 지급완료 기프티콘을 삭제할 수 있습니다.';
  end if;

  -- event_reward_deliveries가 gift_inventory를 참조하므로 먼저 연결만 해제합니다.
  update public.event_reward_deliveries
  set gift_id = null,
      updated_at = now()
  where gift_id in (
    select id from public.gift_inventory where status = 'assigned'
  );

  delete from public.gift_inventory
  where status = 'assigned';

  get diagnostics v_deleted = row_count;
  return query select v_deleted;
end;
$function$
