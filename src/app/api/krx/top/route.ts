import { NextRequest, NextResponse } from "next/server";
import { getTopStocks } from "@/lib/krx";
import { withValuationBatch } from "@/lib/valuation";

export async function GET(req: NextRequest) {
  const n = Number(req.nextUrl.searchParams.get("n") ?? "10");
  const ranked = await getTopStocks(n);

  const valued = await withValuationBatch(
    Object.fromEntries(ranked.map(({ code, ...quote }) => [code, quote]))
  );

  // withValuationBatch returns a Record, which loses the market-cap rank
  // order — reassemble the response from `ranked` to keep it.
  const stocks = ranked.map(({ code }) => ({ code, ...valued[code] }));
  return NextResponse.json({ stocks });
}
