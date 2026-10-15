import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 20;
const clean = (value) => String(value || "").normalize("NFKC").trim();
const denied = () => Response.json({ success: false, error: "등록된 닉네임과 이름을 확인해주세요." }, { status: 401, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
  try {
    const body = await request.json();
    const nickname = clean(body.nickname), realName = clean(body.realName);
    if (!nickname || !realName || nickname.length > 40 || realName.length > 80) return denied();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return Response.json({ success: false, error: "입장 설정을 확인해주세요." }, { status: 503 });
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: member, error } = await admin.from("profiles").select("id,role,approval_status")
      .eq("nickname", nickname).eq("real_name", realName).maybeSingle();
    if (error || !member || !["member", "admin"].includes(member.role) || member.approval_status !== "1") return denied();
    const { data: account } = await admin.auth.admin.getUserById(member.id);
    if (!account?.user?.email) return denied();
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: account.user.email });
    if (linkError || !link?.properties?.hashed_token) return denied();
    const { data, error: sessionError } = await admin.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
    if (sessionError || !data?.session || data.user?.id !== member.id) return denied();
    return Response.json({ success: true, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } },
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return denied();
  }
}
