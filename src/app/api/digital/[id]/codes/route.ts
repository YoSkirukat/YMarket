import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushStockToMarket } from "@/lib/sync";

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
    const codes: string[] = Array.isArray(body.codes)
      ? body.codes.map((c: unknown) => String(c).trim()).filter(Boolean)
      : [];

    if (!codes.length) {
      return NextResponse.json({ error: "Нет кодов" }, { status: 400 });
    }

    let added = 0;
    let skipped = 0;

    for (const code of codes) {
      try {
        await prisma.activationCode.create({
          data: {
            productId: id,
            code,
            status: "available",
          },
        });
        added += 1;
      } catch {
        skipped += 1;
      }
    }

    const nextStock = product.stock + added;
    const updated = await prisma.product.update({
      where: { id },
      data: {
        isDigital: true,
        stock: nextStock,
      },
    });

    let market: { ok: boolean; error?: string } | null = null;
    if (added > 0) {
      try {
        await pushStockToMarket(updated.offerId, nextStock);
        market = { ok: true };
      } catch (err) {
        market = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return NextResponse.json({
      added,
      skipped,
      stock: nextStock,
      market,
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

    const product = await prisma.product.findUnique({ where: { id } });
    await prisma.activationCode.delete({ where: { id: codeId } });

    if (product && code.status === "available") {
      const nextStock = Math.max(0, product.stock - 1);
      await prisma.product.update({
        where: { id },
        data: { stock: nextStock },
      });
      try {
        await pushStockToMarket(product.offerId, nextStock);
      } catch {
        // локально уже обновлено
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
