CREATE OR REPLACE FUNCTION public.finish_auto_event(target_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_winner uuid;
  v_result jsonb;
begin
  v_winner := public.ensure_event_winner(target_event_id);

  update public.events
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now())
  where id = target_event_id;

  if v_winner is not null then
    begin
      v_result := public.fulfill_event_reward(target_event_id);
    exception when others then
      insert into public.event_reward_deliveries(
        event_id, winner_id, last_error, updated_at
      )
      values(
        target_event_id,
        v_winner,
        'fulfill_exception: ' || sqlerrm,
        now()
      )
      on conflict(event_id) do update
      set
        winner_id = excluded.winner_id,
        last_error = excluded.last_error,
        updated_at = now();
    end;
  end if;
end;
$function$
