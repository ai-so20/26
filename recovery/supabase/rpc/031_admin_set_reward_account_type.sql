CREATE OR REPLACE FUNCTION public.admin_set_reward_account_type(p_member_id uuid, p_account_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_old text;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text='1') then raise exception '관리자만 변경할 수 있습니다';end if;
 if p_account_type not in ('real','virtual') then raise exception '지원하지 않는 계정 유형입니다';end if;
 select reward_account_type into v_old from public.profiles where id=p_member_id and role='member' for update;
 if not found then raise exception '대상 회원을 찾을 수 없습니다';end if;
 if coalesce(v_old,'real')=p_account_type then return p_account_type;end if;
 update public.profiles set reward_account_type=p_account_type where id=p_member_id;
 if p_account_type='virtual' then
   update public.vip_surprise_process_runs set status='cancelled'
   where member_id=p_member_id and source_type='real' and status='scheduled';
 end if;
 return p_account_type;
end $function$
