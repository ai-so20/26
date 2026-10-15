CREATE OR REPLACE FUNCTION public.admin_get_attendance_gift_inventory()
 RETURNS TABLE(id uuid, queue_no bigint, product_name text, amount integer, gift_url text, status text, assigned_member_id uuid, assigned_member_nickname text, assigned_milestone_count integer, assigned_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 출석체크 기프티콘 재고를 조회할 수 있습니다.';
  end if;

  return query
  select
    gi.id,
    gi.queue_no,
    gi.product_name,
    gi.amount,
    gi.gift_url,
    gi.status,
    gi.assigned_member_id,
    coalesce(p.nickname, m.nickname)::text,
    gi.assigned_milestone_count,
    gi.assigned_at,
    gi.created_at
  from public.attendance_gift_inventory gi
  left join public.profiles p on p.id = gi.assigned_member_id
  left join public.members m on m.id = gi.assigned_member_id
  order by
    case when gi.status = 'available' then 0 else 1 end,
    case when gi.status = 'available' then gi.queue_no end asc nulls last,
    gi.assigned_at desc nulls last,
    gi.created_at desc;
end;
$function$
