CREATE OR REPLACE FUNCTION public.admin_bulk_add_attendance_gift_inventory(p_items jsonb)
 RETURNS TABLE(inserted_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_input_count integer := 0;
  v_inserted_count integer := 0;
begin
  if not public.is_vip_admin() then
    raise exception '관리자만 출석체크 기프티콘을 등록할 수 있습니다.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception '기프티콘 목록 형식이 올바르지 않습니다.';
  end if;

  v_input_count := jsonb_array_length(p_items);

  if v_input_count = 0 then
    return query select 0, 0;
    return;
  end if;

  if v_input_count > 1000 then
    raise exception '한 번의 DB 요청에는 최대 1,000개까지 등록할 수 있습니다.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      product_name text,
      amount integer,
      gift_url text
    )
    where nullif(btrim(x.product_name), '') is null
       or x.amount is null
       or x.amount < 3000
       or x.amount > 200000
       or nullif(btrim(x.gift_url), '') is null
       or btrim(x.gift_url) !~* '^https://'
  ) then
    raise exception '상품명/금액/링크를 확인해주세요. 금액은 3,000원~200,000원, 링크는 https:// 로 시작해야 합니다.';
  end if;

  with normalized as (
    select distinct on (btrim(x.gift_url))
      btrim(x.product_name) as product_name,
      x.amount,
      btrim(x.gift_url) as gift_url
    from jsonb_to_recordset(p_items) as x(
      product_name text,
      amount integer,
      gift_url text
    )
    order by btrim(x.gift_url)
  ),
  inserted as (
    insert into public.attendance_gift_inventory(
      product_name, amount, gift_url, status
    )
    select
      n.product_name, n.amount, n.gift_url, 'available'
    from normalized n
    on conflict(gift_url) do nothing
    returning id
  )
  select count(*)::integer
  into v_inserted_count
  from inserted;

  return query
  select
    v_inserted_count,
    (v_input_count - v_inserted_count)::integer;
end;
$function$
