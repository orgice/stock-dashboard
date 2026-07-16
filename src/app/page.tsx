"use client";

import { useEffect, useState } from "react";
import { WatchlistCard } from "@/components/WatchlistCard";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
} from "@/lib/watchlist";
import type { Quote } from "@/lib/krx";

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    // Synced from localStorage, a browser-only source — must run post-hydration
    // to avoid an SSR/client render mismatch, so this can't be lazy initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchlist(getWatchlist());
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuotes({});
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/krx/quote?codes=${watchlist.map((w) => w.code).join(",")}`)
      .then((res) => res.json())
      .then((data) => setQuotes(data.quotes ?? {}))
      .finally(() => setLoading(false));
  }, [watchlist]);

  function handleRemove(code: string) {
    setWatchlist(removeFromWatchlist(code));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setWatchlist(addToWatchlist({ code: newCode.trim(), name: newName.trim() }));
    setNewCode("");
    setNewName("");
  }

  return (
    <main className="max-w-3xl mx-auto w-full p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold">관심종목</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          시세, 재무지표, 공시를 한눈에 확인하세요.
        </p>
      </header>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="종목코드 (예: 005930)"
          className="flex-1 rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="종목명 (예: 삼성전자)"
          className="flex-1 rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium"
        >
          추가
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">불러오는 중...</p>
      ) : watchlist.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          관심종목이 없습니다. 위에서 종목을 추가해보세요.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {watchlist.map((item) =>
            quotes[item.code] ? (
              <WatchlistCard
                key={item.code}
                code={item.code}
                quote={quotes[item.code]}
                onRemove={handleRemove}
              />
            ) : null
          )}
        </div>
      )}

      <a href="/disclosures" className="text-sm underline text-black/60 dark:text-white/60">
        관심종목 공시 피드 보기 →
      </a>
    </main>
  );
}
