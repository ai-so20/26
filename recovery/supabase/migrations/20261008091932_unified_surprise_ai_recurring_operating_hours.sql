
create or replace function public.vip_surprise_operating_slot(p_base timestamptz, p_min_days integer, p_max_days integer)
returns timestamptz language plpgsql volatile as $$
declare v_local timestamp; v_days integer; v_minutes integer;
begin
 v_days:=p_min_days+floor(random()*(p_max_days-p_min_days+1))::integer;
 v_local:=((p_base at time zone 'Asia/Seoul')::date+v_days)::timestamp;
 v_minutes:=665+floor(random()*430)::integer;
 return (v_local+make_interval(mins=>v_minutes)) at time zone 'Asia/Seoul';
end $$;

create or replace function public.schedule_vip_member_surprise_on_approval()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz;v_finish timestamptz;
begin
 if new.role<>'member' or new.approval_status::text<>'1' or coalesce(new.reward_account_type,'real')<>'real' then return new;end if;
 if tg_op='UPDATE' and old.approval_status::text='1' then return new;end if;
 if exists(select 1 from public.vip_surprise_process_runs where member_id=new.id) then return new;end if;
 v_start:=public.vip_surprise_operating_slot(now(),2,3);
 v_finish:=public.vip_surprise_operating_slot(v_start,1,3);
 insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'real',1,'scheduled',10000,20000+floor(random()*10001)::integer,v_start,v_finish)
 on conflict(member_id,run_number) do nothing;
 return new;
end $$;

