import { NextRequest, NextResponse } from "next/server";
import { getWatchlistQuotes } from "@/lib/krx";
import { withValuationBatch } from "@/lib/valuation";
import { rateLimitOrNull } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const limited = rateLimitOrNull(req);
  if (limited) return limited;

  const codes = req.nextUrl.searchParams.get("codes");
  if (!codes) {
    return NextResponse.json({ error: "codes is required" }, { status: 400 });
  }
  const quotes = await withValuationBatch(await getWatchlistQuotes(codes.split(",")));
  return NextResponse.json({ quotes });
}
