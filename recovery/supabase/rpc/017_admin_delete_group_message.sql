CREATE OR REPLACE FUNCTION public.admin_delete_group_message(target_message_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 메시지를 삭제할 수 있습니다.';
  end if;

  delete from public.group_messages
  where id = target_message_id;
end;
$function$
