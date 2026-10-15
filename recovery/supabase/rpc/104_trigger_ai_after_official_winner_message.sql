CREATE OR REPLACE FUNCTION public.trigger_ai_after_official_winner_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if new.room_id = '0a495a02-bcb8-4e38-b3ef-4e7059c2a883'::uuid
     and new.message_type = 'event'
     and coalesce(new.is_deleted,false) = false
     and new.content like '%당첨자는%'
     and new.content like '%🏆%' then

    perform net.http_post(
      url := 'https://vip-event-gamma.vercel.app/api/ai-chat',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'mode','winner',
        'message_id',new.id::text,
        'announcement',coalesce(new.content,'')
      )
    );
  end if;

  return new;
end;
$function$
