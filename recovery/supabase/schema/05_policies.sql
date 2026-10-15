CREATE POLICY ai_process_admin_select_all ON public.ai_process_members AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));
CREATE POLICY ai_process_member_select_own ON public.ai_process_members AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Approved members can read group messages" ON public.group_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = '1'::text) AND ((p.role = 'admin'::text) OR (p.group_joined_at IS NULL) OR (group_messages.created_at >= p.group_joined_at))))));
CREATE POLICY "Approved members can send group messages" ON public.group_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((member_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.approval_status = '1'::text)))) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.approval_status = '1'::text)))) OR (((timezone('Asia/Seoul'::text, now()))::time without time zone >= '11:00:00'::time without time zone) AND ((timezone('Asia/Seoul'::text, now()))::time without time zone < '18:30:00'::time without time zone) AND (NOT COALESCE(( SELECT s.is_frozen
   FROM room_chat_settings s
  WHERE (s.room_id = group_messages.room_id)), false))))));
CREATE POLICY "Approved members can view member nicknames" ON public.members AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.approval_status = 'approved'::text)))));
CREATE POLICY "Private chat participants can view chats" ON public.private_chats AS PERMISSIVE FOR SELECT TO authenticated USING (((member_id = auth.uid()) OR (operator_id = auth.uid())));
CREATE POLICY "Private chat participants can read messages" ON public.private_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM private_chats pc
  WHERE ((pc.id = private_messages.chat_id) AND ((pc.member_id = auth.uid()) OR (pc.operator_id = auth.uid()))))));
CREATE POLICY "Private chat participants can send messages" ON public.private_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM private_chats pc
  WHERE ((pc.id = private_messages.chat_id) AND ((pc.member_id = auth.uid()) OR (pc.operator_id = auth.uid())))))));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated can read room chat settings" ON public.room_chat_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY vip_daily_attendance_select_own ON public.vip_daily_attendance AS PERMISSIVE FOR SELECT TO authenticated USING (((member_id = auth.uid()) OR is_current_user_admin()));
CREATE POLICY vip_surprise_copy_read ON public.vip_surprise_copy_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read guide" ON public.vip_surprise_guide AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY vip_surprise_settings_admin_read ON public.vip_surprise_settings AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));
