create or replace function public.admin_save_ai_process_member_preserving_profit(p_user_id uuid,p_available_count integer,p_status text,p_investment_amount numeric,p_duration_hours integer,p_min_return numeric,p_max_return numeric,p_anchor_profit numeric)
returns public.ai_process_members language plpgsql security definer set search_path=public as $$
declare v_old public.ai_process_members; v_new public.ai_process_members;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'ADMIN_ONLY'; end if;
 select * into v_old from public.ai_process_members where user_id=p_user_id for update;
 if v_old.status='running' and p_status='running' and (v_old.min_return is distinct from p_min_return or v_old.max_return is distinct from p_max_return or v_old.duration_hours is distinct from p_duration_hours or v_old.investment_amount is distinct from p_investment_amount) then
   if p_anchor_profit is null or p_anchor_profit<0 then raise exception 'ANCHOR_REQUIRED'; end if;
   update public.ai_process_members set profit_anchor=p_anchor_profit,profit_anchor_at=now() where user_id=p_user_id;
 end if;
 v_new:=public.admin_save_ai_process_member(p_user_id,p_available_count,p_status,p_investment_amount,p_duration_hours,p_min_return,p_max_return);
 if v_old.status is distinct from 'running' and p_status='running' then
   update public.ai_process_members set profit_anchor=null,profit_anchor_at=null,profit_adjustment=0 where user_id=p_user_id returning * into v_new;
 elsif p_status='ready' then
   update public.ai_process_members set profit_anchor=null,profit_anchor_at=null,profit_adjustment=0 where user_id=p_user_id returning * into v_new;
 end if;
 return v_new;
end $$;
revoke all on function public.admin_save_ai_process_member_preserving_profit(uuid,integer,text,numeric,integer,numeric,numeric,numeric) from public;
grant execute on function public.admin_save_ai_process_member_preserving_profit(uuid,integer,text,numeric,integer,numeric,numeric,numeric) to authenticated;