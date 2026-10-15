CREATE OR REPLACE FUNCTION public.expire_ai_process_available_counts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  changed_count integer := 0;
begin
  update public.ai_process_members
  set
    available_count = 0,
    available_granted_at = null,
    updated_at = now()
  where available_count > 0
    and available_granted_at is not null
    and available_granted_at + interval '10 days' <= now()
    and coalesce(status,'ready') not in ('running');

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$function$
