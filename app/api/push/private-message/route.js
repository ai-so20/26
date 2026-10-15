import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "https://26-beige.vercel.app";

function notificationPreview(value) {
  const content = String(value || "");
  if (content.startsWith("[[IMAGE]]")) return "사진을 보냈습니다.";
  const formats = [
    ["[[GIFT_REWARD]]", (data) => `🎁 이벤트 당첨 상품이 지급되었습니다! ${String(data?.product_name || "기프티콘")}`],
    ["[[VIP_SURPRISE_LINK]]", (data) => String(data?.text || "🎉 돌발 이벤트 당첨 안내가 도착했습니다.")],
    ["[[LINK_BUTTON]]", (data) => String(data?.text || data?.button_text || "1:1 안내 메시지가 도착했습니다.")],
  ];
  for (const [prefix, describe] of formats) {
    if (!content.startsWith(prefix)) continue;
    try {
      return describe(JSON.parse(content.slice(prefix.length))).replace(/\\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    } catch (_) {
      return "1:1 안내 메시지가 도착했습니다.";
    }
  }
  return content.slice(0, 180) || "새 1:1 메시지가 도착했습니다.";
}

function adminClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  try {
    if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "Push server env is missing." }, { status: 500 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = adminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const sender = authData?.user;
    if (authError || !sender) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const chatId = String(body?.chatId || "");
    const content = String(body?.content || "").slice(0, 180);
    if (!chatId) {
      return NextResponse.json({ error: "chatId is required." }, { status: 400 });
    }

    const { data: chat, error: chatError } = await supabase
      .from("private_chats")
      .select("id,member_id,operator_id")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found." }, { status: 404 });
    }

    let targetUserId = null;

    if (sender.id === chat.member_id) {
      if (chat.operator_id) {
        targetUserId = chat.operator_id;
      } else {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();
        targetUserId = adminProfile?.id || null;
      }
    } else {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sender.id)
        .maybeSingle();

      if (senderProfile?.role !== "admin" && sender.id !== chat.operator_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetUserId = chat.member_id;
    }

    if (!targetUserId || targetUserId === sender.id) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", targetUserId);

    if (subscriptionError) throw subscriptionError;
    if (!subscriptions?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no_subscription" });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    // 홈 화면 앱 아이콘 배지는 일반 그룹채팅이 아니라 1:1 미확인 메시지만 반영합니다.
    let badgeCount = 0;
    if (String(targetUserId) === String(chat.member_id)) {
      const { count } = await supabase
        .from("private_messages")
        .select("id", { count: "exact", head: true })
        .eq("chat_id", chatId)
        .eq("is_deleted", false)
        .eq("is_read", false)
        .neq("sender_id", targetUserId);
      badgeCount = Math.max(0, Number(count || 0));
    }

    const payload = JSON.stringify({
      title: "AI PROCESS VIP · 1:1 새 메시지",
      body: notificationPreview(content),
      tag: `vip-private-${chatId}`,
      url: "/?tab=private",
      badgeCount,
    });

    let sent = 0;
    let expired = 0;
    const failures = [];

    await Promise.all(
      subscriptions.map(async (item) => {
        try {
          const pushResponse = await webpush.sendNotification(
            {
              endpoint: item.endpoint,
              keys: { p256dh: item.p256dh, auth: item.auth },
            },
            payload,
            {
              TTL: 60 * 60 * 6,
              urgency: "high",
            }
          );
          sent += 1;
          await supabase.from("private_push_delivery_log").insert({
            chat_id: chatId,
            target_user_id: targetUserId,
            subscription_id: item.id,
            status: "sent",
            http_status: Number(pushResponse?.statusCode || 0) || null,
          });
        } catch (error) {
          const status = Number(error?.statusCode || 0);
          if (status === 404 || status === 410) {
            expired += 1;
            await supabase.from("push_subscriptions").delete().eq("id", item.id);
          } else {
            failures.push({
              status: status || null,
              message: String(error?.message || "web-push failed").slice(0, 160),
            });
            console.error("web-push error", status, error?.message);
          }

          await supabase.from("private_push_delivery_log").insert({
            chat_id: chatId,
            target_user_id: targetUserId,
            subscription_id: item.id,
            status: status === 404 || status === 410 ? "expired" : "failed",
            http_status: status || null,
            error_message: String(error?.message || "web-push failed").slice(0, 500),
          });
        }
      })
    );

    if (sent < 1) {
      const reason = expired > 0 && expired === subscriptions.length
        ? "expired_subscription"
        : failures.length > 0
          ? "web_push_failed"
          : "not_sent";

      return NextResponse.json({
        ok: false,
        sent: 0,
        reason,
        subscriptionCount: subscriptions.length,
        expired,
        failures,
      });
    }

    return NextResponse.json({
      ok: true,
      sent,
      subscriptionCount: subscriptions.length,
      expired,
      failed: failures.length,
    });
  } catch (error) {
    console.error("private push route error", error);
    return NextResponse.json({ error: error?.message || "Push failed." }, { status: 500 });
  }
}
