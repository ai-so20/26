alter table public.vip_surprise_process_runs add column if not exists completion_push_sent_at timestamptz;
create or replace function public.dispatch_vip_surprise_completion_push() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare v_secret text; v_request bigint;
begin
 if new.source_type<>'real' or new.status<>'completed' or old.status='completed' or new.completion_message_sent_at is null or new.completion_push_sent_at is not null then return new; end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='vip_surprise_push_secret' limit 1;
 if v_secret is null then raise warning 'Surprise push secret missing'; return new; end if;
 select net.http_post(url:='https://vip-event-gamma.vercel.app/api/push/surprise-winner',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),body:=jsonb_build_object('runId',new.id,'phase','complete'),timeout_milliseconds:=10000) into v_request;
 return new;
end $$;
drop trigger if exists trg_dispatch_vip_surprise_completion_push on public.vip_surprise_process_runs;
create trigger trg_dispatch_vip_surprise_completion_push after update of status on public.vip_surprise_process_runs for each row execute function public.dispatch_vip_surprise_completion_push();