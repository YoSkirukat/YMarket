import { NextResponse } from "next/server";
import { getSettings, prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    ...settings,
    apiKey: settings.apiKey ? "••••••••" + settings.apiKey.slice(-4) : "",
    hasApiKey: Boolean(settings.apiKey),
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const current = await getSettings();

  const apiKey =
    typeof body.apiKey === "string" && !body.apiKey.startsWith("••••")
      ? body.apiKey.trim()
      : current.apiKey;

  const updated = await prisma.settings.update({
    where: { id: 1 },
    data: {
      apiKey,
      campaignId: String(body.campaignId ?? "").trim(),
      businessId: String(body.businessId ?? "").trim(),
      warehouseId: String(body.warehouseId ?? "").trim(),
      shopName: String(body.shopName ?? "").trim(),
      activateTill: String(body.activateTill ?? "2099-12-31").trim(),
      slipText: String(body.slipText ?? "").trim(),
      autoDeliver: Boolean(body.autoDeliver),
      webhookSecret: String(body.webhookSecret ?? "").trim(),
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
