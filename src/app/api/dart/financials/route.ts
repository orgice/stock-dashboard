import { NextRequest, NextResponse } from "next/server";
import { getFinancials } from "@/lib/dart";

export async function GET(req: NextRequest) {
  const stockCode = req.nextUrl.searchParams.get("code");
  if (!stockCode) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const financials = await getFinancials(stockCode);
  return NextResponse.json({ financials });
}
