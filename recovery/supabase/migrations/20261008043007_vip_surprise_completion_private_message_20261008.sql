alter table public.vip_surprise_process_runs add column if not exists completion_message_sent_at timestamptz;
create or replace function public.send_vip_surprise_completion_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_chat record;v_settings record;v_content text;
begin
 if new.status <> 'completed' or new.member_id is null or new.completion_message_sent_at is not null then return new; end if;
 if tg_op='UPDATE' and old.status='completed' then return new; end if;
 select * into v_settings from public.vip_surprise_settings where id=1;
 v_content:=trim(coalesce(v_settings.completion_message,''));
 if v_content='' then return new; end if;
 select pc.id,pc.operator_id into v_chat from public.private_chats pc where pc.member_id=new.member_id order by pc.created_at desc limit 1;
 if v_chat.id is null or v_chat.operator_id is null then return new; end if;
 if nullif(trim(coalesce(v_settings.action_label,'')),'') is not null and nullif(trim(coalesce(v_settings.action_url,'')),'') is not null then
   v_content:=v_content || E'\n\n' || trim(v_settings.action_label) || ': ' || trim(v_settings.action_url);
 end if;
 insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
 values(v_chat.id,v_chat.operator_id,'text',v_content,false,false);
 new.completion_message_sent_at:=now();
 return new;
end $$;
drop trigger if exists trg_vip_surprise_completion_message on public.vip_surprise_process_runs;
create trigger trg_vip_surprise_completion_message before update of status on public.vip_surprise_process_runs
for each row execute function public.send_vip_surprise_completion_message();