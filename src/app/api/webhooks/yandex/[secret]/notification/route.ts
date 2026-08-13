import {
  handleYandexWebhook,
  handleYandexWebhookInfo,
} from "@/lib/yandex-webhook";

type RouteContext = {
  params: Promise<{ secret: string }>;
};

/** С секретом: base URL .../yandex/{secret} → POST .../yandex/{secret}/notification */
export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  return handleYandexWebhook(request, decodeURIComponent(secret));
}

export async function GET() {
  return handleYandexWebhookInfo();
}
