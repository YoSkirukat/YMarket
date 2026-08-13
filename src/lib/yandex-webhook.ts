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
 * Маркет шлёт POST на {baseUrl}/notification.
 * В кабинете укажите base: https://your-host/api/webhooks/yandex?secret=...
 */
export async function handleYandexWebhook(request: Request) {
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

export async function handleYandexWebhookInfo() {
  return NextResponse.json({
    ok: true,
    message: "Yandex Market webhook endpoint",
  });
}
