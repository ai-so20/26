alter table public.vip_surprise_copy_settings add column if not exists event_winner_footer text not null default '💌 당첨 상품은 1:1 고객센터에서 확인해주세요.';

create or replace function public.admin_update_event_winner_footer(p_footer text)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin' and approval_status::text in ('1','approved')) then
    raise exception '관리자 전용';
  end if;
  update public.vip_surprise_copy_settings
  set event_winner_footer=left(trim(coalesce(p_footer,'')),250), updated_at=now()
  where id=1;
end;
$$;
revoke all on function public.admin_update_event_winner_footer(text) from public;
grant execute on function public.admin_update_event_winner_footer(text) to authenticated;

create or replace function public.append_event_winner_footer()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_footer text;
begin
  if new.message_type = 'event'
    and new.content like '🎉 VIP EVENT · 당첨 안내%'
    and new.content like '%🏆%'
  then
    select event_winner_footer into v_footer from public.vip_surprise_copy_settings where id=1;
    if nullif(trim(coalesce(v_footer,'')),'') is not null
       and position(v_footer in new.content)=0 then
      new.content := rtrim(new.content) || E'\n\n' || v_footer;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_append_event_winner_footer on public.group_messages;
create trigger trg_append_event_winner_footer before insert on public.group_messages
for each row execute function public.append_event_winner_footer();