CREATE OR REPLACE FUNCTION public.dispatch_vip_surprise_winner_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_secret text;v_request bigint;
begin
 if new.source_type<>'real' or new.status<>'running' or new.winner_private_message_sent_at is null or new.winner_push_sent_at is not null then return new;end if;
 if old.winner_private_message_sent_at is not null then return new;end if;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='vip_surprise_push_secret' limit 1;
 if v_secret is null then raise warning 'Surprise push secret missing';return new;end if;
 select net.http_post(url:='https://vip-event-gamma.vercel.app/api/push/surprise-winner',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_secret),body:=jsonb_build_object('runId',new.id),timeout_milliseconds:=10000) into v_request;
 return new;
end $function$
