CREATE OR REPLACE FUNCTION public.notify_ai_winner_celebration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  -- VIP고객센터가 올리는 이벤트 당첨 공지만 AI에게 전달
  if new.is_deleted = false
     and new.message_type = 'text'
     and new.content like '%VIP EVENT%'
     and new.content like '%당첨 안내%'
     and new.content like '%🏆%'
  then
    perform net.http_post(
      url := 'https://vip-event-gamma.vercel.app/api/ai-chat',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'mode', 'winner',
        'message_id', new.id,
        'announcement', new.content
      )
    );
  end if;

  return new;
end;
$function$
