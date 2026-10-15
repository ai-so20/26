CREATE OR REPLACE FUNCTION public.prevent_ai_rapid_repeat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_ai boolean := false;
  v_last_created_at timestamptz;
begin
  if new.member_id is null then
    return new;
  end if;

  select exists(
    select 1
    from public.ai_characters a
    where a.id=new.member_id
      and coalesce(a.is_active,true)=true
  ) into v_is_ai;

  if not v_is_ai then
    return new;
  end if;

  -- 동일 AI에 대한 동시 INSERT를 한 줄로 세웁니다.
  perform pg_advisory_xact_lock(hashtext(new.member_id::text));

  select gm.created_at
    into v_last_created_at
  from public.group_messages gm
  where gm.member_id=new.member_id
    and gm.id is distinct from new.id
    and coalesce(gm.is_deleted,false)=false
  order by gm.created_at desc
  limit 1;

  if v_last_created_at is not null
     and new.created_at < v_last_created_at + interval '15 seconds'
  then
    -- API 전체를 실패시키지 않고 이 AI의 너무 빠른 중복 메시지만 버립니다.
    return null;
  end if;

  return new;
end;
$function$
