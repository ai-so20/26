CREATE OR REPLACE FUNCTION public.get_daily_attendance_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  total_count integer := 0;
  checked_today boolean := false;
  cycle_count integer := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select count(*)::integer
  into total_count
  from public.vip_daily_attendance
  where member_id = auth.uid();

  select exists(
    select 1
    from public.vip_daily_attendance
    where member_id = auth.uid()
      and attendance_date = (now() at time zone 'Asia/Seoul')::date
  )
  into checked_today;

  if total_count > 0 and total_count % 10 = 0 then
    cycle_count := case when checked_today then 10 else 0 end;
  else
    cycle_count := total_count % 10;
  end if;

  return jsonb_build_object(
    'checked_today', checked_today,
    'total_count', total_count,
    'cycle_count', cycle_count,
    'reward_ready',
      (checked_today and total_count > 0 and total_count % 10 = 0),
    'next_reward_at',
      case
        when total_count % 10 = 0 and not checked_today then total_count + 10
        else total_count + (10 - (total_count % 10))
      end
  );
end;
$function$
