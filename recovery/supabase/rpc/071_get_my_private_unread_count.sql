CREATE OR REPLACE FUNCTION public.get_my_private_unread_count()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)
  from public.private_messages pm
  join public.private_chats pc
    on pc.id = pm.chat_id
  where pc.member_id = auth.uid()
    and pm.sender_id <> auth.uid()
    and pm.is_read = false
    and pm.is_deleted = false;
$function$
