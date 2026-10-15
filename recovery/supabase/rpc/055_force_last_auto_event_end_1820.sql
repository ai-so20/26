CREATE OR REPLACE FUNCTION public.force_last_auto_event_end_1820()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.auto_event = true and new.round_number = 20 then
    new.ends_at :=
      (new.schedule_date::timestamp + time '18:20')
      at time zone 'Asia/Seoul';
  end if;
  return new;
end;
$function$
