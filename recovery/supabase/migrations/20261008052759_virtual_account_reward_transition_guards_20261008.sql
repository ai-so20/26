create or replace function public.admin_set_reward_account_type(p_member_id uuid,p_account_type text)
returns text language plpgsql security definer set search_path=public as $$
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
end $$;
create or replace function public.schedule_vip_member_surprise_on_approval()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz;
begin
 if new.role<>'member' or new.approval_status::text<>'1' or coalesce(new.reward_account_type,'real')<>'real' then return new;end if;
 if tg_op='UPDATE' and old.approval_status::text='1' then return new;end if;
 if exists(select 1 from public.vip_surprise_process_runs where member_id=new.id) then return new;end if;
 v_start:=greatest(now(),new.created_at+interval '2 days 12 hours');
 insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'real',1,'scheduled',10000,25000,v_start,v_start+interval '1 day')
 on conflict(member_id,run_number) do nothing;
 return new;
end $$;
create or replace function public.guard_virtual_reward_delivery()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.ai_characters where id=new.assigned_member_id)
    or exists(select 1 from public.profiles where id=new.assigned_member_id and reward_account_type='virtual') then
   raise exception 'AI/가상 계정에는 실제 상품을 지급할 수 없습니다';
 end if;
 return new;
end $$;
drop trigger if exists trg_guard_virtual_gift_assignment on public.gift_inventory;
create trigger trg_guard_virtual_gift_assignment before insert or update of assigned_member_id on public.gift_inventory for each row when (new.assigned_member_id is not null) execute function public.guard_virtual_reward_delivery();
drop trigger if exists trg_guard_virtual_attendance_assignment on public.attendance_gift_inventory;
create trigger trg_guard_virtual_attendance_assignment before insert or update of assigned_member_id on public.attendance_gift_inventory for each row when (new.assigned_member_id is not null) execute function public.guard_virtual_reward_delivery();