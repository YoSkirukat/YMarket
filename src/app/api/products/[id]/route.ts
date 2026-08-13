import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushStockToMarket } from "@/lib/sync";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const stock =
      body.stock !== undefined
        ? Math.max(0, Math.floor(Number(body.stock)) || 0)
        : undefined;

    const slipText =
      typeof body.slipText === "string" ? body.slipText.trim() : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        isDigital:
          typeof body.isDigital === "boolean" ? body.isDigital : undefined,
        stock,
        slipText,
      },
    });

    let market: { ok: boolean; mode?: string; error?: string } | null = null;
    if (stock !== undefined) {
      try {
        const pushed = await pushStockToMarket(product.offerId, stock);
        market = { ok: true, mode: pushed.mode };
      } catch (err) {
        market = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return NextResponse.json({ ...product, market });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
