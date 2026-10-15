import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const PUSH_TITLE = "🎁 오늘의 이벤트가 시작되었습니다♥";
const PUSH_BODY = "참여하시고 다양한 혜택과 상품 받아가세요!";
const PUSH_URL = "/?tab=event&from=push";
const PUSH_TAG = "vip-daily-event";

function getKstParts() {
  const d = new Date(Date.now() + KST_OFFSET_MS);
  return {
    dateKey: d.toISOString().slice(0, 10),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server environment variables are missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function setupWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "https://26-beige.vercel.app";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID environment variables are missing.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function runDailyPush() {
  const supabase = createAdmin();
  setupWebPush();

  const kst = getKstParts();

  // 안전장치: 이 API가 다른 시간에 잘못 호출되어도 KST 오전 11시대가 아니면 발송하지 않음.
  if (kst.hour !== 11) {
    return { ok: true, skipped: true, reason: "outside_11_kst", kst };
  }

  // DB UNIQUE(date_key)가 하루 1회 발송 락 역할을 한다.
  const { error: lockError } = await supabase
    .from("daily_event_push_log")
    .insert({ date_key: kst.dateKey });

  if (lockError) {
    if (lockError.code === "23505") {
      return { ok: true, skipped: true, reason: "already_sent_today", date: kst.dateKey };
    }
    throw lockError;
  }

  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth");

  if (subError) throw subError;

  if (!subscriptions?.length) {
    await supabase
      .from("daily_event_push_log")
      .update({ sent_count: 0, failed_count: 0, finished_at: new Date().toISOString() })
      .eq("date_key", kst.dateKey);

    return { ok: true, sent: 0, failed: 0, reason: "no_subscriptions" };
  }

  const payload = JSON.stringify({
    title: PUSH_TITLE,
    body: PUSH_BODY,
    tag: PUSH_TAG,
    url: PUSH_URL,
    type: "VIP_DAILY_EVENT",
  });

  let sent = 0;
  let failed = 0;

  // 한 번에 너무 많은 요청을 몰아넣지 않도록 작은 묶음으로 처리.
  const BATCH = 50;
  for (let i = 0; i < subscriptions.length; i += BATCH) {
    const chunk = subscriptions.slice(i, i + BATCH);

    await Promise.all(
      chunk.map(async (item) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: item.endpoint,
              keys: { p256dh: item.p256dh, auth: item.auth },
            },
            payload,
            {
              TTL: 60 * 60 * 6,
              urgency: "high",
              topic: "vip-daily-event",
            }
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          const status = error?.statusCode;

          // 브라우저가 폐기한 구독은 자동 정리.
          if (status === 404 || status === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", item.id);
          } else {
            console.error("daily event push error", status, error?.message);
          }
        }
      })
    );
  }

  await supabase
    .from("daily_event_push_log")
    .update({
      sent_count: sent,
      failed_count: failed,
      finished_at: new Date().toISOString(),
    })
    .eq("date_key", kst.dateKey);

  return {
    ok: true,
    date: kst.dateKey,
    subscriptions: subscriptions.length,
    sent,
    failed,
  };
}

export async function POST() {
  try {
    return NextResponse.json(await runDailyPush());
  } catch (error) {
    console.error("daily event push route error", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Daily event push failed." },
      { status: 500 }
    );
  }
}

// Supabase pg_net에서 GET으로 호출해도 동작하도록 지원.
export async function GET() {
  return POST();
}
