CREATE OR REPLACE FUNCTION public.sync_approved_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.approval_status::text = '1' then
    begin
      insert into public.members(
        id, nickname, password_hash, role, status, approved_at
      )
      values(
        new.id, new.nickname, 'SUPABASE_AUTH', 'member', 'approved', now()
      )
      on conflict(id) do update
      set
        nickname = excluded.nickname,
        status = 'approved',
        approved_at = coalesce(public.members.approved_at, now());

    exception
      when unique_violation then
        -- 과거 members 행에 같은 닉네임이 남아 있어도
        -- profiles 승인 자체는 정상 완료되게 합니다.
        update public.members
        set
          status = 'approved',
          approved_at = coalesce(approved_at, now())
        where id = new.id;
    end;

  elsif new.approval_status::text = '0' then
    update public.members
    set status = case when status = 'approved' then 'suspended' else status end
    where id = new.id;
  end if;

  return new;
end;
$function$
