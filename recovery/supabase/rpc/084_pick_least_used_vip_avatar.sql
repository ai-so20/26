CREATE OR REPLACE FUNCTION public.pick_least_used_vip_avatar()
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with avatar_pool as (
    select 'vip_' || lpad(gs::text, 2, '0') as avatar
    from generate_series(1, 50) gs
  ),
  usage_count as (
    select
      a.avatar,
      count(p.id) filter (
        where p.approval_status::text in ('1','approved')
          and coalesce(p.role::text, '') <> 'admin'
          and p.avatar = a.avatar
      )::bigint as used_count
    from avatar_pool a
    left join public.profiles p on p.avatar = a.avatar
    group by a.avatar
  ),
  minimum_usage as (
    select min(used_count) as min_count
    from usage_count
  )
  select u.avatar
  from usage_count u
  cross join minimum_usage m
  where u.used_count = m.min_count
  order by random()
  limit 1;
$function$
