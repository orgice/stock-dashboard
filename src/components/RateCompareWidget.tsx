import type { Rates } from "@/lib/ecos";

type Props = {
  dividendYield?: number;
  rates: Rates;
};

export function RateCompareWidget({ dividendYield, rates }: Props) {
  const beatsTreasury =
    dividendYield !== undefined && dividendYield > rates.treasuryYield3Y;

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15 p-4">
      <p className="text-sm font-medium mb-3">배당 vs 채권금리 비교</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">배당수익률</p>
          <p className="font-semibold">
            {dividendYield !== undefined ? `${dividendYield.toFixed(2)}%` : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">국고채 3년</p>
          <p className="font-semibold">{rates.treasuryYield3Y.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-black/50 dark:text-white/50">기준금리</p>
          <p className="font-semibold">{rates.baseRate.toFixed(2)}%</p>
        </div>
      </div>
      <p className="text-xs text-black/60 dark:text-white/60 mt-3">
        {dividendYield === undefined
          ? "배당수익률 데이터가 없어 비교할 수 없습니다."
          : beatsTreasury
            ? "이 종목의 배당수익률이 국고채 3년물 금리보다 높습니다."
            : "이 종목의 배당수익률이 국고채 3년물 금리보다 낮습니다."}
      </p>
    </div>
  );
}
