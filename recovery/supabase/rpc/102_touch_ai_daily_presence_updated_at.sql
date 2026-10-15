CREATE OR REPLACE FUNCTION public.touch_ai_daily_presence_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
