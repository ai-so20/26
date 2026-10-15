CREATE OR REPLACE FUNCTION public.admin_update_event_winner_footer(p_footer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text in ('1','approved')) then
    raise exception '관리자 전용';
  end if;
  update public.vip_surprise_copy_settings
  set event_winner_footer=left(trim(coalesce(p_footer,'')),250), updated_at=now()
  where id=1;
end;
$function$
