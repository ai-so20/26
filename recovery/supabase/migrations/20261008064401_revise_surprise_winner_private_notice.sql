create or replace function public.send_vip_surprise_winner_private_message() returns trigger language plpgsql security definer set search_path=public as $$
declare v_chat record; v_type text; v_content text;
begin
 if new.status<>'running' or new.source_type<>'real' or new.member_id is null or new.linked_to_ai_process_at is null or new.winner_private_message_sent_at is not null then return new; end if;
 if tg_op='UPDATE' and old.status='running' then return new; end if;
 select reward_account_type into v_type from public.profiles where id=new.member_id;
 if coalesce(v_type,'real')<>'real' then return new; end if;
 select id,operator_id into v_chat from public.private_chats where member_id=new.member_id order by created_at desc limit 1;
 if v_chat.id is null or v_chat.operator_id is null then return new; end if;
 v_content:='🎉 AI프로세스 돌발 이벤트 당첨을 축하드립니다!'||E'\n'||'AI프로세스 진행이 시작되었습니다!'||E'\n\n'||'모의 지원 금액 : '||to_char(new.support_amount,'FM999,999,999')||'원'||E'\n'||'진행 기간 : 1시간 ~ 30일 이내 (예시 안내)'||E'\n'||'모의 수익률 : 실제 진행 결과에 따라 달라지는 시뮬레이션 수치'||E'\n'||'(AI프로세스의 설정된 완료 시간에 따라 자동 종료됩니다.)'||E'\n\n'||'진행 완료 시 1:1 메시지로 안내드립니다.'||E'\n'||'본 이벤트는 모의 체험이며 실제 수익 또는 출금이 발생하지 않습니다.';
 insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
 values(v_chat.id,v_chat.operator_id,'text','[[VIP_SURPRISE_LINK]]'||jsonb_build_object('text',v_content)::text,false,false);
 new.winner_private_message_sent_at:=now();
 return new;
end $$;