create or replace function public.vip_surprise_ai_gift_conversion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz;
begin
 if new.role<>'member' then return new;end if;
 if coalesce(new.reward_account_type,'real')=coalesce(old.reward_account_type,'real') then return new;end if;
 if new.reward_account_type='ai_gift' then
   update public.vip_surprise_process_runs set status='cancelled'
   where member_id=new.id and status='scheduled';
   if not exists(select 1 from public.vip_surprise_process_runs where member_id=new.id and status='running') then
     v_start:=public.vip_surprise_operating_slot(now(),2,3);
     insert into public.vip_surprise_process_runs(member_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
     values(new.id,'ai_gift',coalesce((select max(run_number)+1 from public.vip_surprise_process_runs where member_id=new.id),1),'scheduled',10000,20000+floor(random()*10001)::integer,v_start,public.vip_surprise_operating_slot(v_start,1,3));
   end if;
 elsif old.reward_account_type='ai_gift' then
   update public.vip_surprise_process_runs set status='cancelled' where member_id=new.id and status='scheduled' and source_type='ai_gift';
 end if;
 return new;
end $$;
drop trigger if exists trg_vip_surprise_ai_gift_conversion on public.profiles;
create trigger trg_vip_surprise_ai_gift_conversion after update of reward_account_type on public.profiles
for each row execute function public.vip_surprise_ai_gift_conversion();

create or replace function public.vip_surprise_ai_character_activation()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_start timestamptz;
begin
 if not new.is_active or (tg_op='UPDATE' and old.is_active) then return new;end if;
 if exists(select 1 from public.vip_surprise_process_runs where ai_character_id=new.id and status in ('scheduled','running')) then return new;end if;
 v_start:=public.vip_surprise_operating_slot(now(),2,3);
 insert into public.vip_surprise_process_runs(ai_character_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
 values(new.id,'ai_character',coalesce((select max(run_number)+1 from public.vip_surprise_process_runs where ai_character_id=new.id),1),'scheduled',10000,20000+floor(random()*10001)::integer,v_start,public.vip_surprise_operating_slot(v_start,1,3));
 return new;
end $$;
drop trigger if exists trg_vip_surprise_ai_character_activation on public.ai_characters;
create trigger trg_vip_surprise_ai_character_activation after insert or update of is_active on public.ai_characters
for each row execute function public.vip_surprise_ai_character_activation();

create or replace function public.advance_vip_surprise_processes()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run record;v_started int:=0;v_completed int:=0;v_now timestamptz:=now();v_kst time;
begin
 v_kst:=(v_now at time zone 'Asia/Seoul')::time;
 for v_run in select * from public.vip_surprise_process_runs where status='scheduled' and scheduled_start_at<=v_now order by scheduled_start_at for update skip locked loop
   if v_kst<time '11:00' or v_kst>=time '18:30' then continue;end if;
   if v_run.source_type='ai_character' then
     if not exists(select 1 from public.ai_characters where id=v_run.ai_character_id and is_active) then
       update public.vip_surprise_process_runs set status='cancelled' where id=v_run.id;continue;
     end if;
   else
     if not exists(select 1 from public.profiles where id=v_run.member_id and approval_status='1' and role='member' and coalesce(reward_account_type,'real')=v_run.source_type) then
       update public.vip_surprise_process_runs set status='cancelled' where id=v_run.id;continue;
     end if;
     insert into public.ai_process_members(user_id,available_count,status,investment_amount,target_mode,target_return,duration_hours,min_return,max_return,started_at,updated_at)
     values(v_run.member_id,0,'running',v_run.support_amount,'daily',v_run.final_balance-v_run.support_amount,24,v_run.final_balance-v_run.support_amount,v_run.final_balance-v_run.support_amount,v_now,v_now)
     on conflict(user_id) do update set status='running',investment_amount=excluded.investment_amount,target_mode=excluded.target_mode,target_return=excluded.target_return,duration_hours=excluded.duration_hours,min_return=excluded.min_return,max_return=excluded.max_return,started_at=excluded.started_at,completed_at=null,updated_at=v_now
     where ai_process_members.status not in ('running','waiting') and coalesce(ai_process_members.available_count,0)=0;
     if not found then continue;end if;
   end if;
   update public.vip_surprise_process_runs set status='running',started_at=v_now,linked_to_ai_process_at=v_now where id=v_run.id;
   v_started:=v_started+1;
 end loop;
 for v_run in select * from public.vip_surprise_process_runs where status='running' and scheduled_finish_at<=v_now order by scheduled_finish_at for update skip locked loop
   if v_kst<time '11:00' or v_kst>=time '18:30' then continue;end if;
   if v_run.source_type='ai_character' then
     update public.vip_surprise_process_runs set status='completed',finished_at=v_now where id=v_run.id;
     v_completed:=v_completed+1;
   else
     update public.ai_process_members set status='completed',completed_at=v_now,updated_at=v_now where user_id=v_run.member_id and status='running' and started_at>=v_run.linked_to_ai_process_at-interval '1 minute';
     if found then
       update public.vip_surprise_process_runs set status='completed',finished_at=v_now where id=v_run.id;
       v_completed:=v_completed+1;
     end if;
   end if;
 end loop;
 -- Recurring AI runs are created only after the previous run finishes.
 for v_run in select * from public.vip_surprise_process_runs where status='completed' and source_type in ('ai_character','ai_gift') and not exists(
   select 1 from public.vip_surprise_process_runs n where n.source_type=vip_surprise_process_runs.source_type and
   ((n.ai_character_id is not null and n.ai_character_id=vip_surprise_process_runs.ai_character_id) or (n.member_id is not null and n.member_id=vip_surprise_process_runs.member_id))
   and n.run_number>vip_surprise_process_runs.run_number
 ) for update skip locked loop
   if v_run.source_type='ai_character' and not exists(select 1 from public.ai_characters where id=v_run.ai_character_id and is_active) then continue;end if;
   if v_run.source_type='ai_gift' and not exists(select 1 from public.profiles where id=v_run.member_id and reward_account_type='ai_gift' and approval_status='1') then continue;end if;
   declare v_next timestamptz;begin
     v_next:=public.vip_surprise_operating_slot(coalesce(v_run.finished_at,v_now),2,3);
     insert into public.vip_surprise_process_runs(member_id,ai_character_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
     values(v_run.member_id,v_run.ai_character_id,v_run.source_type,v_run.run_number+1,'scheduled',10000,20000+floor(random()*10001)::integer,v_next,public.vip_surprise_operating_slot(v_next,1,3))
     on conflict do nothing;
   end;
 end loop;
 return jsonb_build_object('started',v_started,'completed',v_completed);
end $$;

create or replace function public.announce_vip_surprise_group_win()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
 if new.status<>'running' or new.linked_to_ai_process_at is null or (tg_op='UPDATE' and old.status='running') then return new;end if;
 if new.source_type='ai_character' then
   select nickname into v_name from public.ai_characters where id=new.ai_character_id;
 else
   select nickname into v_name from public.profiles where id=new.member_id;
 end if;
 if v_name is null then return new;end if;
 insert into public.group_messages(room_id,member_id,message_type,content,is_deleted)
 values('0a495a02-bcb8-4e38-b3ef-4e7059c2a883',null,'system','[VIP_SURPRISE_WIN]'||v_name,false);
 return new;
end $$;

create or replace function public.announce_vip_surprise_completion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
 if new.status<>'completed' or old.status='completed' or new.completion_group_announced_at is not null then return new;end if;
 if new.source_type='ai_character' then select nickname into v_name from public.ai_characters where id=new.ai_character_id;
 else select nickname into v_name from public.profiles where id=new.member_id;end if;
 if v_name is null then return new;end if;
 insert into public.group_messages(room_id,member_id,message_type,content,is_deleted)
 values('0a495a02-bcb8-4e38-b3ef-4e7059c2a883',null,'system','[VIP_SURPRISE_COMPLETE]'||v_name,false);
 update public.vip_surprise_process_runs set completion_group_announced_at=now() where id=new.id and completion_group_announced_at is null;
 return new;
end $$;

-- Initial cohort: schedule already-active AI characters from the rollout time.
insert into public.vip_surprise_process_runs(ai_character_id,source_type,run_number,status,support_amount,final_balance,scheduled_start_at,scheduled_finish_at)
select a.id,'ai_character',1,'scheduled',10000,20000+floor(random()*10001)::integer,s.start_at,public.vip_surprise_operating_slot(s.start_at,1,3)
from public.ai_characters a
cross join lateral (select public.vip_surprise_operating_slot(now(),2,3) as start_at where a.id is not null) s
where a.is_active and not exists(select 1 from public.vip_surprise_process_runs r where r.ai_character_id=a.id)
on conflict do nothing;
