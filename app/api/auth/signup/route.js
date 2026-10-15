import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { pickLeastUsedAvatar } from "../../../../lib/avatarPool";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

function cleanText(value = "") {
  return String(value || "").normalize("NFKC").trim();
}

function normalizePasswordInput(value = "") {
  return String(value || "").normalize("NFKC");
}

export async function POST(request) {
  let createdUserId = null;

  try {
    const body = await request.json().catch(() => ({}));
    const nickname = cleanText(body?.nickname);
    const realName = cleanText(body?.realName);
    const password = normalizePasswordInput(body?.password);

    if (!nickname || !realName || !password) {
      return Response.json(
        { success: false, error: "닉네임, 성함, 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }
    if (nickname.length > 40 || realName.length > 80) {
      return Response.json(
        { success: false, error: "닉네임 또는 성함이 너무 깁니다." },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return Response.json(
        { success: false, error: "비밀번호는 4자리 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ success: false, error: "서버 설정을 확인해주세요." }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 닉네임만 고유하게 사용합니다. 성함(real_name)은 동명이인을 허용합니다.
    const { data: duplicateNickname, error: duplicateError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("nickname", nickname)
      .limit(1);

    if (duplicateError) {
      return Response.json({ success: false, error: "회원 정보를 확인하지 못했습니다." }, { status: 500 });
    }
    if (duplicateNickname?.length) {
      return Response.json(
        { success: false, reason: "nickname_taken", error: `${nickname} 닉네임은 이미 사용 중입니다. 다른 닉네임으로 등록해주세요.` },
        { status: 409 }
      );
    }

    // 성함을 Auth 이메일로 사용하지 않습니다.
    // 따라서 김민수/김민수처럼 같은 성함도 각각 독립 계정으로 가입할 수 있습니다.
    const internalEmail = `vip-${randomUUID()}@example.com`;
    const authPassword = `VIP!${password}`;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        nickname,
        real_name: realName,
      },
    });

    createdUserId = created?.user?.id || null;

    if (createError || !createdUserId) {
      const msg = String(createError?.message || "");
      if (/duplicate|unique|nickname/i.test(msg)) {
        return Response.json(
          { success: false, reason: "nickname_taken", error: `${nickname} 닉네임은 이미 사용 중입니다. 다른 닉네임으로 등록해주세요.` },
          { status: 409 }
        );
      }
      return Response.json(
        { success: false, error: "가입 신청을 완료하지 못했습니다. 잠시 후 다시 시도해주세요." },
        { status: 400 }
      );
    }

    // 기존 가입 트리거가 profiles를 생성합니다. 트리거 지연을 고려해 잠깐 재확인합니다.
    let profile = null;
    for (let i = 0; i < 5; i += 1) {
      const { data } = await adminClient
        .from("profiles")
        .select("id, nickname, real_name")
        .eq("id", createdUserId)
        .maybeSingle();
      if (data) {
        profile = data;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    if (!profile) {
      await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
      return Response.json(
        { success: false, error: "회원정보 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // 새 회원은 43개 프로필 중 현재 사용 횟수가 가장 적은 프로필들을 후보로 잡고,
    // 그 후보 안에서 무작위로 1개를 배정합니다. 회원이 직접 고르는 과정은 없습니다.
    const [{ data: profileAvatars, error: profileAvatarError }, { data: aiAvatars, error: aiAvatarError }] = await Promise.all([
      adminClient.from("profiles").select("avatar"),
      adminClient.from("ai_characters").select("avatar"),
    ]);

    if (profileAvatarError || aiAvatarError) {
      await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
      return Response.json(
        { success: false, error: "프로필 자동 배정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    const assignedAvatar = pickLeastUsedAvatar([...(profileAvatars || []), ...(aiAvatars || [])]);
    const { error: avatarAssignError } = await adminClient
      .from("profiles")
      .update({ avatar: assignedAvatar })
      .eq("id", createdUserId);

    if (avatarAssignError) {
      await adminClient.auth.admin.deleteUser(createdUserId).catch(() => {});
      return Response.json(
        { success: false, error: "프로필 자동 배정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // 환영 메시지는 private_chats 생성 시 DB 트리거가 정확히 한 번 발송합니다.
    // 가입 승인 후 최초 1:1 상담방 개설 시에도 동일하게 적용됩니다.

    return Response.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("signup route error:", error);
    return Response.json(
      { success: false, error: "가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
