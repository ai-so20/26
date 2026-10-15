import { createClient } from "@supabase/supabase-js";
import { AVATAR_KEYS, isValidAvatarKey, pickAndCountLeastUsedAvatar } from "../../../../lib/avatarPool";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST() {
  try {
    const adminClient = getAdminClient();
    if (!adminClient) {
      return Response.json({ success: false, error: "서버 설정을 확인해주세요." }, { status: 500 });
    }

    const [{ data: profiles, error: profileError }, { data: aiCharacters, error: aiError }] = await Promise.all([
      adminClient.from("profiles").select("id, avatar"),
      adminClient.from("ai_characters").select("id, avatar"),
    ]);

    if (profileError || aiError) {
      throw profileError || aiError;
    }

    const allRows = [...(profiles || []), ...(aiCharacters || [])];
    const counts = Object.fromEntries(AVATAR_KEYS.map((key) => [key, 0]));

    for (const row of allRows) {
      const key = String(row?.avatar || "");
      if (isValidAvatarKey(key)) counts[key] += 1;
    }

    const profileUpdates = [];
    for (const row of profiles || []) {
      if (isValidAvatarKey(row?.avatar)) continue;
      profileUpdates.push({ id: row.id, avatar: pickAndCountLeastUsedAvatar(counts) });
    }

    const aiUpdates = [];
    for (const row of aiCharacters || []) {
      if (isValidAvatarKey(row?.avatar)) continue;
      aiUpdates.push({ id: row.id, avatar: pickAndCountLeastUsedAvatar(counts) });
    }

    for (const row of profileUpdates) {
      const { error } = await adminClient.from("profiles").update({ avatar: row.avatar }).eq("id", row.id);
      if (error) throw error;
    }

    for (const row of aiUpdates) {
      const { error } = await adminClient.from("ai_characters").update({ avatar: row.avatar }).eq("id", row.id);
      if (error) throw error;
    }

    return Response.json({
      success: true,
      updatedProfiles: profileUpdates.length,
      updatedAiCharacters: aiUpdates.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("avatar ensure route error:", error);
    return Response.json({ success: false, error: "프로필 자동 배정 중 오류가 발생했습니다." }, { status: 500 });
  }
}
