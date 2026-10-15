CREATE OR REPLACE FUNCTION public.get_admin_member_list()
 RETURNS TABLE(member_id uuid, nickname text, avatar text, chat_id uuid, chat_status text, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,p.nickname,p.avatar,pc.id,pc.status,pc.updated_at
  from public.profiles p
  left join public.private_chats pc on pc.member_id=p.id
  where p.approval_status='1'
    and coalesce(p.role,'member')<>'admin'
    and p.show_in_admin_chat=true
    and exists(select 1 from public.profiles me
      where me.id=auth.uid() and me.role='admin' and me.approval_status='1')
  order by p.created_at desc;
$function$
