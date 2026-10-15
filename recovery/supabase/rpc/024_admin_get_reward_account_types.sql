CREATE OR REPLACE FUNCTION public.admin_get_reward_account_types()
 RETURNS TABLE(member_id uuid, reward_account_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select p.id,coalesce(p.reward_account_type,'real')
 from public.profiles p
 where p.role='member' and exists (
  select 1 from public.profiles me
  where me.id=auth.uid() and me.role='admin' and me.approval_status='1'
 )
$function$
