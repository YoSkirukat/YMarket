import { NextResponse } from "next/server";
import { getSettings } from "@/lib/prisma";
import { syncOrders } from "@/lib/sync";

const ORDER_EVENTS = new Set([
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_STATUS_UPDATED",
  "ORDER_CANCELLED",
  "ORDER_CANCELLATION_REQUEST",
]);

/**
 * Приём push-уведомлений Яндекс Маркета.
 * В кабинете укажите URL: https://your-host/api/webhooks/yandex?secret=...
 *
 * На PING Маркет ждёт ответ за 1 сек в формате { version, name, time }.
 */
export async function POST(request: Request) {
  try {
    const settings = await getSettings();
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret") || "";

    if (settings.webhookSecret && secret !== settings.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      notificationType?: string;
    } | null;

    const notificationType = body?.notificationType ?? "";

    // События по заказам — синхронизируем в фоне, ответ Маркету не блокируем
    if (ORDER_EVENTS.has(notificationType)) {
      void syncOrders().catch(() => undefined);
    }

    return NextResponse.json({
      version: "1.0.0",
      name: settings.shopName || "Digital Seller",
      time: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
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
