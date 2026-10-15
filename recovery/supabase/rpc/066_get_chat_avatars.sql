CREATE OR REPLACE FUNCTION public.get_chat_avatars()
 RETURNS TABLE(id uuid, avatar text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- 승인된 일반 회원 프로필
  select
    p.id,
    p.avatar
  from public.profiles p
  where p.approval_status = '1'
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.approval_status = '1'
    )

  union all

  -- 활성화된 AI 캐릭터 프로필
  select
    a.id,
    a.avatar
  from public.ai_characters a
  where a.is_active = true
    and exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.approval_status = '1'
    );
$function$
