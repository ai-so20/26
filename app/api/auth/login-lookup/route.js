import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

function cleanText(value = "") {
  return String(value || "").normalize("NFKC").trim();
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const realName = cleanText(body?.realName);

    if (!realName || realName.length > 80) {
      return Response.json({ success: false }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ success: false }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 동명이인을 허용하므로 같은 성함의 모든 계정을 찾습니다.
    // 실제 로그인은 브라우저에서 입력한 비밀번호와 맞는 계정만 성공합니다.
    const { data: rows, error } = await adminClient
      .from("profiles")
      .select("id")
      .eq("real_name", realName)
      .limit(20);

    if (error || !rows?.length) {
      return Response.json({ success: false }, { status: 404 });
    }

    const emails = [];
    for (const row of rows) {
      const { data: authResult } = await adminClient.auth.admin.getUserById(row.id);
      const email = authResult?.user?.email;
      if (email) emails.push(email);
    }

    if (!emails.length) {
      return Response.json({ success: false }, { status: 404 });
    }

    return Response.json(
      { success: true, email: emails[0], emails },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ success: false }, { status: 500 });
  }
}
