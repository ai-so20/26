create or replace function public.admin_update_vip_surprise_settings(p_completion_message text,p_action_label text,p_action_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자 전용'; end if;
 insert into public.vip_surprise_settings(id,completion_message,action_label,action_url,updated_at)
 values(1,left(coalesce(p_completion_message,''),500),left(coalesce(p_action_label,''),80),left(coalesce(p_action_url,''),500),now())
 on conflict(id) do update set completion_message=excluded.completion_message,action_label=excluded.action_label,action_url=excluded.action_url,updated_at=now();
end $$;
revoke all on function public.admin_update_vip_surprise_settings(text,text,text) from public;
grant execute on function public.admin_update_vip_surprise_settings(text,text,text) to authenticated;