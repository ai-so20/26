CREATE OR REPLACE FUNCTION public.append_event_winner_footer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_footer text;
begin
  if new.message_type = 'event'
    and new.content like '🎉 VIP EVENT · 당첨 안내%'
    and new.content like '%🏆%'
  then
    select event_winner_footer into v_footer from public.vip_surprise_copy_settings where id=1;
    if nullif(trim(coalesce(v_footer,'')),'') is not null
       and position(v_footer in new.content)=0 then
      new.content := rtrim(new.content) || E'\n\n' || v_footer;
    end if;
  end if;
  return new;
end;
$function$
