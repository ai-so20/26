CREATE OR REPLACE FUNCTION public.admin_add_gift_inventory(p_product_name text, p_gift_url text, p_amount integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception '관리자만 기프티콘을 등록할 수 있습니다.';
  end if;

  if nullif(trim(p_product_name),'') is null then
    raise exception '상품명을 입력해주세요.';
  end if;

  if p_amount < 3000 or p_amount > 50000 then
    raise exception '상품 금액은 3,000원 ~ 50,000원 사이여야 합니다.';
  end if;

  if p_gift_url !~ '^https://' then
    raise exception '기프티콘 링크는 https:// 로 시작해야 합니다.';
  end if;

  insert into public.gift_inventory(
    product_name, amount, gift_url, created_by
  )
  values(
    trim(p_product_name), p_amount, trim(p_gift_url), auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$function$
