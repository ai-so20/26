CREATE OR REPLACE FUNCTION public.admin_reset_ai_process_member(p_user_id uuid, p_available_count integer)
 RETURNS ai_process_members
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
  v_result public.ai_process_members;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into v_is_admin;
  if not v_is_admin then raise exception 'ADMIN_ONLY'; end if;

  insert into public.ai_process_members (
    user_id,available_count,status,investment_amount,
    duration_hours,min_return,max_return,target_mode,target_return,
    started_at,completed_at,updated_at
  ) values (
    p_user_id,greatest(0,coalesce(p_available_count,0)),'ready',0,
    24,10,50,'daily',50,null,null,now()
  )
  on conflict (user_id) do update set
    available_count=excluded.available_count,
    status='ready',
    investment_amount=0,
    duration_hours=24,
    min_return=10,
    max_return=50,
    target_mode='daily',
    target_return=50,
    started_at=null,
    completed_at=null,
    updated_at=now()
  returning * into v_result;
  return v_result;
end;
$function$
