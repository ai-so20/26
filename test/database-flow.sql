-- Run with test placeholders substituted in memory. Everything is rolled back.
begin;
insert into ap_private.users(username,password_hash,name,role,approved)
values('qa_admin26',extensions.crypt('__PASSWORD__',extensions.gen_salt('bf',12)),'검증 관리자','admin',true);
do $$
declare g text:='__GATE__'; pw text:='__PASSWORD__'; r jsonb; t text; a text; uid uuid; pid uuid; rid uuid:=gen_random_uuid(); n integer;
begin
 r:=public.ap_gateway(g,'signup','',jsonb_build_object('username','qa_short26','password','가나다','name','검증 회원','phone','01000000000','_ip','qa')); assert r->>'code'='INVALID','minimum password character count';
 r:=public.ap_gateway(g,'signup','',jsonb_build_object('username','qa_user26','password',pw,'name','검증 회원','phone','01000000000','_ip','qa'));
 assert (r->>'ok')::boolean,'signup';uid:=(r->'data'->>'id')::uuid;
 r:=public.ap_gateway(g,'login','',jsonb_build_object('username','qa_user26','password',pw,'_ip','qa'));
 assert (r->>'ok')::boolean,'login';t:=r->'data'->>'session_token';
 assert (select password_hash<>pw from ap_private.users where id=uid),'password hashing';
 r:=public.ap_gateway(g,'processes',t);assert r->>'code'='PENDING','pending access blocked';
 r:=public.ap_gateway(g,'login','',jsonb_build_object('username','qa_admin26','password',pw,'_ip','qa'));a:=r->'data'->>'session_token';assert a is not null,'admin login';
 r:=public.ap_gateway(g,'admin_approval',a,jsonb_build_object('user_id',uid,'approved',true,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'approval';
 r:=public.ap_gateway(g,'processes',t);assert (r->>'ok')::boolean,'approved access';
 r:=public.ap_gateway(g,'admin_members',t);assert r->>'code'='FORBIDDEN','non-admin blocked';
 r:=public.ap_gateway(g,'admin_create',a,jsonb_build_object('user_id',uid,'capital',1000000,'duration_minutes',1440,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'create';pid:=(r->'data'->>'id')::uuid;
 r:=public.ap_gateway(g,'admin_adjust',a,jsonb_build_object('process_id',pid,'kind','profit','amount',10000,'request_id',rid));assert (r->>'ok')::boolean,'profit';
 r:=public.ap_gateway(g,'admin_adjust',a,jsonb_build_object('process_id',pid,'kind','profit','amount',10000,'request_id',rid));assert (select pnl=10000 from ap_private.processes where id=pid),'duplicate prevented';
 r:=public.ap_gateway(g,'admin_adjust',a,jsonb_build_object('process_id',pid,'kind','loss','amount',3000,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'loss';
 r:=public.ap_gateway(g,'admin_adjust',a,jsonb_build_object('process_id',pid,'kind','capital','amount',100000,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'capital';
 assert (select capital=1100000 and pnl=7000 from ap_private.processes where id=pid),'capital separate from pnl';
 r:=public.ap_gateway(g,'history',t,jsonb_build_object('process_id',pid));assert jsonb_array_length(r->'data')=4,'ledger';
 r:=public.ap_gateway(g,'admin_schedule',a,jsonb_build_object('process_id',pid,'duration_minutes',null,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'indefinite schedule';
 r:=public.ap_gateway(g,'admin_schedule',a,jsonb_build_object('process_id',pid,'duration_minutes',1440,'target_pct',10,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'manual target';
 r:=public.ap_gateway(g,'admin_end',a,jsonb_build_object('process_id',pid,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'end';
 assert (select capital+pnl=1107000 and status='complete' from ap_private.processes where id=pid),'no target settlement';
 r:=public.ap_gateway(g,'admin_audit',t,jsonb_build_object('user_id',uid));assert r->>'code'='FORBIDDEN','audit hidden';
 r:=public.ap_gateway(g,'admin_restart',a,jsonb_build_object('process_id',pid,'capital',1107000,'duration_minutes',60,'request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'restart';
 assert (select count(*)=2 from ap_private.processes where user_id=uid),'restart preserves history';
 r:=public.ap_gateway(g,'admin_reset_password',a,jsonb_build_object('user_id',uid,'new_password',pw||'x','request_id',gen_random_uuid()));assert (r->>'ok')::boolean,'reset password';
 r:=public.ap_gateway(g,'me',t);assert r->>'code'='UNAUTHORIZED','reset revokes old session';
 r:=public.ap_gateway('wrong','health');assert r->>'code'='FORBIDDEN','gateway key check';
 assert not has_schema_privilege('anon','ap_private','USAGE'),'private schema access';
 assert not has_table_privilege('anon','ap_private.users','SELECT'),'password table inaccessible';
end;$$;
rollback;
select 'DB flow tests passed; test data rolled back' as result;
