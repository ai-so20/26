CREATE OR REPLACE FUNCTION public.cleanup_old_ai_daily_presence()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.ai_daily_presence
  where activity_date < ((now() at time zone 'Asia/Seoul')::date - 35);
end;
$function$
