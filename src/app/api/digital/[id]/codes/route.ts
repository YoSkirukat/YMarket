import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncDigitalProductStock } from "@/lib/sync";

const STATUS_LABEL: Record<string, string> = {
  available: "в наличии",
  reserved: "зарезервирован",
  sold: "продан",
  invalid: "недействителен",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    const body = await request.json();
    const force = Boolean(body.force);
    const rawCodes: string[] = Array.isArray(body.codes)
      ? body.codes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];

    // Unique within the request, keep first occurrence order
    const codes = [...new Set(rawCodes)];

    if (!codes.length) {
      return NextResponse.json({ error: "Нет кодов" }, { status: 400 });
    }

    const existing = await prisma.activationCode.findMany({
      where: { productId: id, code: { in: codes } },
      select: { id: true, code: true, status: true },
    });

    if (existing.length > 0 && !force) {
      return NextResponse.json(
        {
          needsConfirmation: true,
          duplicates: existing.map((row) => ({
            code: row.code,
            status: row.status,
            statusLabel: STATUS_LABEL[row.status] ?? row.status,
          })),
        },
        { status: 409 },
      );
    }

    const existingByCode = new Map(existing.map((row) => [row.code, row]));
    let added = 0;
    let reactivated = 0;
    let skipped = 0;

    for (const code of codes) {
      const found = existingByCode.get(code);
      if (!found) {
        await prisma.activationCode.create({
          data: {
            productId: id,
            code,
            status: "available",
          },
        });
        added += 1;
        continue;
      }

      if (found.status === "available") {
        skipped += 1;
        continue;
      }

      await prisma.activationCode.update({
        where: { id: found.id },
        data: {
          status: "available",
          orderId: null,
          soldAt: null,
          note: force ? "Повторно добавлен вручную" : null,
        },
      });
      reactivated += 1;
      added += 1;
    }

    const synced = await syncDigitalProductStock(id);
    const nextStock = synced?.stock ?? 0;

    return NextResponse.json({
      added,
      reactivated,
      skipped,
      stock: nextStock,
      market: { ok: true },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get("codeId");
    if (!codeId) {
      return NextResponse.json({ error: "codeId обязателен" }, { status: 400 });
    }

    const code = await prisma.activationCode.findFirst({
      where: { id: codeId, productId: id },
    });
    if (!code) {
      return NextResponse.json({ error: "Код не найден" }, { status: 404 });
    }
    if (code.status === "sold") {
      return NextResponse.json(
        { error: "Нельзя удалить проданный код" },
        { status: 400 },
      );
    }

    await prisma.activationCode.delete({ where: { id: codeId } });

    if (code.status === "available" || code.status === "reserved") {
      await syncDigitalProductStock(id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
