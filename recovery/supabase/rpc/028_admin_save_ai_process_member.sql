CREATE OR REPLACE FUNCTION public.admin_save_ai_process_member(p_user_id uuid, p_available_count integer, p_status text, p_investment_amount numeric, p_duration_hours integer, p_min_return numeric, p_max_return numeric)
 RETURNS ai_process_members
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_admin boolean;
  v_old public.ai_process_members;
  v_result public.ai_process_members;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  v_available integer;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then raise exception 'ADMIN_ONLY'; end if;
  if p_status not in ('ready','waiting','running','completed') then raise exception 'INVALID_STATUS'; end if;
  if coalesce(p_available_count,0) < 0 or coalesce(p_investment_amount,0) < 0 then raise exception 'INVALID_VALUE'; end if;
  if coalesce(p_duration_hours,0) < 1 or p_duration_hours > 2400 then raise exception 'DURATION_MUST_BE_1_TO_2400_HOURS'; end if;
  if coalesce(p_min_return,-1) < 0 or coalesce(p_max_return,-1) < p_min_return then raise exception 'INVALID_RETURN_RANGE'; end if;

  select * into v_old from public.ai_process_members where user_id = p_user_id;

  v_available := greatest(0,coalesce(p_available_count,0));
  v_started_at := v_old.started_at;
  v_completed_at := v_old.completed_at;

  if p_status = 'running' and coalesce(v_old.status,'ready') <> 'running' then
    if coalesce(p_investment_amount,0) <= 0 then raise exception 'INVESTMENT_REQUIRED'; end if;
    if v_available <= 0 then raise exception 'NO_AVAILABLE_COUNT'; end if;
    v_started_at := now();
    v_completed_at := null;
    v_available := v_available - 1;
  elsif p_status = 'waiting' then
    if coalesce(v_old.status,'ready') <> 'running' then
      v_started_at := null;
      v_completed_at := null;
    end if;
  elsif p_status = 'completed' then
    if v_started_at is null then v_started_at := now(); end if;
    v_completed_at := now();
  elsif p_status = 'ready' then
    v_started_at := null;
    v_completed_at := null;
  end if;

  insert into public.ai_process_members (
    user_id,available_count,status,investment_amount,
    duration_hours,min_return,max_return,
    target_mode,target_return,started_at,completed_at,updated_at
  ) values (
    p_user_id,v_available,p_status,greatest(0,coalesce(p_investment_amount,0)),
    p_duration_hours,p_min_return,p_max_return,
    'daily',p_max_return,v_started_at,v_completed_at,now()
  )
  on conflict (user_id) do update set
    available_count=excluded.available_count,
    status=excluded.status,
    investment_amount=excluded.investment_amount,
    duration_hours=excluded.duration_hours,
    min_return=excluded.min_return,
    max_return=excluded.max_return,
    target_return=excluded.target_return,
    started_at=excluded.started_at,
    completed_at=excluded.completed_at,
    updated_at=now()
  returning * into v_result;

  return v_result;
end;
$function$
