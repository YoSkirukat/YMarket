import { NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/prisma";
import { syncOrders } from "@/lib/sync";

/**
 * Уведомления Маркета, по которым нужно обновить заказы.
 * Дополнительно реагируем на любой тип, содержащий ORDER, — чтобы не пропустить
 * смену статуса (в т.ч. на DELIVERED), если Маркет пришлёт новый тип события.
 */
const ORDER_EVENTS = new Set([
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_STATUS_UPDATED",
  "ORDER_STATUS_CHANGED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_CANCELLATION_REQUEST",
]);

function isOrderEvent(type: string) {
  return ORDER_EVENTS.has(type) || type.includes("ORDER");
}

/**
 * Маркет шлёт POST на {baseUrl}/notification.
 * Секрет — в пути (query ?secret= несовместим: Маркет дописывает /notification в конец строки).
 *
 * Без секрета:  https://host/api/webhooks/yandex
 *               → POST .../yandex/notification
 * С секретом:   https://host/api/webhooks/yandex/ВАШ_СЕКРЕТ
 *               → POST .../yandex/ВАШ_СЕКРЕТ/notification
 */
export async function handleYandexWebhook(
  request: Request,
  pathSecret = "",
) {
  try {
    const settings = await getSettings();
    const expected = settings.webhookSecret.trim();

    if (expected && pathSecret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      notificationType?: string;
    } | null;

    const notificationType = body?.notificationType ?? "";

    if (notificationType) {
      // Фиксируем приём уведомления, чтобы в журнале было видно, доходят ли они.
      await prisma.syncLog
        .create({
          data: {
            type: "webhook",
            message: `Уведомление Маркета: ${notificationType}`,
          },
        })
        .catch(() => undefined);
    }

    if (isOrderEvent(notificationType)) {
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
