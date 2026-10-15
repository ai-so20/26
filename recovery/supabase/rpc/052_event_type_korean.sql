CREATE OR REPLACE FUNCTION public.event_type_korean(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case t
    when 'gift_box' then '랜덤 선물상자'
    when 'number' then '숫자 맞히기'
    when 'roulette' then '룰렛'
    when 'first_come' then '선착순'
    when 'quiz' then '퀴즈'
    when 'draw' then '자동 추첨'
    when 'attendance' then '출석'
    else coalesce(t, '이벤트')
  end;
$function$
