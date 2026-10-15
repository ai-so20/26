CREATE OR REPLACE FUNCTION public.set_my_avatar(new_avatar text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new_avatar not in (
    'vip_01',
    'vip_02',
    'vip_03',
    'vip_04',
    'vip_05',
    'vip_06'
  ) then
    raise exception 'Invalid avatar';
  end if;

  update public.profiles
  set avatar = new_avatar
  where id = auth.uid()
    and approval_status = '1';

  if not found then
    raise exception 'Approved profile not found';
  end if;
end;
$function$
