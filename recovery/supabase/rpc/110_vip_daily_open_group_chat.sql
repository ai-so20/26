CREATE OR REPLACE FUNCTION public.vip_daily_open_group_chat()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.set_group_chat_frozen_system(
    '0a495a02-bcb8-4e38-b3ef-4e7059c2a883'::uuid,
    false
  );
end;
$function$
