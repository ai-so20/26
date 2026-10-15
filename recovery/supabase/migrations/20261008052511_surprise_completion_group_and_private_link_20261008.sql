alter table public.vip_surprise_process_runs add column if not exists completion_group_announced_at timestamptz;
create or replace function public.send_vip_surprise_completion_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_chat record;v_settings record;v_content text;v_account text;v_url text;
begin
 if new.status<>'completed' or new.source_type<>'real' or new.member_id is null or new.completion_message_sent_at is not null then return new;end if;
 if tg_op='UPDATE' and old.status='completed' then return new;end if;
 select reward_account_type into v_account from public.profiles where id=new.member_id;
 if coalesce(v_account,'real')<>'real' then return new;end if;
 select * into v_settings from public.vip_surprise_settings where id=1;
 v_content:=trim(coalesce(v_settings.completion_message,''));
 if v_content='' then return new;end if;
 select pc.id,pc.operator_id into v_chat from public.private_chats pc where pc.member_id=new.member_id order by pc.created_at desc limit 1;
 if v_chat.id is null or v_chat.operator_id is null then return new;end if;
 v_url:=trim(coalesce(v_settings.action_url,''));
 if v_url ~* '^https://[^[:space:]]+$' then
   v_content:='[[LINK_BUTTON]]'||jsonb_build_object('text',v_content,'button_text',coalesce(nullif(trim(v_settings.action_label),''),'안내 확인하기'),'button_url',v_url)::text;
 end if;
 insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
 values(v_chat.id,v_chat.operator_id,'text',v_content,false,false);
 new.completion_message_sent_at:=now();
 return new;
end $$;
create or replace function public.announce_vip_surprise_completion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_nickname text;v_type text;
begin
 if new.status<>'completed' or old.status='completed' or new.source_type<>'real' or new.member_id is null or new.completion_group_announced_at is not null then return new;end if;
 select nickname,reward_account_type into v_nickname,v_type from public.profiles where id=new.member_id;
 if coalesce(v_type,'real')<>'real' then return new;end if;
 insert into public.group_messages(room_id,member_id,message_type,content,is_deleted)
 values('0a495a02-bcb8-4e38-b3ef-4e7059c2a883',null,'system','[VIP_SURPRISE_COMPLETE]'||coalesce(nullif(trim(v_nickname),''),'VIP 회원'),false);
 update public.vip_surprise_process_runs set completion_group_announced_at=now() where id=new.id and completion_group_announced_at is null;
 return new;
end $$;
drop trigger if exists trg_vip_surprise_completion_group on public.vip_surprise_process_runs;
create trigger trg_vip_surprise_completion_group after update of status on public.vip_surprise_process_runs for each row execute function public.announce_vip_surprise_completion();