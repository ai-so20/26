CREATE OR REPLACE FUNCTION public.announce_vip_surprise_group_win()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text;
begin
 if new.status<>'running' or new.linked_to_ai_process_at is null or (tg_op='UPDATE' and old.status='running') then return new;end if;
 if new.source_type='ai_character' then
   select nickname into v_name from public.ai_characters where id=new.ai_character_id;
 else
   select nickname into v_name from public.profiles where id=new.member_id;
 end if;
 if v_name is null then return new;end if;
 insert into public.group_messages(room_id,member_id,message_type,content,is_deleted)
 values('0a495a02-bcb8-4e38-b3ef-4e7059c2a883',null,'system','[VIP_SURPRISE_WIN]'||v_name,false);
 return new;
end $function$
