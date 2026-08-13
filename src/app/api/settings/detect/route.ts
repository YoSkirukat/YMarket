import { NextResponse } from "next/server";
import { verifyAndFillCampaignIds } from "@/lib/sync";
import { requireApiUser } from "@/lib/auth";

export async function POST() {
  const { error } = await requireApiUser();
  if (error) return error;
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
