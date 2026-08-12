import { NextResponse } from "next/server";
import { deliverOrderById } from "@/lib/sync";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const order = await deliverOrderById(id);
    return NextResponse.json({ ok: true, order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
