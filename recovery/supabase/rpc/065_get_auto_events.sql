CREATE OR REPLACE FUNCTION public.get_auto_events()
 RETURNS TABLE(event_id uuid, title text, description text, prize text, event_type text, status text, starts_at timestamp with time zone, ends_at timestamp with time zone, round_number integer, participated boolean, winner_nickname text, my_answer text, my_result_text text, quiz_question text, quiz_option_1 text, quiz_option_2 text, quiz_option_3 text, quiz_option_4 text, revealed_answer text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    e.id,
    e.title,
    e.description,
    e.prize,
    e.event_type,
    e.status,
    e.starts_at,
    e.ends_at,
    e.round_number,

    exists (
      select 1
      from public.event_entries ee
      where ee.event_id = e.id
        and ee.member_id = auth.uid()
    ) as participated,

    (
      select coalesce(p.nickname, m.nickname, a.nickname, 'VIP 회원')
      from public.event_winners ew
      left join public.profiles p on p.id = ew.member_id
      left join public.members m on m.id = ew.member_id
      left join public.ai_characters a on a.id = ew.member_id
      where ew.event_id = e.id
      order by ew.rank asc, ew.id asc
      limit 1
    ) as winner_nickname,

    (
      select ee.answer
      from public.event_entries ee
      where ee.event_id = e.id
        and ee.member_id = auth.uid()
      limit 1
    ) as my_answer,

    (
      select ee.result_text
      from public.event_entries ee
      where ee.event_id = e.id
        and ee.member_id = auth.uid()
      limit 1
    ) as my_result_text,

    case when e.event_type = 'quiz' then q.question else null end,
    case when e.event_type = 'quiz' then q.option_1 else null end,
    case when e.event_type = 'quiz' then q.option_2 else null end,
    case when e.event_type = 'quiz' then q.option_3 else null end,
    case when e.event_type = 'quiz' then q.option_4 else null end,

    case
      when e.status <> 'completed' then null
      when e.event_type = 'number' then s.secret_answer
      when e.event_type = 'gift_box' then s.secret_answer
      when e.event_type = 'quiz' then q.correct_option::text
      else null
    end as revealed_answer

  from public.events e
  left join public.event_game_secrets s
    on s.event_id = e.id
  left join public.event_quiz_bank q
    on e.event_type = 'quiz'
   and s.secret_answer is not null
   and q.id::text = s.secret_answer
  where e.auto_event = true
    and e.schedule_date = (now() at time zone 'Asia/Seoul')::date
  order by e.round_number;
$function$
