import mockDart from "@/lib/mock/dart.json";
import { resolveCorpCode } from "@/lib/dartCorpCode";
import { createCache } from "@/lib/cache";

export type Disclosure = {
  rceptNo: string;
  title: string;
  date: string;
};

export type FinancialYear = {
  year: number;
  revenue: number;
  operatingProfit: number;
};

type MockEntry = { disclosures: Disclosure[]; financials: FinancialYear[] };
const MOCK_DART = mockDart as Record<string, MockEntry>;

// Disclosures change throughout the day, so their cache TTL is short — just
// enough to absorb quick repeat navigation between pages that list the same
// stock. Financials/valuation come from annual filings and barely change
// within a day, so they get a long TTL to avoid re-hitting DART on every
// watchlist load (this was the main cause of the multi-second quote load).
const disclosuresCache = createCache<Disclosure[]>(5 * 60 * 1000);
const financialsCache = createCache<FinancialYear[]>(12 * 60 * 60 * 1000);
const valuationCache = createCache<ValuationInputs | null>(12 * 60 * 60 * 1000);

// OpenDART: https://opendart.fss.or.kr/api/list.json?crtfc_key=...&corp_code=...
// DART identifies companies by an 8-digit corp_code, not the 6-digit KRX
// stock code used elsewhere in this app — resolveCorpCode() bridges the two
// (see lib/dartCorpCode.ts for how that mapping is fetched and cached).
export async function getDisclosures(stockCode: string): Promise<Disclosure[]> {
  if (!process.env.DART_API_KEY) {
    return MOCK_DART[stockCode]?.disclosures ?? [];
  }
  return disclosuresCache.get(stockCode, () => fetchDisclosures(stockCode));
}

async function fetchDisclosures(stockCode: string): Promise<Disclosure[]> {
  const corpCode = await resolveCorpCode(stockCode);
  if (!corpCode) return [];

  const bgnDe = ninetyDaysAgoYyyymmdd();
  const res = await fetch(
    `https://opendart.fss.or.kr/api/list.json?crtfc_key=${process.env.DART_API_KEY}&corp_code=${corpCode}&bgn_de=${bgnDe}&page_count=20`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`DART API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "000") return [];

  return (data.list ?? []).map(
    (item: { rcept_no: string; report_nm: string; rcept_dt: string }) => ({
      rceptNo: item.rcept_no,
      title: item.report_nm,
      date: formatDate(item.rcept_dt),
    })
  );
}

export async function getFinancials(stockCode: string): Promise<FinancialYear[]> {
  if (!process.env.DART_API_KEY) {
    return MOCK_DART[stockCode]?.financials ?? [];
  }
  return financialsCache.get(stockCode, () => fetchFinancials(stockCode));
}

async function fetchFinancials(stockCode: string): Promise<FinancialYear[]> {
  const corpCode = await resolveCorpCode(stockCode);
  if (!corpCode) return [];

  const years = [0, 1, 2].map((offset) => new Date().getFullYear() - 1 - offset);
  const results = await Promise.all(
    years.map(async (year) => {
      const res = await fetch(
        `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${process.env.DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=CFS`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== "000") return null;

      const revenue = findAccount(data.list, "매출액");
      const operatingProfit = findAccount(data.list, "영업이익");
      return { year, revenue, operatingProfit };
    })
  );

  return results.filter((r): r is FinancialYear => r !== null).reverse();
}

export type ValuationInputs = {
  eps: number | null;
  equityWon: number | null;
  dividendYieldPercent: number | null;
};

// Combines two DART reports for PER/PBR/dividend-yield calculation (done by
// the caller, which also has KRX price + shares outstanding):
// - alotMatter.json (배당에 관한 사항): gives EPS and cash dividend yield
//   directly, already computed by DART — no need to re-derive from raw amounts.
// - fnlttSinglAcntAll.json: gives 자본총계 (total equity, in won) for BPS.
export async function getValuationInputs(stockCode: string): Promise<ValuationInputs | null> {
  if (!process.env.DART_API_KEY) return null;
  return valuationCache.get(stockCode, () => fetchValuationInputs(stockCode));
}

async function fetchValuationInputs(stockCode: string): Promise<ValuationInputs | null> {
  const corpCode = await resolveCorpCode(stockCode);
  if (!corpCode) return null;

  const years = [0, 1, 2].map((offset) => new Date().getFullYear() - 1 - offset);
  for (const year of years) {
    const [alot, equityWon] = await Promise.all([
      fetchAlotMatter(corpCode, year),
      fetchEquityWon(corpCode, year),
    ]);
    if (alot) {
      return { eps: alot.eps, dividendYieldPercent: alot.dividendYieldPercent, equityWon };
    }
  }
  return null;
}

type AlotMatterRow = { se: string; stock_knd: string; thstrm: string };

async function fetchAlotMatter(
  corpCode: string,
  year: number
): Promise<{ eps: number | null; dividendYieldPercent: number | null } | null> {
  const res = await fetch(
    `https://opendart.fss.or.kr/api/alotMatter.json?crtfc_key=${process.env.DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "000") return null;

  const rows = (data.list ?? []) as AlotMatterRow[];
  const eps = parseKoreanNumber(rows.find((r) => /주당순이익\(원\)/.test(r.se))?.thstrm);
  const dividendYieldPercent = parseKoreanNumber(
    rows.find((r) => r.se === "현금배당수익률(%)" && r.stock_knd === "보통주")?.thstrm
  );

  if (eps === null && dividendYieldPercent === null) return null;
  return { eps, dividendYieldPercent };
}

async function fetchEquityWon(corpCode: string, year: number): Promise<number | null> {
  const res = await fetch(
    `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key=${process.env.DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011&fs_div=CFS`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "000") return null;
  const row = (data.list as DartAccountRow[] | undefined)?.find(
    (r) => r.account_nm === "자본총계"
  );
  return row ? Number(row.thstrm_amount) : null;
}

function parseKoreanNumber(value: string | undefined): number | null {
  if (!value || value === "-") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

type DartAccountRow = { account_nm: string; thstrm_amount: string };

function findAccount(list: DartAccountRow[] | undefined, accountName: string): number {
  const row = list?.find((r) => r.account_nm === accountName);
  return row ? Math.round(Number(row.thstrm_amount) / 100_000_000) : 0;
}

function formatDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function ninetyDaysAgoYyyymmdd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
