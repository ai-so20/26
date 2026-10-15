CREATE OR REPLACE FUNCTION public.admin_bulk_add_gift_inventory(p_items jsonb)
 RETURNS TABLE(inserted_count integer, skipped_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item jsonb;
  v_name text;
  v_url text;
  v_amount integer;
  v_inserted integer := 0;
  v_skipped integer := 0;
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 기프티콘을 등록할 수 있습니다.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception '등록할 기프티콘 목록이 없습니다.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_name := trim(coalesce(v_item->>'product_name', ''));
    v_url := trim(coalesce(v_item->>'gift_url', ''));
    v_amount := nullif(regexp_replace(coalesce(v_item->>'amount',''), '[^0-9]', '', 'g'), '')::integer;

    if v_name = '' then
      raise exception '상품명이 비어 있는 줄이 있습니다.';
    end if;

    if v_amount is null or v_amount < 3000 or v_amount > 200000 then
      raise exception '상품 금액은 3,000원 ~ 200,000원 사이여야 합니다.';
    end if;

    if v_url !~ '^https://' then
      raise exception '모든 기프티콘 링크는 https:// 로 시작해야 합니다.';
    end if;

    insert into public.gift_inventory(product_name, amount, gift_url, status, created_by)
    values(v_name, v_amount, v_url, 'available', auth.uid())
    on conflict (gift_url) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return query select v_inserted, v_skipped;
end;
$function$
