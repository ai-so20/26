
DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='send_vip_surprise_completion_message';
 IF v_def IS NULL OR position('''button_url'',v_url' in v_def)=0 THEN RAISE EXCEPTION 'Unexpected completion sender definition'; END IF;
 v_def:=replace(v_def,'''button_url'',v_url)::text','''button_url'',v_url,''ai_process_auto_completion'',true)::text');
 EXECUTE v_def;
END $$;
CREATE OR REPLACE FUNCTION public.sync_vip_surprise_completion_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
END $$;
DROP TRIGGER IF EXISTS sync_vip_surprise_completion_links_trigger ON public.vip_surprise_settings;
CREATE TRIGGER sync_vip_surprise_completion_links_trigger AFTER UPDATE OF action_url ON public.vip_surprise_settings FOR EACH ROW EXECUTE FUNCTION public.sync_vip_surprise_completion_links();
WITH verified AS (
 SELECT DISTINCT pm.id
 FROM public.private_messages pm
 JOIN public.private_chats pc ON pc.id=pm.chat_id
 JOIN public.vip_surprise_process_runs r ON r.member_id=pc.member_id
 CROSS JOIN public.vip_surprise_settings s
 WHERE r.completion_message_sent_at IS NOT NULL
 AND abs(extract(epoch from (pm.created_at-r.completion_message_sent_at)))<15
 AND pm.content LIKE '[[LINK_BUTTON]]%'
 AND (substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb ->> 'text')=s.completion_message
 AND (substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb ->> 'button_text')=s.action_label
 AND (substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb ->> 'button_url')=s.action_url
)
UPDATE public.private_messages pm
SET content='[[LINK_BUTTON]]'||(substring(pm.content from length('[[LINK_BUTTON]]')+1)::jsonb || '{"ai_process_auto_completion":true}'::jsonb)::text
FROM verified v WHERE pm.id=v.id;
