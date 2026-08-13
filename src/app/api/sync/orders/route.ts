import { NextResponse } from "next/server";
import { syncOrders } from "@/lib/sync";
import { requireApiUser } from "@/lib/auth";

export async function POST() {
  const { error } = await requireApiUser();
  if (error) return error;
  try {
    const result = await syncOrders();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
