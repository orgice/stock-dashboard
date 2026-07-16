import { getValuationInputs } from "@/lib/dart";
import type { Quote } from "@/lib/krx";

// Combines a KRX quote (price + shares outstanding) with DART financials
// (EPS, equity, dividend yield) to fill in per/pbr/dividendYield. Mutates
// nothing — returns a new Quote. If DART has no key or no data, the quote
// is returned unchanged (fields stay undefined, rendered as "-" in the UI).
export async function withValuation(stockCode: string, quote: Quote): Promise<Quote> {
  const inputs = await getValuationInputs(stockCode);
  if (!inputs) return quote;

  const per =
    inputs.eps && inputs.eps > 0 ? roundTo(quote.price / inputs.eps, 1) : undefined;
  const pbr =
    inputs.equityWon && quote.sharesOutstanding
      ? roundTo(quote.price / (inputs.equityWon / quote.sharesOutstanding), 1)
      : undefined;
  const dividendYield = inputs.dividendYieldPercent ?? undefined;

  return { ...quote, per, pbr, dividendYield };
}

export async function withValuationBatch(
  quotes: Record<string, Quote>
): Promise<Record<string, Quote>> {
  const entries = await Promise.all(
    Object.entries(quotes).map(
      async ([code, quote]) => [code, await withValuation(code, quote)] as const
    )
  );
  return Object.fromEntries(entries);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
