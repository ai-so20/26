CREATE OR REPLACE FUNCTION public.admin_adjust_ai_process_profit(p_user_id uuid, p_amount numeric)
 RETURNS ai_process_members
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.ai_process_members;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'ADMIN_ONLY'; end if;
 if p_amount is null or p_amount=0 or abs(p_amount)>1000000000 then raise exception 'INVALID_AMOUNT'; end if;
 select * into v from public.ai_process_members where user_id=p_user_id for update;
 if not found or v.status<>'running' then raise exception 'NOT_RUNNING'; end if;
 update public.ai_process_members set profit_adjustment=coalesce(profit_adjustment,0)+p_amount,updated_at=now() where user_id=p_user_id returning * into v;
 insert into public.ai_process_profit_adjustments(user_id,admin_id,amount) values(p_user_id,auth.uid(),p_amount);
 return v;
end $function$
