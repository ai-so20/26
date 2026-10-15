CREATE OR REPLACE FUNCTION public.check_daily_attendance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  total_count integer := 0;
  cycle_count integer := 0;
  inserted_rows integer := 0;
  inserted_today boolean := false;
  reward_result jsonb := null;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approval_status::text in ('1','approved')
  ) then
    raise exception '승인된 회원만 출석할 수 있습니다.';
  end if;

  insert into public.vip_daily_attendance(member_id, attendance_date)
  values(
    auth.uid(),
    (now() at time zone 'Asia/Seoul')::date
  )
  on conflict(member_id, attendance_date) do nothing;

  get diagnostics inserted_rows = row_count;
  inserted_today := inserted_rows > 0;

  select count(*)::integer
  into total_count
  from public.vip_daily_attendance
  where member_id = auth.uid();

  cycle_count :=
    case
      when total_count > 0 and total_count % 10 = 0 then 10
      else total_count % 10
    end;

  -- 핵심:
  -- 오늘 실제 새 출석이 추가됐고,
  -- 실제 누적 횟수가 10/20/30/40...일 때마다
  -- 해당 milestone_count로 별도의 새 보상을 요청합니다.
  if inserted_today
     and total_count > 0
     and total_count % 10 = 0 then
    reward_result := public.fulfill_attendance_reward(
      auth.uid(),
      total_count
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'checked_today', true,
    'inserted_today', inserted_today,
    'total_count', total_count,
    'cycle_count', cycle_count,
    'reward_ready',
      (inserted_today and total_count > 0 and total_count % 10 = 0),
    'next_reward_at',
      total_count + (10 - (total_count % 10)),
    'reward_result', reward_result,
    'message',
      case
        when inserted_today and total_count > 0 and total_count % 10 = 0
          then case
            when coalesce((reward_result->>'success')::boolean, false)
              then '출석 완료! 10회 출석을 달성하여 랜덤 기프티콘이 1:1 고객센터로 즉시 지급되었습니다.'
            when reward_result->>'reason' = 'attendance_gift_inventory_empty'
              then '출석 완료! 10회 출석을 달성했습니다. 현재 출석체크 전용 기프티콘 재고 확인이 필요합니다.'
            else
              '출석 완료! 10회 출석을 달성했습니다. 기프티콘 지급 상태를 확인해주세요.'
          end
        when not inserted_today
          then '오늘 출석은 이미 완료되었습니다.'
        else
          '오늘의 출석이 완료되었습니다.'
      end
  );
end;
$function$
