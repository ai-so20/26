CREATE OR REPLACE FUNCTION public.send_vip_private_welcome_on_chat_create()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_message_id uuid; v_name text; v_content text;
begin
  if exists (select 1 from public.vip_member_welcome_deliveries where member_id = new.member_id) then return new; end if;
  select coalesce(nullif(btrim(real_name),''),nullif(btrim(nickname),''),'회원') into v_name
  from public.profiles where id = new.member_id;
  v_content := '📌 ※ 필독 | VIP 라운지 이용 안내 ※' || E'\n'
    || 'VIP 라운지는 기업 발전에 도움을 주신 분들을 위한 특별 이벤트·혜택 공간입니다 :)' || E'\n'
    || v_name || '님께서는 이번 협찬을 통해 특별히 초대되셨습니다.' || E'\n'
    || '🔒 그룹채팅 내에서는 개인별 입장 경위에 대한 언급이 금지되어 있습니다.' || E'\n'
    || '매일 진행되는 출석 및 다양한 이벤트에 자유롭게 참여하시고, 혜택도 받아가세요! 🎁' || E'\n'
    || '🔔 중요! 상단의 ''알림 설정''을 꼭 허용해 주시고, 위의 기존 안내문도 확인해 주세요 :)' || E'\n'
    || '궁금한 사항은 언제든 1:1 고객센터로 문의해 주세요!';
  insert into public.private_messages(chat_id,sender_id,message_type,content,is_deleted,is_read)
  values(new.id,new.operator_id,'text',v_content,false,false) returning id into v_message_id;
  insert into public.vip_member_welcome_deliveries(member_id,private_message_id)
  values(new.member_id,v_message_id) on conflict(member_id) do nothing;
  return new;
end $function$
