import {
  handleYandexWebhook,
  handleYandexWebhookInfo,
} from "@/lib/yandex-webhook";

/** Маркет вызывает именно этот путь: {base}/notification */
export async function POST(request: Request) {
  return handleYandexWebhook(request);
}

export async function GET() {
  return handleYandexWebhookInfo();
}
