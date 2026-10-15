CREATE OR REPLACE FUNCTION public.set_group_chat_frozen(target_room_id uuid, frozen boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approval_status = '1'
  ) then
    raise exception '관리자만 변경할 수 있습니다.';
  end if;

  insert into public.room_chat_settings(room_id, is_frozen, updated_at, updated_by)
  values(target_room_id, frozen, now(), auth.uid())
  on conflict (room_id) do update
  set is_frozen = excluded.is_frozen,
      updated_at = now(),
      updated_by = auth.uid();

  return frozen;
end;
$function$
