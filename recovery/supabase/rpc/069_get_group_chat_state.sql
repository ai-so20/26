CREATE OR REPLACE FUNCTION public.get_group_chat_state(target_room_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select is_frozen from public.room_chat_settings where room_id = target_room_id), false);
$function$
