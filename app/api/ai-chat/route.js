export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ success: true, enabled: false, directory: [] });
}
export async function POST() {
  return Response.json({ success: false, enabled: false, error: "AI 캐릭터 대화는 사용하지 않습니다." }, { status: 410 });
}
