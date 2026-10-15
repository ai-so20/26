CREATE OR REPLACE FUNCTION public.get_chat_member_directory()
 RETURNS TABLE(id uuid, nickname text, avatar text, role text, member_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.nickname,
    coalesce(p.avatar, 'vip_01') as avatar,
    coalesce(p.role, 'member') as role,
    'member'::text as member_type
  from public.profiles p
  where p.approval_status = '1'
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.approval_status = '1'
    )

  union all

  select
    a.id,
    a.nickname as nickname,
    coalesce(a.avatar, 'vip_01') as avatar,
    'ai'::text as role,
    'ai'::text as member_type
  from public.ai_characters a
  where a.is_active = true
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.approval_status = '1'
    );
$function$
