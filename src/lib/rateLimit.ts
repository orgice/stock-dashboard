import { NextRequest, NextResponse } from "next/server";

// In-memory fixed-window limiter, keyed by "route:ip". Only protects a single
// warm serverless instance (not distributed across Vercel's fleet), but that's
// enough to stop one abusive client from burning through the DART/KRX/ECOS
// daily API quotas or a Hobby plan's usage limits — the realistic risk for a
// small personal dashboard, more than an actual distributed DDoS.
const LIMIT = 30;
const WINDOW_MS = 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimitOrNull(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${req.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    sweepIfLarge(now);
    return null;
  }

  if (bucket.count >= LIMIT) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  bucket.count++;
  return null;
}

// Expired buckets only get cleared when their key is hit again, so a flood of
// distinct IPs would otherwise grow this map forever. Sweep it periodically
// instead of on every request.
function sweepIfLarge(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
