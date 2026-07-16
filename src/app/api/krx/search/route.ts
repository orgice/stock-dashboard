import { NextRequest, NextResponse } from "next/server";
import { findStockByName } from "@/lib/krx";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const stock = await findStockByName(name);
  if (!stock) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(stock);
}
