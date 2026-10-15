create or replace function public.announce_vip_surprise_group_win()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_nickname text;v_type text;
begin
 if new.status <> 'running' or new.source_type <> 'real' or new.member_id is null or new.linked_to_ai_process_at is null then return new; end if;
 if tg_op='UPDATE' and old.status='running' then return new; end if;
 select nickname,reward_account_type into v_nickname,v_type from public.profiles where id=new.member_id;
 if coalesce(v_type,'real') <> 'real' then return new; end if;
 insert into public.group_messages(room_id,member_id,message_type,content,is_deleted)
 values('0a495a02-bcb8-4e38-b3ef-4e7059c2a883',null,'system','[VIP_SURPRISE_WIN]' || coalesce(nullif(trim(v_nickname),''),'VIP 회원'),false);
 return new;
end $$;
drop trigger if exists trg_vip_surprise_group_win on public.vip_surprise_process_runs;
create trigger trg_vip_surprise_group_win after update of status on public.vip_surprise_process_runs for each row execute function public.announce_vip_surprise_group_win();