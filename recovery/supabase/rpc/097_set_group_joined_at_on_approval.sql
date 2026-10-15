CREATE OR REPLACE FUNCTION public.set_group_joined_at_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(old.approval_status::text, '0') <> '1'
     and new.approval_status::text = '1'
     and coalesce(new.role, 'member') <> 'admin' then
    new.group_joined_at := now();
  end if;

  return new;
end;
$function$
