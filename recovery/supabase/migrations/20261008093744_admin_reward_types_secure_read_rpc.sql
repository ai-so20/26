create or replace function public.admin_get_reward_account_types()
returns table(member_id uuid,reward_account_type text)
language sql security definer set search_path=public as $$
 select p.id,coalesce(p.reward_account_type,'real')
 from public.profiles p
 where p.role='member' and exists (
  select 1 from public.profiles me
  where me.id=auth.uid() and me.role='admin' and me.approval_status='1'
 )
$$;
revoke all on function public.admin_get_reward_account_types() from public;
grant execute on function public.admin_get_reward_account_types() to authenticated;