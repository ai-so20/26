CREATE OR REPLACE FUNCTION public.admin_update_vip_surprise_copy(p_group_start_title text, p_group_start_body text, p_group_complete_title text, p_group_complete_body text, p_private_start_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자 전용'; end if;
 update public.vip_surprise_copy_settings set
 group_start_title=left(coalesce(p_group_start_title,''),250),
 group_start_body=left(coalesce(p_group_start_body,''),700),
 group_complete_title=left(coalesce(p_group_complete_title,''),250),
 group_complete_body=left(coalesce(p_group_complete_body,''),700),
 private_start_body=left(coalesce(p_private_start_body,''),1800),updated_at=now() where id=1;
end $function$
