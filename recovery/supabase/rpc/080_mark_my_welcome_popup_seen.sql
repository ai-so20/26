CREATE OR REPLACE FUNCTION public.mark_my_welcome_popup_seen()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  update public.profiles
  set welcome_popup_seen = true
  where id = auth.uid();

  return found;
end;
$function$
