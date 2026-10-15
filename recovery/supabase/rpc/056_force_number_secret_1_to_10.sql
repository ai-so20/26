CREATE OR REPLACE FUNCTION public.force_number_secret_1_to_10()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_type text;
begin
  select e.event_type
  into v_type
  from public.events e
  where e.id = new.event_id;

  if v_type = 'number' then
    new.secret_answer := (1 + floor(random() * 10)::integer)::text;
  end if;

  return new;
end;
$function$
