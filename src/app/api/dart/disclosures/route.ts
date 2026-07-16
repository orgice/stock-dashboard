import { NextRequest, NextResponse } from "next/server";
import { getDisclosures } from "@/lib/dart";
import { rateLimitOrNull } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const limited = rateLimitOrNull(req);
  if (limited) return limited;

  const stockCode = req.nextUrl.searchParams.get("code");
  if (!stockCode) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const disclosures = await getDisclosures(stockCode);
  return NextResponse.json({ disclosures });
}
