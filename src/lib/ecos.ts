import mockEcos from "@/lib/mock/ecos.json";

export type Rates = {
  baseRate: number;
  treasuryYield3Y: number;
  treasuryYield10Y: number;
};

// ECOS: https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/{count}/{statCode}/{cycle}/{start}/{end}/{itemCode}
// Base rate (722Y001, item 0101000) is published monthly.
// Market rates incl. treasury yields (817Y002, items 010200000/010210000) are published daily.
export async function getRates(): Promise<Rates> {
  if (!process.env.ECOS_API_KEY) {
    return mockEcos as Rates;
  }

  const key = process.env.ECOS_API_KEY;
  const [baseRate, y3, y10] = await Promise.all([
    fetchLatestValue(key, "722Y001", "0101000", "M", recentMonthRange()),
    fetchLatestValue(key, "817Y002", "010200000", "D", recentDayRange()),
    fetchLatestValue(key, "817Y002", "010210000", "D", recentDayRange()),
  ]);

  return { baseRate, treasuryYield3Y: y3, treasuryYield10Y: y10 };
}

async function fetchLatestValue(
  key: string,
  statCode: string,
  itemCode: string,
  cycle: "M" | "D",
  [start, end]: [string, string]
): Promise<number> {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/20/${statCode}/${cycle}/${start}/${end}/${itemCode}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ECOS API error: ${res.status}`);
  const data = await res.json();
  const rows = data.StatisticSearch?.row ?? [];
  const latest = rows[rows.length - 1];
  return latest ? Number(latest.DATA_VALUE) : 0;
}

// Statistics lag by a few days, so look back over a window and take the most
// recent row rather than a single date (which may land on a weekend/holiday).
function recentMonthRange(): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 2);
  return [yyyymm(start), yyyymm(end)];
}

function recentDayRange(): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  return [yyyymmdd(start), yyyymmdd(end)];
}

function yyyymm(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yyyymmdd(d: Date): string {
  return `${yyyymm(d)}${String(d.getDate()).padStart(2, "0")}`;
}
