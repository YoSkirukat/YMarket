import { NextResponse } from "next/server";
import { getSettings } from "@/lib/prisma";
import { syncOrders } from "@/lib/sync";

/**
 * Приём push-уведомлений Яндекс Маркета.
 * В кабинете укажите URL: https://your-host/api/webhooks/yandex?secret=...
 */
export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret") || "";

    if (settings.webhookSecret && secret !== settings.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Always acknowledge quickly; process asynchronously via sync
    const body = await request.json().catch(() => null);
    void body;

    const result = await syncOrders();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Yandex Market webhook endpoint",
  });
}
