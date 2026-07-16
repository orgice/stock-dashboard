import Link from "next/link";
import type { Quote } from "@/lib/krx";

type Props = {
  code: string;
  quote: Quote;
  onRemove?: (code: string) => void;
  onAdd?: (code: string, name: string) => void;
  added?: boolean;
};

export function WatchlistCard({ code, quote, onRemove, onAdd, added }: Props) {
  const isUp = quote.changeRate >= 0;

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/stock/${code}`} className="font-semibold hover:underline">
            {quote.name}
          </Link>
          <p className="text-xs text-black/50 dark:text-white/50">{code}</p>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(code)}
            className="text-xs text-black/40 hover:text-red-500"
            aria-label="관심종목에서 삭제"
          >
            삭제
          </button>
        )}
        {onAdd &&
          (added ? (
            <span className="text-xs text-black/30 dark:text-white/30">추가됨</span>
          ) : (
            <button
              onClick={() => onAdd(code, quote.name)}
              className="text-xs text-black/40 hover:text-black dark:hover:text-white"
              aria-label="관심종목에 추가"
            >
              + 추가
            </button>
          ))}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{quote.price.toLocaleString()}원</span>
        <span className={isUp ? "text-red-500" : "text-blue-500"}>
          {isUp ? "+" : ""}
          {quote.changeRate.toFixed(2)}%
        </span>
      </div>
      {quote.asOfDate && (
        <p className="text-xs text-black/40 dark:text-white/40">
          {formatAsOfDate(quote.asOfDate)} 종가 기준 (실시간 아님)
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs text-black/60 dark:text-white/60">
        <span>PER {quote.per?.toFixed(1) ?? "-"}</span>
        <span>PBR {quote.pbr?.toFixed(1) ?? "-"}</span>
        <span>배당 {quote.dividendYield !== undefined ? `${quote.dividendYield.toFixed(1)}%` : "-"}</span>
      </div>
    </div>
  );
}

// "20260715" -> "7/15"
function formatAsOfDate(basDd: string): string {
  const month = Number(basDd.slice(4, 6));
  const day = Number(basDd.slice(6, 8));
  return `${month}/${day}`;
}
