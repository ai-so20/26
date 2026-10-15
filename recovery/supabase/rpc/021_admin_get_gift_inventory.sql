CREATE OR REPLACE FUNCTION public.admin_get_gift_inventory()
 RETURNS TABLE(id uuid, product_name text, amount integer, status text, assigned_member_id uuid, assigned_member_nickname text, assigned_event_id uuid, assigned_at timestamp with time zone, created_at timestamp with time zone, queue_no bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 기프티콘 재고를 확인할 수 있습니다.';
  end if;

  return query
  select
    g.id,
    g.product_name,
    g.amount,
    g.status,
    g.assigned_member_id,
    p.nickname as assigned_member_nickname,
    g.assigned_event_id,
    g.assigned_at,
    g.created_at,
    g.queue_no
  from public.gift_inventory g
  left join public.profiles p
    on p.id = g.assigned_member_id
  order by
    case when g.status = 'available' then 0 else 1 end,
    case when g.status = 'available' then g.queue_no end asc nulls last,
    g.assigned_at desc nulls last,
    g.queue_no desc nulls last
  limit 500;
end;
$function$
