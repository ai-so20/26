CREATE OR REPLACE FUNCTION public.normalize_auto_event_minute_times()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.auto_event = true then
    if new.starts_at is not null then
      new.starts_at := date_trunc('minute', new.starts_at);
    end if;
    if new.ends_at is not null then
      new.ends_at := date_trunc('minute', new.ends_at);
    end if;
  end if;
  return new;
end;
$function$
