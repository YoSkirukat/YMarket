import { NextResponse } from "next/server";
import { syncProducts } from "@/lib/sync";

export async function POST() {
  try {
    const result = await syncProducts();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
