CREATE OR REPLACE FUNCTION public.get_admin_approval_list()
 RETURNS TABLE(member_id uuid, nickname text, real_name text, avatar text, approval_status text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.nickname,
    p.real_name,
    coalesce(p.avatar, 'vip_01'),
    coalesce(p.approval_status::text, '0'),
    p.created_at
  from public.profiles p
  where coalesce(p.role, 'member') <> 'admin'
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role = 'admin'
        and me.approval_status::text = '1'
    )
  order by p.created_at desc nulls last;
$function$
