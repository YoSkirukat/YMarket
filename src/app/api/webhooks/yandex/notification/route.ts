import {
  handleYandexWebhook,
  handleYandexWebhookInfo,
} from "@/lib/yandex-webhook";

/** Без секрета: Маркет бьёт сюда с base URL .../yandex */
export async function POST(request: Request) {
  return handleYandexWebhook(request, "");
}

export async function GET() {
  return handleYandexWebhookInfo();
}
