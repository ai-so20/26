CREATE OR REPLACE FUNCTION public.get_my_group_joined_at()
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.group_joined_at
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$function$
