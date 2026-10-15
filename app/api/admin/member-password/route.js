import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function normalizePasswordInput(value = "") {
  return String(value || "").normalize("NFKC").trim();
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!accessToken) {
      return Response.json({ success: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { success: false, error: "서버의 Supabase 관리자 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } =
      await adminClient.auth.getUser(accessToken);

    const requester = userData?.user;
    if (userError || !requester?.id) {
      return Response.json({ success: false, error: "관리자 세션이 유효하지 않습니다." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, approval_status")
      .eq("id", requester.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin" ||
      String(profile.approval_status) !== "1"
    ) {
      return Response.json({ success: false, error: "관리자만 실행할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const memberId = String(body?.memberId || "").trim();
    const cleanPassword = normalizePasswordInput(body?.newPassword);

    if (!memberId) {
      return Response.json({ success: false, error: "회원 ID가 없습니다." }, { status: 400 });
    }
    if (cleanPassword.length < 4) {
      return Response.json({ success: false, error: "비밀번호는 4자리 이상이어야 합니다." }, { status: 400 });
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, nickname")
      .eq("id", memberId)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return Response.json({ success: false, error: "대상 회원을 찾을 수 없습니다." }, { status: 404 });
    }

    // 회원가입/로그인에서 사용 중인 내부 비밀번호 규칙과 동일하게 저장합니다.
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      memberId,
      { password: `VIP!${cleanPassword}` }
    );

    if (updateError) {
      return Response.json(
        { success: false, error: updateError.message || "비밀번호 변경에 실패했습니다." },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      memberId,
      nickname: targetProfile.nickname || "회원",
    });
  } catch (error) {
    console.error("admin member password route error:", error);
    return Response.json(
      { success: false, error: error?.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
