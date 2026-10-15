CREATE OR REPLACE FUNCTION public.set_group_chat_frozen_system(target_room_id uuid, frozen boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.room_chat_settings(room_id, is_frozen, updated_at, updated_by)
  values(target_room_id, frozen, now(), null)
  on conflict(room_id) do update
  set is_frozen = excluded.is_frozen,
      updated_at = now(),
      updated_by = null;

  return frozen;
end;
$function$
