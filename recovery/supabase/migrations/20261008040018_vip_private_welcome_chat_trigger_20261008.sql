create or replace function public.send_vip_private_welcome_on_chat_create()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_message_id uuid;
begin
  if exists (select 1 from public.vip_member_welcome_deliveries where member_id = new.member_id) then
    return new;
  end if;
  insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
  values(new.id,new.operator_id,'text',
  E'VIP 회원님, 환영합니다!\n\n- 그룹채팅: VIP 회원님들과 소통하며 간편한 이벤트·상품을 받아가실 수 있습니다.\n- 운영시간: AM 11:00 ~ PM 18:30 (이벤트 탭에서 시간·내용 확인 가능)\n- 참여 안내: 회차마다 참여 모두 가능하며, 당첨 시 여기 1:1 고객센터에서 즉시 기프티콘 지급됩니다 :)\n\n🔔 중요: 이벤트 당첨 및 배송 안내를 놓치지 않도록 상단의 알림 설정을 꼭 허용해주세요!',
  false,false) returning id into v_message_id;
  insert into public.vip_member_welcome_deliveries(member_id,private_message_id)
  values(new.member_id,v_message_id) on conflict(member_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_vip_private_welcome_on_chat_create on public.private_chats;
create trigger trg_vip_private_welcome_on_chat_create
after insert on public.private_chats for each row
execute function public.send_vip_private_welcome_on_chat_create();