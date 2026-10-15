CREATE OR REPLACE FUNCTION public.get_admin_private_chats()
 RETURNS TABLE(chat_id uuid, member_id uuid, nickname text, avatar text, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    pc.id,
    pc.member_id,
    p.nickname,
    p.avatar,
    pc.status,
    pc.created_at,
    pc.updated_at
  from public.private_chats pc
  join public.profiles p
    on p.id = pc.member_id
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
  order by pc.updated_at desc;
$function$
