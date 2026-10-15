CREATE OR REPLACE FUNCTION public.get_admin_event_entries(target_event_id uuid)
 RETURNS TABLE(member_id uuid, nickname text, real_name text, answer text, is_correct boolean, result_text text, submitted_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select ee.member_id,p.nickname,p.real_name,ee.answer,ee.is_correct,ee.result_text,
         coalesce(ee.submitted_at,ee.joined_at)
  from public.event_entries ee
  join public.profiles p on p.id=ee.member_id
  where ee.event_id=target_event_id
    and exists(select 1 from public.profiles me
      where me.id=auth.uid() and me.role='admin' and me.approval_status='1')
  order by coalesce(ee.submitted_at,ee.joined_at) desc;
$function$
