CREATE OR REPLACE FUNCTION public.sync_vip_surprise_completion_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF NEW.action_url IS DISTINCT FROM OLD.action_url THEN
  IF trim(coalesce(NEW.action_url,'')) !~* '^https://[^[:space:]]+$' THEN
   RAISE EXCEPTION '확인 버튼 주소는 https:// 주소여야 합니다';
  END IF;
  UPDATE public.private_messages pm
  SET content='[[LINK_BUTTON]]'||(substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb || jsonb_build_object('button_url',trim(NEW.action_url)))::text
  WHERE pm.content LIKE '[[LINK_BUTTON]]%'
    AND (substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb ->> 'ai_process_auto_completion')='true';
 END IF;
 RETURN NEW;
END $function$
