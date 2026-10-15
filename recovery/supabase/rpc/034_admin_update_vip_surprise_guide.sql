CREATE OR REPLACE FUNCTION public.admin_update_vip_surprise_guide(p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'ADMIN_ONLY'; end if; update public.vip_surprise_guide set title=left(trim(p_title),100),body=left(p_body,10000),updated_at=now() where id=1; end; $function$
