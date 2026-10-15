import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const secret = process.env.VIP_SURPRISE_PUSH_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { runId, phase = "start" } = await request.json();
    if (!["start","complete"].includes(phase)) return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    if (!/^[0-9a-f-]{36}$/i.test(String(runId || ""))) return NextResponse.json({ error: "Invalid run" }, { status: 400 });
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: run, error } = await db.from("vip_surprise_process_runs").select("id,member_id,source_type,status,winner_private_message_sent_at,winner_push_sent_at,completion_message_sent_at,completion_push_sent_at").eq("id", runId).single();
    if (error || !run || run.source_type !== "real" || (phase === "start" ? (run.status !== "running" || !run.winner_private_message_sent_at || run.winner_push_sent_at) : (run.status !== "completed" || !run.completion_message_sent_at || run.completion_push_sent_at))) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const { data: profile } = await db.from("profiles").select("reward_account_type").eq("id", run.member_id).single();
    if (profile?.reward_account_type !== "real") return NextResponse.json({ ok: true, skipped: true });
    const { data: subscriptions, error: subError } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", run.member_id);
    if (subError) throw subError;
    if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0, reason: "no_subscription" });
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://26-beige.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const payload = JSON.stringify(phase === "complete" ? { title: "🎉 AI프로세스 진행 완료", body: "진행 완료 안내가 카카오톡 1:1 고객센터에 도착했습니다. 확인해 주세요.", tag: `vip-surprise-complete-${run.id}`, url: "/?tab=private", icon: "/avatars/admin.png.png", badge: "/avatars/admin.png.png" } : { title: "🎉 VIP 돌발 AI프로세스 당첨", body: "돌발 이벤트에 당첨되셨습니다! 카카오톡 1:1 고객센터에서 상세 안내를 확인해 주세요.", tag: `vip-surprise-${run.id}`, url: "/?tab=private", icon: "/avatars/admin.png.png", badge: "/avatars/admin.png.png" });
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 21600, urgency: "high" });
        sent++;
      } catch (err) {
        if ([404, 410].includes(Number(err?.statusCode))) await db.from("push_subscriptions").delete().eq("id", sub.id);
        else console.error("surprise push delivery failed", err?.statusCode, err?.message);
      }
    }
    if (sent > 0) { const field = phase === "complete" ? "completion_push_sent_at" : "winner_push_sent_at"; await db.from("vip_surprise_process_runs").update({ [field]: new Date().toISOString() }).eq("id", run.id).is(field, null); }
    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("surprise push route error", error);
    return NextResponse.json({ error: "Push delivery failed" }, { status: 500 });
  }
}
