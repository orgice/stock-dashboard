import mockQuotes from "@/lib/mock/krx.json";
import { createCache } from "@/lib/cache";

export type Quote = {
  name: string;
  price: number;
  changeRate: number;
  sharesOutstanding?: number;
  // Not directly available from the "유가증권 일별매매정보" (stk_bydd_trd) API —
  // that endpoint only covers OHLCV/market cap/shares. These are computed by
  // lib/valuation.ts by combining this quote with DART financials; undefined
  // means "not computed yet", not zero.
  per?: number;
  pbr?: number;
  dividendYield?: number;
  // The trading day this closing price is from (YYYYMMDD). This API is
  // end-of-day settlement data, not a live feed, so the UI needs this to show
  // users the price isn't real-time. Undefined for mock data.
  asOfDate?: string;
};

const MOCK_QUOTES = mockQuotes as Record<string, Quote>;

type KrxRow = {
  BAS_DD: string;
  ISU_CD: string;
  ISU_NM: string;
  TDD_CLSPRC: string;
  FLUC_RT: string;
  LIST_SHRS: string;
};

// KRX Open API: https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd
// (유가증권 일별매매정보). Requires header "AUTH_KEY". Returns the full day's
// trading data for every KOSPI-listed stock in one response, so we fetch it
// once and filter in memory rather than making one request per stock code.
export async function getQuote(stockCode: string): Promise<Quote | null> {
  if (!process.env.KRX_API_KEY) {
    return MOCK_QUOTES[stockCode] ?? null;
  }

  const rows = await fetchLatestRows();
  const row = rows.find((r) => r.ISU_CD === stockCode);
  return row ? toQuote(row) : null;
}

export async function getWatchlistQuotes(
  stockCodes: string[]
): Promise<Record<string, Quote>> {
  if (!process.env.KRX_API_KEY) {
    return Object.fromEntries(
      stockCodes
        .map((code) => [code, MOCK_QUOTES[code]] as const)
        .filter(([, q]) => q !== undefined)
    ) as Record<string, Quote>;
  }

  const rows = await fetchLatestRows();
  const wanted = new Set(stockCodes);
  return Object.fromEntries(
    rows.filter((r) => wanted.has(r.ISU_CD)).map((r) => [r.ISU_CD, toQuote(r)])
  );
}

export type RankedQuote = Quote & { code: string };

// Ranks by market cap (price * shares outstanding) since the KRX API has no
// dedicated ranking endpoint — the full day's data already has what's needed.
export async function getTopStocks(n: number): Promise<RankedQuote[]> {
  if (!process.env.KRX_API_KEY) {
    return Object.entries(MOCK_QUOTES)
      .map(([code, quote]) => ({ code, ...quote }))
      .sort((a, b) => marketCap(b) - marketCap(a))
      .slice(0, n);
  }

  const rows = await fetchLatestRows();
  return rows
    .map((r) => ({ code: r.ISU_CD, ...toQuote(r) }))
    .sort((a, b) => marketCap(b) - marketCap(a))
    .slice(0, n);
}

function marketCap(q: Quote): number {
  return q.price * (q.sharesOutstanding ?? 0);
}

// Exact name match wins; falls back to a substring match so "삼성전자" still
// finds "삼성전자우" style variants aren't preferred over the exact hit.
export async function findStockByName(name: string): Promise<{ code: string; name: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (!process.env.KRX_API_KEY) {
    const entries = Object.entries(MOCK_QUOTES);
    const exact = entries.find(([, q]) => q.name === trimmed);
    const partial = entries.find(([, q]) => q.name.includes(trimmed));
    const hit = exact ?? partial;
    return hit ? { code: hit[0], name: hit[1].name } : null;
  }

  const rows = await fetchLatestRows();
  const row = rows.find((r) => r.ISU_NM === trimmed) ?? rows.find((r) => r.ISU_NM.includes(trimmed));
  return row ? { code: row.ISU_CD, name: row.ISU_NM } : null;
}

// The full day's data is identical for every caller until the next trading
// day's numbers are published, so it's cached rather than re-fetched (and
// re-walked-back through empty days) on every request.
const latestRowsCache = createCache<KrxRow[]>(10 * 60 * 1000);

async function fetchLatestRows(): Promise<KrxRow[]> {
  return latestRowsCache.get("latest", loadLatestRows);
}

// KRX only publishes a day's data after market close, and there's none on
// weekends/holidays — so "today" is often empty. Walk backward until a
// trading day with data is found.
async function loadLatestRows(): Promise<KrxRow[]> {
  for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
    const rows = await fetchRowsForDate(daysAgoYyyymmdd(daysAgo));
    if (rows.length > 0) return rows;
  }
  return [];
}

async function fetchRowsForDate(basDd: string): Promise<KrxRow[]> {
  try {
    const res = await fetch(
      `https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd?basDd=${basDd}`,
      { headers: { AUTH_KEY: process.env.KRX_API_KEY! }, cache: "no-store" }
    );
    if (!res.ok) {
      console.error(`KRX API error: ${res.status} ${await res.text()}`);
      return [];
    }
    const data = await res.json();
    return data.OutBlock_1 ?? [];
  } catch (err) {
    console.error("KRX API request failed:", err);
    return [];
  }
}

function toQuote(row: KrxRow): Quote {
  return {
    name: row.ISU_NM,
    price: Number(row.TDD_CLSPRC),
    changeRate: Number(row.FLUC_RT),
    sharesOutstanding: Number(row.LIST_SHRS),
    asOfDate: row.BAS_DD,
  };
}

function daysAgoYyyymmdd(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
