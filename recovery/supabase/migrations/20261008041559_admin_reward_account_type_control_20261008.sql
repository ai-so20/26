create or replace function public.admin_set_reward_account_type(p_member_id uuid,p_account_type text)
returns text language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자만 변경할 수 있습니다'; end if;
 if p_account_type not in ('real','virtual') then raise exception '지원하지 않는 계정 유형입니다'; end if;
 if not exists(select 1 from public.profiles where id=p_member_id and role is distinct from 'admin') then raise exception '대상 회원을 찾을 수 없습니다'; end if;
 update public.profiles set reward_account_type=p_account_type where id=p_member_id;
 return p_account_type;
end $$;
revoke all on function public.admin_set_reward_account_type(uuid,text) from public;
grant execute on function public.admin_set_reward_account_type(uuid,text) to authenticated;