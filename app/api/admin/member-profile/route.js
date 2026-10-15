import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function cleanText(value = "") {
  return String(value || "").normalize("NFKC").trim();
}

function realNameToAuthEmail(realName = "") {
  const normalized = cleanText(realName).toLowerCase();
  const hash = createHash("sha256").update(normalized, "utf8").digest("hex");
  return `vip-${hash}@example.com`;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!accessToken) {
      return Response.json({ success: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ success: false, error: "Supabase 관리자 환경변수가 없습니다." }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
    const requester = authData?.user;

    if (authError || !requester?.id) {
      return Response.json({ success: false, error: "관리자 세션이 유효하지 않습니다." }, { status: 401 });
    }

    const { data: me } = await adminClient
      .from("profiles")
      .select("id, role, approval_status")
      .eq("id", requester.id)
      .maybeSingle();

    if (!me || me.role !== "admin" || String(me.approval_status) !== "1") {
      return Response.json({ success: false, error: "관리자만 실행할 수 있습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const memberId = cleanText(body?.memberId);
    const nickname = cleanText(body?.nickname);
    const realName = cleanText(body?.realName);

    if (!memberId || !nickname || !realName) {
      return Response.json({ success: false, error: "닉네임과 성함을 모두 입력해주세요." }, { status: 400 });
    }

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", memberId)
      .maybeSingle();

    if (targetError || !target) {
      return Response.json({ success: false, error: "대상 회원을 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.role === "admin") {
      return Response.json({ success: false, error: "이 화면에서는 관리자 계정 정보를 변경할 수 없습니다." }, { status: 400 });
    }

    const { data: duplicateNick } = await adminClient
      .from("profiles")
      .select("id")
      .eq("nickname", nickname)
      .neq("id", memberId)
      .limit(1);

    if (duplicateNick?.length) {
      return Response.json({ success: false, error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    const { data: duplicateName } = await adminClient
      .from("profiles")
      .select("id")
      .eq("real_name", realName)
      .neq("id", memberId)
      .limit(1);

    if (duplicateName?.length) {
      return Response.json({ success: false, error: "이미 로그인에 사용 중인 성함입니다." }, { status: 409 });
    }

    // 성함이 로그인 아이디이므로 Auth 이메일도 새 성함 기준으로 즉시 동기화합니다.
    // admin API에서 변경하므로 별도 이메일 확인 절차 없이 현재 계정에 반영됩니다.
    const nextAuthEmail = realNameToAuthEmail(realName);
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(memberId, {
      email: nextAuthEmail,
      email_confirm: true,
      user_metadata: { nickname, real_name: realName },
    });

    if (authUpdateError) {
      return Response.json(
        { success: false, error: `로그인 아이디 동기화 실패: ${authUpdateError.message}` },
        { status: 400 }
      );
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ nickname, real_name: realName })
      .eq("id", memberId);

    if (profileUpdateError) {
      return Response.json({ success: false, error: profileUpdateError.message }, { status: 400 });
    }

    // 채팅/이벤트 표시 닉네임도 같은 UUID의 members 행에 동기화합니다.
    const { error: memberUpdateError } = await adminClient
      .from("members")
      .update({ nickname })
      .eq("id", memberId);

    if (memberUpdateError) {
      console.error("members nickname sync warning:", memberUpdateError);
    }

    return Response.json({
      success: true,
      memberId,
      nickname,
      realName,
      loginName: realName,
    });
  } catch (error) {
    console.error("admin member profile route error:", error);
    return Response.json(
      { success: false, error: error?.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
