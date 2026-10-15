CREATE OR REPLACE FUNCTION public.admin_delete_gift_inventory(p_gift_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_approval text;
begin
  select p.role::text, p.approval_status::text
  into v_role, v_approval
  from public.profiles p
  where p.id = auth.uid();

  if coalesce(v_role, '') <> 'admin'
     or coalesce(v_approval, '') not in ('1', 'approved') then
    raise exception '관리자만 기프티콘 내역을 삭제할 수 있습니다.';
  end if;

  if not exists (
    select 1
    from public.gift_inventory gi
    where gi.id = p_gift_id
  ) then
    raise exception '삭제할 기프티콘을 찾을 수 없습니다.';
  end if;

  delete from public.gift_inventory
  where id = p_gift_id;

  return found;
end;
$function$
