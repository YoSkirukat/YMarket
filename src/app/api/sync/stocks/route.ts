import { NextResponse } from "next/server";
import { pushAllStocksToMarket, syncStocksFromMarket } from "@/lib/sync";
import { requireApiUser } from "@/lib/auth";

export async function POST(request: Request) {
  const { error } = await requireApiUser();
  if (error) return error;
  try {
    const url = new URL(request.url);
    const direction = url.searchParams.get("direction") || "pull";

    if (direction === "push") {
      const result = await pushAllStocksToMarket();
      return NextResponse.json(result);
    }

    const result = await syncStocksFromMarket();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
