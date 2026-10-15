CREATE OR REPLACE FUNCTION public.admin_get_ai_gift_inventory()
 RETURNS TABLE(id uuid, queue_no bigint, product_name text, status text, assigned_event_id uuid, assigned_winner_id uuid, assigned_winner_nickname text, assigned_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_ai_gift_admin() then
    raise exception '관리자만 AI 전용 당첨상품을 조회할 수 있습니다.';
  end if;

  return query
  select
    g.id,
    g.queue_no,
    g.product_name,
    g.status,
    g.assigned_event_id,
    g.assigned_winner_id,
    a.nickname::text,
    g.assigned_at,
    g.created_at
  from public.ai_gift_inventory g
  left join public.ai_characters a on a.id = g.assigned_winner_id
  order by
    case when g.status = 'available' then 0 else 1 end,
    case when g.status = 'available' then g.queue_no end asc nulls last,
    g.assigned_at desc nulls last,
    g.created_at desc;
end;
$function$
