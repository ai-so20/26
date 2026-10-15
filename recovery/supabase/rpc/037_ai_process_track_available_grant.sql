CREATE OR REPLACE FUNCTION public.ai_process_track_available_grant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(new.available_count,0) <= 0 then
    new.available_granted_at := null;
  elsif tg_op = 'INSERT' then
    if new.available_granted_at is null then
      new.available_granted_at := now();
    end if;
  elsif coalesce(old.available_count,0) <= 0 and coalesce(new.available_count,0) > 0 then
    new.available_granted_at := now();
  elsif coalesce(new.available_count,0) > coalesce(old.available_count,0) then
    -- 관리자가 횟수를 추가 지급한 경우 새 지급일 기준으로 D-10 재시작
    new.available_granted_at := now();
  end if;

  return new;
end;
$function$
