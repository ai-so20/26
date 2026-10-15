CREATE OR REPLACE FUNCTION public.admin_delete_attendance_gift_inventory(p_gift_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 출석체크 기프티콘을 삭제할 수 있습니다.';
  end if;

  if not exists (
    select 1 from public.attendance_gift_inventory where id = p_gift_id
  ) then
    raise exception '삭제할 출석체크 기프티콘을 찾을 수 없습니다.';
  end if;

  update public.attendance_reward_deliveries
  set attendance_gift_id = null
  where attendance_gift_id = p_gift_id;

  delete from public.attendance_gift_inventory
  where id = p_gift_id;

  return found;
end;
$function$
