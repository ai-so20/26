create or replace function public.vip_route_ai_from_group_message()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare v_is_ai boolean:=false;v_is_official boolean:=false;v_mode text:='member';v_body jsonb;v_content text:=coalesce(new.content,'');
begin
 if coalesce(new.is_deleted,false) then return new;end if;
 if new.member_id is not null then
   select exists(select 1 from public.ai_characters a where a.id=new.member_id and coalesce(a.is_active,true)) into v_is_ai;
 end if;
 if v_is_ai then return new;end if;
 v_is_official:=new.message_type in ('event','system')
   or exists(select 1 from public.profiles p where p.id=new.member_id and p.role='admin');
 if new.message_type='system' and v_content like '[VIP_SURPRISE_WIN]%' then
   v_mode:='winner';
 elsif v_is_official and v_content ~ '🏆' and v_content ~ '(당첨|축하)'
    and v_content ~* '(VIP[[:space:]]*EVENT|이벤트)' then
   v_mode:='winner';
 elsif v_is_official and v_content ~* '(VIP[[:space:]]*EVENT|LIVE[[:space:]]*EVENT)'
       and v_content ~ '(시작|오픈|참여|룰렛|퀴즈|추첨|숫자|번호|EVENT)' then
   v_mode:='event';
 elsif v_is_official and v_content ~ '(입장하셨습니다|입장했습니다|새로 들어왔)' then
   v_mode:='welcome';
 end if;
 v_body:=jsonb_build_object('mode',v_mode,'message_id',new.id,'message',v_content,'announcement',v_content,'memberId',case when new.member_id is null then null else new.member_id::text end);
 perform net.http_post(url:='https://vip-event-gamma.vercel.app/api/ai-chat',headers:=jsonb_build_object('Content-Type','application/json'),body:=v_body);
 return new;
end $$;