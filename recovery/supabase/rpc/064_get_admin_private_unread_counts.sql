CREATE OR REPLACE FUNCTION public.get_admin_private_unread_counts()
 RETURNS TABLE(chat_id uuid, unread_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pc.id,
    count(pm.id)
  from public.private_chats pc
  join public.profiles p
    on p.id = pc.member_id
  left join public.private_messages pm
    on pm.chat_id = pc.id
   and pm.sender_id = pc.member_id
   and pm.is_read = false
   and pm.is_deleted = false
  where pc.operator_id = auth.uid()
    and pc.status = 'open'
    and p.show_in_admin_chat = true
    and coalesce(p.role, 'member') <> 'admin'
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role = 'admin'
        and me.approval_status::text in ('1','approved')
    )
  group by pc.id;
$function$
