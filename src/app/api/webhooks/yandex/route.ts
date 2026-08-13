import { handleYandexWebhookInfo } from "@/lib/yandex-webhook";

/**
 * Информационный GET. Рабочий endpoint у Маркета:
 * - без секрета: /api/webhooks/yandex/notification
 * - с секретом:  /api/webhooks/yandex/{secret}/notification
 */
export async function GET() {
  return handleYandexWebhookInfo();
}
