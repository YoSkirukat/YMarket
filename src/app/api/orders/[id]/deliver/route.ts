import { NextResponse } from "next/server";
import { deliverOrderById } from "@/lib/sync";
import { requireApiUser } from "@/lib/auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireApiUser();
  if (error) return error;
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
