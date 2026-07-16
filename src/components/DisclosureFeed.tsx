import type { Disclosure } from "@/lib/dart";
import { summarizeDisclosure } from "@/lib/summarize";

type Props = {
  disclosures: Disclosure[];
  emptyMessage?: string;
};

export function DisclosureFeed({ disclosures, emptyMessage }: Props) {
  if (disclosures.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        {emptyMessage ?? "최근 공시가 없습니다."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {disclosures.map((d) => (
        <li key={d.rceptNo} className="rounded-lg border border-black/10 dark:border-white/15 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-medium text-sm">{d.title}</p>
            <span className="text-xs text-black/40 dark:text-white/40 shrink-0">{d.date}</span>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            {summarizeDisclosure(d.title)}
          </p>
        </li>
      ))}
    </ul>
  );
}
