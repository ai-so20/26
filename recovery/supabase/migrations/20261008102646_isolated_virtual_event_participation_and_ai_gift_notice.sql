create table if not exists public.virtual_event_entries (
 event_id uuid not null references public.events(id) on delete cascade,
 member_id uuid not null references public.profiles(id),
 participate_at timestamptz not null,
 processed_at timestamptz,
 created_at timestamptz not null default now(),
 primary key(event_id,member_id)
);
create table if not exists public.virtual_event_results (
 event_id uuid primary key references public.events(id) on delete cascade,
 member_id uuid references public.profiles(id),
 ai_gift_id uuid references public.ai_gift_inventory(id),
 announced_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.virtual_event_entries enable row level security;
alter table public.virtual_event_results enable row level security;
create or replace function public.run_virtual_event_simulation()
returns void language plpgsql security definer set search_path=public as $$
declare
 v_event record;
 v_member record;
 v_duration numeric;
 v_count integer;
 v_winner uuid;
 v_gift public.ai_gift_inventory%rowtype;
 v_admin uuid;
 v_name text;
begin
 -- Only the scheduled background worker may execute this operation.
 if auth.uid() is not null then
   raise exception 'Background operation only';
 end if;
 for v_event in
   select id,starts_at,ends_at,room_id,event_type,status
   from public.events
   where auto_event=true and schedule_date=(now() at time zone 'Asia/Seoul')::date
     and event_type<>'attendance' and status in ('active','completed')
 loop
   if v_event.status='active' and now()<v_event.ends_at then
     if not exists(select 1 from public.virtual_event_entries where event_id=v_event.id) then
       v_duration:=greatest(60,extract(epoch from (v_event.ends_at-v_event.starts_at)));
       for v_member in
         select p.id from public.profiles p
         where p.role='member' and p.reward_account_type='virtual'
           and p.approval_status::text in ('1','approved')
           and not exists(select 1 from public.ai_characters a where a.id=p.id)
         order by random() limit 5
       loop
         insert into public.virtual_event_entries(event_id,member_id,participate_at)
         values(v_event.id,v_member.id,
           greatest(now(),v_event.starts_at+make_interval(secs=>least(v_duration-5,greatest(5,v_duration*(0.05+random()*0.75))))))
         on conflict do nothing;
       end loop;
     end if;
     update public.virtual_event_entries set processed_at=now()
       where event_id=v_event.id and processed_at is null and participate_at<=now()
         and exists(select 1 from public.profiles p where p.id=member_id and p.reward_account_type='virtual');
   elsif v_event.status='completed' then
     if not exists(select 1 from public.virtual_event_results where event_id=v_event.id) then
       select member_id into v_winner from public.virtual_event_entries
         where event_id=v_event.id and processed_at is not null order by random() limit 1;
       if v_winner is not null then
         insert into public.virtual_event_results(event_id,member_id)
         values(v_event.id,v_winner) on conflict do nothing;
       end if;
     end if;
     select member_id into v_winner from public.virtual_event_results
       where event_id=v_event.id and announced_at is null for update;
     if v_winner is not null then
       select id into v_admin from public.profiles
         where role='admin' and approval_status::text in ('1','approved')
         order by created_at limit 1;
       select nickname into v_name from public.profiles where id=v_winner;
       if v_admin is not null then
         select * into v_gift from public.ai_gift_inventory
           where assigned_event_id=v_event.id and assigned_winner_id=v_winner limit 1;
         if v_gift.id is null then
           select * into v_gift from public.ai_gift_inventory
             where status='available' order by queue_no for update skip locked limit 1;
           if v_gift.id is not null then
             update public.ai_gift_inventory
               set status='assigned',assigned_event_id=v_event.id,
                   assigned_winner_id=v_winner,assigned_at=now()
               where id=v_gift.id;
           end if;
         end if;
         if v_gift.id is not null then
           insert into public.group_messages(room_id,member_id,message_type,content,is_deleted,created_at)
           values(v_event.room_id,v_admin,'event',
             '🤖 가상 이벤트 결과 · 시뮬레이션'||E'\n\n'||
             '참여 계정: '||coalesce(v_name,'가상 계정')||E'\n'||
             '🎁 AI 전용 상품: '||v_gift.product_name||E'\n\n'||
             '가상 결과이며 실제 기프티콘이나 1:1 상품 지급은 없습니다.',
             false,now());
           update public.virtual_event_results set ai_gift_id=v_gift.id,announced_at=now()
             where event_id=v_event.id;
         end if;
       end if;
     end if;
   end if;
 end loop;
end $$;
revoke all on function public.run_virtual_event_simulation() from public,anon,authenticated;
select cron.schedule('vip-virtual-event-simulation','* * * * *','select public.run_virtual_event_simulation();');