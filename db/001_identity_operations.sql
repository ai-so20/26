-- Dedicated AI PROCESS 26 database. No legacy schemas or data are referenced.
create schema if not exists ap_private;
revoke all on schema ap_private from public, anon, authenticated;

create table ap_private.users (
 id uuid primary key default gen_random_uuid(), username text unique not null,
 password_hash text not null, name text not null, phone text not null default '',
 role text not null default 'user' check(role in ('user','admin')),
 approved boolean not null default false, blocked boolean not null default false,
 must_change_password boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table ap_private.sessions (
 token_hash text primary key, user_id uuid not null references ap_private.users on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index on ap_private.sessions(user_id);
create table ap_private.attempts (
 id bigint generated always as identity primary key, identity_key text not null, ip_key text not null,
 action text not null, created_at timestamptz not null default now()
);
create index on ap_private.attempts(identity_key,created_at desc);
create index on ap_private.attempts(ip_key,created_at desc);
create table ap_private.settings (
 id integer primary key check(id=1), gateway_hash text not null,
 auto_enabled boolean not null default false check(auto_enabled=false), interval_minutes integer not null default 3 check(interval_minutes=3)
);
create table ap_private.processes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references ap_private.users,
 display_name text not null, capital bigint not null check(capital>0 and capital<=1000000000000),
 pnl bigint not null default 0, status text not null default 'running' check(status in ('ready','running','complete')),
 started_at timestamptz, ends_at timestamptz, completed_at timestamptz,
 duration_minutes integer check(duration_minutes between 60 and 43200),
 thirty_day_return numeric, target_return numeric, daily_return numeric,
 target_amount bigint, target_source text not null, previous_process_id uuid references ap_private.processes,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(capital+pnl>=0), check((duration_minutes is null and ends_at is null) or duration_minutes is not null)
);
create index on ap_private.processes(user_id,created_at desc);
create table ap_private.ledger (
 id bigint generated always as identity primary key, process_id uuid not null references ap_private.processes,
 kind text not null, capital_delta bigint not null default 0, pnl_delta bigint not null default 0,
 valuation_after bigint not null check(valuation_after>=0), note text not null default '',
 actor_id uuid not null references ap_private.users, created_at timestamptz not null default now()
);
create index on ap_private.ledger(process_id,id desc);
create table ap_private.audit (
 id bigint generated always as identity primary key, actor_id uuid references ap_private.users,
 user_id uuid references ap_private.users, process_id uuid references ap_private.processes,
 action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create index on ap_private.audit(user_id,id desc);
create index on ap_private.audit(process_id,id desc);
create table ap_private.requests (
 user_id uuid not null references ap_private.users on delete cascade, request_id uuid not null,
 result jsonb not null, created_at timestamptz not null default now(), primary key(user_id,request_id)
);

alter table ap_private.users enable row level security;
alter table ap_private.sessions enable row level security;
alter table ap_private.attempts enable row level security;
alter table ap_private.settings enable row level security;
alter table ap_private.processes enable row level security;
alter table ap_private.ledger enable row level security;
alter table ap_private.audit enable row level security;
alter table ap_private.requests enable row level security;
revoke all on all tables in schema ap_private from public,anon,authenticated;
revoke all on all sequences in schema ap_private from public,anon,authenticated;

create function ap_private.safe_user(u ap_private.users) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_object('id',u.id,'username',u.username,'name',u.name,'phone',u.phone,
 'role',u.role,'approved',u.approved,'blocked',u.blocked,'must_change_password',u.must_change_password,'created_at',u.created_at);
$$;
revoke all on function ap_private.safe_user(ap_private.users) from public,anon,authenticated;


create function ap_private.auth_action(p_action text,p_payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users; target_user ap_private.users; p ap_private.processes;
 uname text; pw text; token text; ip text; result jsonb; previous_result jsonb;
 uid uuid; pid uuid; request_id uuid; amount bigint; minutes integer;
 thirty numeric; rate numeric; daily numeric; target bigint; new_status text; note text;
 duration integer; after_value bigint; action text; is_mutation boolean;
begin
 uname:=lower(trim(coalesce(p_payload->>'username',''))); pw:=coalesce(p_payload->>'password','');
 ip:=left(coalesce(p_payload->>'_ip','unknown'),128);
 if p_action in ('signup','login') then
   perform pg_advisory_xact_lock(hashtextextended('auth:'||uname,0));
   perform pg_advisory_xact_lock(hashtextextended('ip:'||ip,0));
   if (select count(*) from ap_private.attempts where identity_key=uname and created_at>now()-interval '15 minutes')>=10
      or (select count(*) from ap_private.attempts where ip_key=ip and created_at>now()-interval '15 minutes')>=50 then
     return jsonb_build_object('ok',false,'code','RATE_LIMIT','message','시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.');
   end if;
   insert into ap_private.attempts(identity_key,ip_key,action) values(uname,ip,p_action);
   if uname !~ '^[a-z0-9_]{4,24}$' or octet_length(pw)<10 or octet_length(pw)>72 then
     return jsonb_build_object('ok',false,'code','INVALID','message','아이디는 영문 소문자·숫자·밑줄 4~24자, 비밀번호는 10자 이상·UTF-8 72바이트 이하로 입력해주세요.');
   end if;
   if p_action='signup' then
     if length(trim(coalesce(p_payload->>'name','')))<1 or length(p_payload->>'name')>40
       or regexp_replace(coalesce(p_payload->>'phone',''),'[^0-9]','','g') !~ '^[0-9]{9,15}$' then
       return jsonb_build_object('ok',false,'code','INVALID','message','이름과 전화번호를 확인해주세요.');
     end if;
     if exists(select 1 from ap_private.users where username=uname) then
       return jsonb_build_object('ok',false,'code','CONFLICT','message','이미 사용 중인 아이디입니다.');
     end if;
     insert into ap_private.users(username,password_hash,name,phone) values(uname,
       extensions.crypt(pw,extensions.gen_salt('bf',12)),trim(p_payload->>'name'),regexp_replace(p_payload->>'phone','[^0-9]','','g')) returning * into u;
     return jsonb_build_object('ok',true,'data',ap_private.safe_user(u));
   end if;
   select * into u from ap_private.users where username=uname for update;
   if u.id is null then
     perform extensions.crypt(pw,extensions.gen_salt('bf',12));
     return jsonb_build_object('ok',false,'code','UNAUTHORIZED','message','아이디 또는 비밀번호가 올바르지 않습니다.');
   end if;
   if u.password_hash<>extensions.crypt(pw,u.password_hash) or u.blocked then
     return jsonb_build_object('ok',false,'code','UNAUTHORIZED','message','아이디 또는 비밀번호가 올바르지 않습니다.');
   end if;
   delete from ap_private.attempts where identity_key=uname;
   delete from ap_private.sessions where user_id=u.id and expires_at<=now();
   token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into ap_private.sessions(token_hash,user_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),u.id,now()+interval '12 hours');
   return jsonb_build_object('ok',true,'data',jsonb_build_object('user',ap_private.safe_user(u),'session_token',token));
 end if;
 return jsonb_build_object('ok',false,'code','INVALID');
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create or replace function ap_private.read_data(p_action text,p_payload jsonb,p_user ap_private.users) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users :=p_user; p ap_private.processes; uid uuid; pid uuid; result jsonb;
begin
 if p_action='processes' then
   select coalesce(jsonb_agg(to_jsonb(x)-array['target_amount','target_return','thirty_day_return','daily_return','target_source'] order by x.created_at desc),'[]') into result from ap_private.processes x where x.user_id=u.id;
   return jsonb_build_object('ok',true,'data',result);
 end if;
 if p_action='admin_members' then
   select coalesce(jsonb_agg(ap_private.safe_user(x)||jsonb_build_object('capital',coalesce(v.capital,0),'pnl',coalesce(v.pnl,0),'running',coalesce(v.running,0),'next_end',v.next_end) order by x.created_at desc),'[]') into result
   from ap_private.users x left join lateral(select sum(z.capital) as capital,sum(z.pnl) as pnl,count(*) as running,min(z.ends_at) as next_end from ap_private.processes z where z.user_id=x.id and z.status='running') v on true where x.role='user' and not x.blocked;
   return jsonb_build_object('ok',true,'data',result);
 end if;
 if p_action='admin_processes' then
   uid:=(p_payload->>'user_id')::uuid;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') into result from ap_private.processes x where x.user_id=uid;
   return jsonb_build_object('ok',true,'data',result);
 end if;
 if p_action in ('history','admin_history') then
   pid:=(p_payload->>'process_id')::uuid;
   select * into p from ap_private.processes where id=pid;
   if p.id is null or (u.role<>'admin' and p.user_id<>u.id) then return jsonb_build_object('ok',false,'code','FORBIDDEN','message','기록에 접근할 수 없습니다.'); end if;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') into result from (select id,kind,capital_delta,pnl_delta,valuation_after,note,created_at from ap_private.ledger where process_id=pid order by id desc limit 500) x;
   return jsonb_build_object('ok',true,'data',result);
 end if;
 if p_action='admin_audit' then
   uid:=(p_payload->>'user_id')::uuid;
   select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]') into result from (select * from ap_private.audit where user_id=uid order by id desc limit 100) x;
   return jsonb_build_object('ok',true,'data',result);
 end if;
 return jsonb_build_object('ok',false,'code','INVALID');
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create function ap_private.create_process(p_action text,p_payload jsonb,p_user ap_private.users) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users :=p_user; target_user ap_private.users; p ap_private.processes;
 uname text; pw text; token text; ip text; result jsonb; previous_result jsonb;
 uid uuid; pid uuid; request_id uuid; amount bigint; minutes integer;
 thirty numeric; rate numeric; daily numeric; target bigint; new_status text; note text;
 duration integer; after_value bigint; action text; is_mutation boolean;
begin
     uid:=(p_payload->>'user_id')::uuid;
     if p_action='admin_restart' then
       pid:=(p_payload->>'process_id')::uuid;
       select * into p from ap_private.processes where id=pid for update;
       if p.id is null or p.status<>'complete' then return jsonb_build_object('ok',false,'code','INVALID','message','완료된 PROCESS만 재시작할 수 있습니다.'); end if;
       uid:=p.user_id;
     end if;
     select * into target_user from ap_private.users where id=uid for update;
     if target_user.id is null or target_user.role<>'user' or not target_user.approved or target_user.blocked then return jsonb_build_object('ok',false,'code','INVALID','message','승인된 회원을 선택해주세요.'); end if;
     amount:=(p_payload->>'capital')::bigint;
     if amount is null or amount<1 or amount>1000000000000 then return jsonb_build_object('ok',false,'code','INVALID','message','투자금은 1원~1조원으로 입력해주세요.'); end if;
     minutes:=nullif(p_payload->>'duration_minutes','')::integer;
     if minutes is not null and (minutes<60 or minutes>43200) then return jsonb_build_object('ok',false,'code','INVALID','message','기간은 1시간~30일입니다.'); end if;
     if minutes is null then daily:=0.25+random()*0.05; thirty:=null; rate:=null;target:=null;
     else
       thirty:=8+random()*4;
       rate:=case when nullif(p_payload->>'target_pct','') is null then exp(ln(1+thirty)*minutes/43200)-1 else (p_payload->>'target_pct')::numeric/100 end;
       if rate<0 or rate>100 then return jsonb_build_object('ok',false,'code','INVALID','message','목표 수익률은 0~10000%로 입력해주세요.'); end if;
       target:=round(amount*(1+rate));
     end if;
     insert into ap_private.processes(user_id,display_name,capital,started_at,ends_at,duration_minutes,thirty_day_return,target_return,daily_return,target_amount,target_source,previous_process_id)
     values(uid,left(coalesce(nullif(trim(p_payload->>'display_name'),''),'AI PROCESS'),60),amount,now(),case when minutes is null then null else now()+make_interval(mins=>minutes) end,minutes,thirty,rate,daily,target,
     case when minutes is null then 'indefinite_daily' when nullif(p_payload->>'target_pct','') is null then 'thirty_day_compound' else 'admin_override' end,case when p_action='admin_restart' then p.id else null end) returning * into p;
     insert into ap_private.ledger(process_id,kind,capital_delta,valuation_after,actor_id,note) values(p.id,'capital',amount,amount,u.id,'PROCESS 시작');
     insert into ap_private.audit(actor_id,user_id,process_id,action,details) values(u.id,uid,p.id,p_action,jsonb_build_object('capital',amount,'target_amount',target));

 return jsonb_build_object('ok',true,'data',to_jsonb(p));
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create function ap_private.change_process(p_action text,p_payload jsonb,p_user ap_private.users) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users :=p_user; target_user ap_private.users; p ap_private.processes;
 uname text; pw text; token text; ip text; result jsonb; previous_result jsonb;
 uid uuid; pid uuid; request_id uuid; amount bigint; minutes integer;
 thirty numeric; rate numeric; daily numeric; target bigint; new_status text; note text;
 duration integer; after_value bigint; action text; is_mutation boolean;
begin
     pid:=(p_payload->>'process_id')::uuid;
     select * into p from ap_private.processes where id=pid for update;
     if p.id is null or p.status='complete' then return jsonb_build_object('ok',false,'code','INVALID','message','진행중인 PROCESS를 선택해주세요.'); end if;
     uid:=p.user_id;
     if p_action='admin_end' then
       update ap_private.processes set status='complete',completed_at=now(),updated_at=now() where id=p.id returning * into p;
       insert into ap_private.audit(actor_id,user_id,process_id,action,details) values(u.id,uid,p.id,'complete',jsonb_build_object('reason','manual','target_amount',p.target_amount,'actual_amount',p.capital+p.pnl,'target_minus_actual',p.target_amount-(p.capital+p.pnl)));
     elsif p_action='admin_adjust' then
       amount:=(p_payload->>'amount')::bigint; action:=p_payload->>'kind'; note:=left(coalesce(p_payload->>'note',''),200);
       if amount is null or amount<=0 or amount>1000000000000 or action not in ('capital','profit','loss') then return jsonb_build_object('ok',false,'code','INVALID','message','금액과 조정 종류를 확인해주세요.'); end if;
       if action='loss' and amount>p.capital+p.pnl then return jsonb_build_object('ok',false,'code','INVALID','message','손실은 현재 평가금액을 초과할 수 없습니다.'); end if;
       if action='capital' and p.capital+amount>1000000000000 then return jsonb_build_object('ok',false,'code','INVALID','message','누적 투자금 한도를 초과합니다.'); end if;
       if action='capital' then
         target:=case when p.target_amount is null then null else p.target_amount+round(amount*exp(ln(1+coalesce(p.target_return,0))*greatest(0,extract(epoch from (p.ends_at-now())))/greatest(1,extract(epoch from (p.ends_at-p.started_at))))) end;
         update ap_private.processes set capital=capital+amount,target_amount=target,updated_at=now() where id=p.id returning * into p;
       else update ap_private.processes set pnl=pnl+case when action='profit' then amount else -amount end,updated_at=now() where id=p.id returning * into p; end if;
       insert into ap_private.ledger(process_id,kind,capital_delta,pnl_delta,valuation_after,note,actor_id)
       values(p.id,action,case when action='capital' then amount else 0 end,case when action='profit' then amount when action='loss' then -amount else 0 end,p.capital+p.pnl,note,u.id);
       insert into ap_private.audit(actor_id,user_id,process_id,action,details) values(u.id,uid,p.id,'adjust',jsonb_build_object('kind',action,'amount',amount,'note',note));
     elsif p_action='admin_schedule' then
       minutes:=nullif(p_payload->>'duration_minutes','')::integer;
       if minutes is not null and (minutes<60 or minutes>43200 or p.started_at+make_interval(mins=>minutes)<=now()) then return jsonb_build_object('ok',false,'code','INVALID','message','시작시간 기준 1시간~30일이며 종료시간이 미래가 되는 기간을 입력해주세요.'); end if;
       thirty:=coalesce(p.thirty_day_return,8+random()*4);
       rate:=case when minutes is null then null when nullif(p_payload->>'target_pct','') is null then exp(ln(1+thirty)*minutes/43200)-1 else (p_payload->>'target_pct')::numeric/100 end;
       if rate is not null and (rate<0 or rate>100) then return jsonb_build_object('ok',false,'code','INVALID','message','목표 수익률을 확인해주세요.'); end if;
       update ap_private.processes set duration_minutes=minutes,ends_at=case when minutes is null then null else started_at+make_interval(mins=>minutes) end,thirty_day_return=case when minutes is null then null else thirty end,
       target_return=rate,daily_return=case when minutes is null then coalesce(daily_return,0.25+random()*0.05) else null end,target_amount=case when minutes is null then null else round(capital*(1+rate)) end,target_source=case when minutes is null then 'indefinite_daily' when nullif(p_payload->>'target_pct','') is null then 'thirty_day_compound' else 'admin_override' end,updated_at=now() where id=p.id returning * into p;
       insert into ap_private.audit(actor_id,user_id,process_id,action,details) values(u.id,uid,p.id,'schedule',jsonb_build_object('duration_minutes',minutes,'target_amount',p.target_amount));
     end if;

 return jsonb_build_object('ok',true,'data',to_jsonb(p));
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create or replace function ap_private.write_data(p_action text,p_payload jsonb,p_user ap_private.users) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users :=p_user; target_user ap_private.users; p ap_private.processes;
 uname text; pw text; token text; ip text; result jsonb; previous_result jsonb;
 uid uuid; pid uuid; v_request_id uuid; amount bigint; minutes integer;
 thirty numeric; rate numeric; daily numeric; target bigint; new_status text; note text;
 duration integer; after_value bigint; action text; is_mutation boolean;
begin
 if p_action not in ('admin_approval','admin_reset_password','admin_create','admin_adjust','admin_schedule','admin_end','admin_restart') then
   return jsonb_build_object('ok',false,'code','INVALID','message','지원하지 않는 작업입니다.');
 end if;
 v_request_id:=(p_payload->>'request_id')::uuid;
 if v_request_id is null then return jsonb_build_object('ok',false,'code','INVALID','message','요청 식별자가 필요합니다.'); end if;
 select r.result into previous_result from ap_private.requests r where r.user_id=u.id and r.request_id=v_request_id;
 if previous_result is not null then return previous_result; end if;
 if p_action in ('admin_approval','admin_reset_password') then
   uid:=(p_payload->>'user_id')::uuid;
   select * into target_user from ap_private.users where id=uid for update;
   if target_user.id is null or target_user.role='admin' then return jsonb_build_object('ok',false,'code','INVALID','message','대상 회원을 확인해주세요.'); end if;
   if p_action='admin_approval' then
     update ap_private.users set approved=coalesce((p_payload->>'approved')::boolean,false),updated_at=now() where id=uid;
     if not coalesce((p_payload->>'approved')::boolean,false) then delete from ap_private.sessions where user_id=uid; end if;
     result:=jsonb_build_object('ok',true,'data',jsonb_build_object('approved',(p_payload->>'approved')::boolean));
     insert into ap_private.audit(actor_id,user_id,action,details) values(u.id,uid,'approval',jsonb_build_object('approved',(p_payload->>'approved')::boolean));
   else
     pw:=coalesce(p_payload->>'new_password','');
     if octet_length(pw)<10 or octet_length(pw)>72 then return jsonb_build_object('ok',false,'code','INVALID','message','임시 비밀번호는 10자 이상·72바이트 이하로 입력해주세요.'); end if;
     update ap_private.users set password_hash=extensions.crypt(pw,extensions.gen_salt('bf',12)),must_change_password=true,updated_at=now() where id=uid;
     delete from ap_private.sessions where user_id=uid;
     insert into ap_private.audit(actor_id,user_id,action) values(u.id,uid,'password_reset');
     result:=jsonb_build_object('ok',true,'data',jsonb_build_object('reset',true));
   end if;
 else
   if p_action in ('admin_create','admin_restart') then result:=ap_private.create_process(p_action,p_payload,u); else result:=ap_private.change_process(p_action,p_payload,u); end if;
   if not coalesce((result->>'ok')::boolean,false) then return result; end if;

 end if;
 insert into ap_private.requests(user_id,request_id,result) values(u.id,v_request_id,result);
 return result;

exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create function ap_private.session_action(p_action text,p_token text,p_payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare
 u ap_private.users; target_user ap_private.users; p ap_private.processes;
 uname text; pw text; token text; ip text; result jsonb; previous_result jsonb;
 uid uuid; pid uuid; request_id uuid; amount bigint; minutes integer;
 thirty numeric; rate numeric; daily numeric; target bigint; new_status text; note text;
 duration integer; after_value bigint; action text; is_mutation boolean;
begin
 select x.* into u from ap_private.users x join ap_private.sessions s on s.user_id=x.id
 where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and not x.blocked for update of x;
 if u.id is null then return jsonb_build_object('ok',false,'code','UNAUTHORIZED','message','로그인이 필요합니다.'); end if;
 if p_action='logout' then
   delete from ap_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
   return jsonb_build_object('ok',true,'data',jsonb_build_object('logged_out',true));
 end if;
 if p_action='me' then return jsonb_build_object('ok',true,'data',ap_private.safe_user(u)); end if;
 if p_action='password' then
   if u.password_hash<>extensions.crypt(coalesce(p_payload->>'current_password',''),u.password_hash) then
     return jsonb_build_object('ok',false,'code','INVALID','message','현재 비밀번호가 올바르지 않습니다.');
   end if;
   pw:=coalesce(p_payload->>'new_password','');
   if octet_length(pw)<10 or octet_length(pw)>72 then return jsonb_build_object('ok',false,'code','INVALID','message','새 비밀번호는 10자 이상·72바이트 이하로 입력해주세요.'); end if;
   update ap_private.users set password_hash=extensions.crypt(pw,extensions.gen_salt('bf',12)),must_change_password=false,updated_at=now() where id=u.id;
   delete from ap_private.sessions where user_id=u.id and token_hash<>encode(extensions.digest(p_token,'sha256'),'hex');
   return jsonb_build_object('ok',true,'data',jsonb_build_object('changed',true));
 end if;
 if u.must_change_password then return jsonb_build_object('ok',false,'code','PASSWORD_CHANGE','message','임시 비밀번호를 먼저 변경해주세요.'); end if;
 if u.role<>'admin' and not u.approved then return jsonb_build_object('ok',false,'code','PENDING','message','관리자 승인 대기 중입니다.'); end if;
 if p_action like 'admin_%' and u.role<>'admin' then return jsonb_build_object('ok',false,'code','FORBIDDEN','message','관리자 권한이 필요합니다.'); end if;

 if p_action in ('processes','history','admin_members','admin_processes','admin_history','admin_audit') then return ap_private.read_data(p_action,p_payload,u); end if;
 return ap_private.write_data(p_action,p_payload,u);
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('ok',false,'code','INVALID','message','입력값을 확인해주세요.');
end;$$;

create function public.ap_gateway(p_gate text,p_action text,p_token text default '',p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_gate is null or not exists(select 1 from ap_private.settings where id=1 and gateway_hash=encode(extensions.digest(p_gate,'sha256'),'hex')) then
   return jsonb_build_object('ok',false,'code','FORBIDDEN','message','접근할 수 없습니다.');
 end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then
   return jsonb_build_object('ok',false,'code','INVALID','message','요청 형식이 올바르지 않습니다.');
 end if;
 if p_action='health' then return jsonb_build_object('ok',true,'data',jsonb_build_object('database','connected','automatic_reflection',false)); end if;

 if p_action in ('signup','login') then return ap_private.auth_action(p_action,p_payload); end if;
 return ap_private.session_action(p_action,p_token,p_payload);
end;$$;
revoke all on all functions in schema ap_private from public,anon,authenticated;
revoke all on function public.ap_gateway(text,text,text,jsonb) from public,authenticated;
grant execute on function public.ap_gateway(text,text,text,jsonb) to anon;
notify pgrst,'reload schema';