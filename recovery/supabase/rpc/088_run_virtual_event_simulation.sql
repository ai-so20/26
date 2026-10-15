CREATE OR REPLACE FUNCTION public.run_virtual_event_simulation()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_event record;
 v_member record;
 v_duration numeric;
 v_winner uuid;
 v_gift public.ai_gift_inventory%rowtype;
 v_admin uuid;
 v_name text;
begin
 if auth.uid() is not null then raise exception 'Background operation only'; end if;
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
     update public.virtual_event_entries ve set processed_at=now()
       where ve.event_id=v_event.id and ve.processed_at is null and ve.participate_at<=now()
         and exists(select 1 from public.profiles p where p.id=ve.member_id and p.reward_account_type='virtual');
   elsif v_event.status='completed' then
     if not exists(select 1 from public.virtual_event_results where event_id=v_event.id) then
       select member_id into v_winner from public.virtual_event_entries
         where event_id=v_event.id and processed_at is not null order by random() limit 1;
       if v_winner is not null then
         insert into public.virtual_event_results(event_id,member_id)
         values(v_event.id,v_winner) on conflict do nothing;
       end if;
     end if;
     v_winner:=null;
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
             '🎉 VIP EVENT · 당첨 안내'||E'\n\n'||
             '축하드립니다!'||E'\n'||
             '이번 '||public.event_type_korean(v_event.event_type)||' 이벤트 당첨자는'||E'\n'||
             '🏆 '||coalesce(v_name,'VIP 회원')||' 님입니다!'||E'\n\n'||
             '당첨을 진심으로 축하드립니다 ♥️'||E'\n\n'||
             '🎁 당첨 상품'||E'\n'||v_gift.product_name,
             false,now());
           update public.virtual_event_results set ai_gift_id=v_gift.id,announced_at=now()
             where event_id=v_event.id;
         end if;
       end if;
     end if;
   end if;
 end loop;
end $function$
