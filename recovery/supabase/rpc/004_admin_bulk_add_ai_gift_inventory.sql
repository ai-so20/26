CREATE OR REPLACE FUNCTION public.admin_bulk_add_ai_gift_inventory(p_product_names text[])
 RETURNS TABLE(inserted_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_name text;
  v_count integer := 0;
begin
  if not public.is_ai_gift_admin() then
    raise exception '관리자만 AI 전용 당첨상품을 등록할 수 있습니다.';
  end if;

  if coalesce(array_length(p_product_names, 1), 0) > 1000 then
    raise exception '한 번에 최대 1,000개까지 등록할 수 있습니다.';
  end if;

  foreach v_name in array coalesce(p_product_names, array[]::text[])
  loop
    v_name := trim(coalesce(v_name, ''));
    if v_name <> '' then
      if char_length(v_name) > 120 then
        raise exception '상품명은 120자 이내여야 합니다.';
      end if;

      insert into public.ai_gift_inventory(product_name, created_by)
      values(v_name, auth.uid());

      v_count := v_count + 1;
    end if;
  end loop;

  return query select v_count;
end;
$function$
