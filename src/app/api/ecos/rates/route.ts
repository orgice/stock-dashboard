import { NextRequest, NextResponse } from "next/server";
import { getRates } from "@/lib/ecos";
import { rateLimitOrNull } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const limited = rateLimitOrNull(req);
  if (limited) return limited;

  const rates = await getRates();
  return NextResponse.json({ rates });
}
