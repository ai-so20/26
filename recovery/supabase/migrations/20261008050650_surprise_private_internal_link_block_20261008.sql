create or replace function public.send_vip_surprise_winner_private_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_chat record;v_type text;v_content text;v_hours int;v_rate numeric;
begin
 if new.status<>'running' or new.source_type<>'real' or new.member_id is null or new.linked_to_ai_process_at is null or new.winner_private_message_sent_at is not null then return new;end if;
 if tg_op='UPDATE' and old.status='running' then return new;end if;
 select reward_account_type into v_type from public.profiles where id=new.member_id;
 if coalesce(v_type,'real')<>'real' then return new;end if;
 select id,operator_id into v_chat from public.private_chats where member_id=new.member_id order by created_at desc limit 1;
 if v_chat.id is null or v_chat.operator_id is null then return new;end if;
 v_hours:=greatest(1,round(extract(epoch from (new.scheduled_finish_at-new.scheduled_start_at))/3600)::int);
 v_rate:=round((new.final_balance-new.support_amount)::numeric/nullif(new.support_amount,0)*100,1);
 v_content:='🎉 VIP 돌발 AI프로세스 체험 이벤트 당첨을 축하드립니다!'||E'\n\n'||'모의 체험 지원금: '||to_char(new.support_amount,'FM999,999,999')||'원'||E'\n'||'예상 진행 기간: 약 '||v_hours||'시간'||E'\n'||'모의 예상 수익률: '||coalesce(v_rate::text,'0')||'%'||E'\n'||'모의 최종 체험 금액: '||to_char(new.final_balance,'FM999,999,999')||'원'||E'\n\n'||'실제 현금 지급이나 확정 수익을 뜻하지 않는 모의 체험입니다.';
 insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
 values(v_chat.id,v_chat.operator_id,'text','[[VIP_SURPRISE_LINK]]'||jsonb_build_object('text',v_content)::text,false,false);
 new.winner_private_message_sent_at:=now();
 return new;
end $$;