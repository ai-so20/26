CREATE OR REPLACE FUNCTION public.vip_ai_chat_after_real_event_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_is_ai boolean:=false;
begin
  select exists(select 1 from public.ai_characters a where a.id=new.member_id and coalesce(a.is_active,true)=true) into v_is_ai;
  if not v_is_ai then return new; end if;
  if random()<=0.75 then
    perform net.http_post(
      url:='https://vip-event-gamma.vercel.app/api/ai-chat',
      headers:=jsonb_build_object('Content-Type','application/json'),
      body:=jsonb_build_object('mode','event_entry','eventId',new.event_id::text,'memberId',new.member_id::text)
    );
  end if;
  return new;
end;$function$
