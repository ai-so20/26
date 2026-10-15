CREATE OR REPLACE FUNCTION public.guard_virtual_reward_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if exists(select 1 from public.ai_characters where id=new.assigned_member_id)
    or exists(select 1 from public.profiles where id=new.assigned_member_id and reward_account_type='virtual') then
   raise exception 'AI/가상 계정에는 실제 상품을 지급할 수 없습니다';
 end if;
 return new;
end $function$
