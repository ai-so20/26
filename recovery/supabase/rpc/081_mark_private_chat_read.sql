CREATE OR REPLACE FUNCTION public.mark_private_chat_read(target_chat_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.private_chats pc
    where pc.id = target_chat_id
      and (
        pc.member_id = auth.uid()
        or pc.operator_id = auth.uid()
      )
  ) then
    raise exception '접근할 수 없는 상담방입니다.';
  end if;

  update public.private_messages
  set is_read = true
  where chat_id = target_chat_id
    and sender_id <> auth.uid()
    and is_read = false
    and is_deleted = false;
end;
$function$
