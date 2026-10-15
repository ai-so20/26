CREATE OR REPLACE FUNCTION public.announce_group_member_join()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_message_id uuid;
begin
  if coalesce(old.approval_status::text,'0') <> '1'
     and new.approval_status::text='1'
     and coalesce(new.role,'member') <> 'admin' then
    insert into public.group_messages(room_id,member_id,message_type,content,is_deleted,created_at)
    values(
      '0a495a02-bcb8-4e38-b3ef-4e7059c2a883'::uuid,
      null,'system',
      coalesce(nullif(trim(new.nickname),''),'VIP 회원') || '님께서 입장하셨습니다.',
      false,now()
    )
    returning id into v_message_id;

    perform net.http_post(
      url := 'https://vip-event-gamma.vercel.app/api/ai-chat',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'mode','welcome',
        'memberId',new.id::text,
        'nickname',coalesce(nullif(trim(new.nickname),''),'VIP 회원'),
        'message_id',v_message_id::text
      )
    );
  end if;
  return new;
end;
$function$
