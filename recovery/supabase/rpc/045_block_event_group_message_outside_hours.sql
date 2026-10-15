CREATE OR REPLACE FUNCTION public.block_event_group_message_outside_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_kst_time time;
begin
  if new.message_type = 'event' then
    v_kst_time := (now() at time zone 'Asia/Seoul')::time;

    if v_kst_time < time '11:00'
       or v_kst_time >= time '18:30' then
      return null;
    end if;
  end if;

  return new;
end;
$function$
