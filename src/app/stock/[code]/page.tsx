import Link from "next/link";
import { getQuote } from "@/lib/krx";
import { getDisclosures, getFinancials } from "@/lib/dart";
import { getRates } from "@/lib/ecos";
import { withValuation } from "@/lib/valuation";
import { FinancialChart } from "@/components/FinancialChart";
import { DisclosureFeed } from "@/components/DisclosureFeed";
import { RateCompareWidget } from "@/components/RateCompareWidget";

type Props = { params: Promise<{ code: string }> };

export default async function StockDetailPage({ params }: Props) {
  const { code } = await params;
  const [rawQuote, financials, disclosures, rates] = await Promise.all([
    getQuote(code),
    getFinancials(code),
    getDisclosures(code),
    getRates(),
  ]);
  const quote = rawQuote ? await withValuation(code, rawQuote) : null;

  return (
    <main className="max-w-3xl mx-auto w-full p-6 flex flex-col gap-6">
      <Link href="/" className="text-sm text-black/50 dark:text-white/50 hover:underline">
        ← 관심종목으로
      </Link>

      {quote ? (
        <header className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-bold">{quote.name}</h1>
              <p className="text-xs text-black/50 dark:text-white/50">{code}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{quote.price.toLocaleString()}원</p>
              <p className={quote.changeRate >= 0 ? "text-red-500" : "text-blue-500"}>
                {quote.changeRate >= 0 ? "+" : ""}
                {quote.changeRate.toFixed(2)}%
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-black/60 dark:text-white/60">
            <span>PER {quote.per?.toFixed(1) ?? "-"}</span>
            <span>PBR {quote.pbr?.toFixed(1) ?? "-"}</span>
            <span>
              배당 {quote.dividendYield !== undefined ? `${quote.dividendYield.toFixed(1)}%` : "-"}
            </span>
          </div>
        </header>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          시세 정보를 찾을 수 없습니다. (종목코드: {code})
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">최근 실적</h2>
        <FinancialChart financials={financials} />
      </section>

      {quote && (
        <section>
          <RateCompareWidget dividendYield={quote.dividendYield} rates={rates} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">최근 공시</h2>
        <DisclosureFeed disclosures={disclosures} />
      </section>
    </main>
  );
}
