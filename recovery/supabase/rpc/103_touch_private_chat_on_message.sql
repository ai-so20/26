CREATE OR REPLACE FUNCTION public.touch_private_chat_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.private_chats
  set updated_at = now()
  where id = new.chat_id;

  return new;
end;
$function$
