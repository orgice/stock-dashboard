"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWatchlist } from "@/lib/watchlist";
import { DisclosureFeed } from "@/components/DisclosureFeed";
import type { Disclosure } from "@/lib/dart";

export default function DisclosuresPage() {
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const watchlist = getWatchlist();
    if (watchlist.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    Promise.all(
      watchlist.map((item) =>
        fetch(`/api/dart/disclosures?code=${item.code}`)
          .then((res) => res.json())
          .then((data) => data.disclosures as Disclosure[])
      )
    )
      .then((lists) => {
        const merged = lists.flat().sort((a, b) => (a.date < b.date ? 1 : -1));
        setDisclosures(merged);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-3xl mx-auto w-full p-6 flex flex-col gap-6">
      <Link href="/" className="text-sm text-black/50 dark:text-white/50 hover:underline">
        ← 관심종목으로
      </Link>

      <header>
        <h1 className="text-xl font-bold">공시 피드</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          관심종목의 최근 공시를 쉬운 설명과 함께 확인하세요.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">불러오는 중...</p>
      ) : (
        <DisclosureFeed
          disclosures={disclosures}
          emptyMessage="관심종목이 없거나 최근 공시가 없습니다."
        />
      )}
    </main>
  );
}
