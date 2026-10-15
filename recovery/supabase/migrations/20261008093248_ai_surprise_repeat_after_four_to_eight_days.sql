do $$
declare v_definition text;
begin
 select pg_get_functiondef(p.oid) into v_definition
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='advance_vip_surprise_processes';
 if v_definition is null or position('vip_surprise_operating_slot(coalesce(v_run.finished_at,v_now),2,3)' in v_definition)=0 then
   raise exception 'Expected AI recurrence schedule not found; migration aborted';
 end if;
 v_definition:=replace(v_definition,
   'vip_surprise_operating_slot(coalesce(v_run.finished_at,v_now),2,3)',
   'vip_surprise_operating_slot(coalesce(v_run.finished_at,v_now),4,8)');
 execute v_definition;
end $$;