CREATE OR REPLACE FUNCTION public.admin_get_member_push_statuses()
 RETURNS TABLE(member_id uuid, push_enabled boolean, device_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  return query
  select
    p.id as member_id,
    (count(ps.id) > 0) as push_enabled,
    count(ps.id)::bigint as device_count
  from public.profiles p
  left join public.push_subscriptions ps
    on ps.user_id = p.id
  where p.role <> 'admin'
  group by p.id;
end;
$function$
