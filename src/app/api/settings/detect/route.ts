import { NextResponse } from "next/server";
import { verifyAndFillCampaignIds } from "@/lib/sync";

export async function POST() {
  try {
    const data = await verifyAndFillCampaignIds();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
