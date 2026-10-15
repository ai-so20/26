CREATE OR REPLACE FUNCTION public.send_vip_surprise_completion_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
   v_content:='[[LINK_BUTTON]]'||jsonb_build_object('text',v_content,'button_text',coalesce(nullif(trim(v_settings.action_label),''),'안내 확인하기'),'button_url',v_url,'ai_process_auto_completion',true)::text;
 end if;
 insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
 values(v_chat.id,v_chat.operator_id,'text',v_content,false,false);
 new.completion_message_sent_at:=now();
 return new;
end $function$
