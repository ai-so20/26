alter table public.ai_process_members add column if not exists profit_anchor numeric, add column if not exists profit_anchor_at timestamptz, add column if not exists profit_adjustment numeric not null default 0;
create table if not exists public.ai_process_profit_adjustments(id bigint generated always as identity primary key,user_id uuid not null,admin_id uuid not null,amount numeric not null,created_at timestamptz not null default now());
alter table public.ai_process_profit_adjustments enable row level security;
revoke all on public.ai_process_profit_adjustments from anon,authenticated;
create or replace function public.admin_adjust_ai_process_profit(p_user_id uuid,p_amount numeric)
returns public.ai_process_members language plpgsql security definer set search_path=public as $$
declare v public.ai_process_members;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'ADMIN_ONLY'; end if;
 if p_amount is null or p_amount=0 or abs(p_amount)>1000000000 then raise exception 'INVALID_AMOUNT'; end if;
 select * into v from public.ai_process_members where user_id=p_user_id for update;
 if not found or v.status<>'running' then raise exception 'NOT_RUNNING'; end if;
 update public.ai_process_members set profit_adjustment=coalesce(profit_adjustment,0)+p_amount,updated_at=now() where user_id=p_user_id returning * into v;
 insert into public.ai_process_profit_adjustments(user_id,admin_id,amount) values(p_user_id,auth.uid(),p_amount);
 return v;
end $$;
revoke all on function public.admin_adjust_ai_process_profit(uuid,numeric) from public;
grant execute on function public.admin_adjust_ai_process_profit(uuid,numeric) to authenticated;