"use client";

import { useEffect, useState } from "react";
import { WatchlistCard } from "@/components/WatchlistCard";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
} from "@/lib/watchlist";
import type { RankedQuote, Quote } from "@/lib/krx";

const TOP_STOCKS_COUNT = 10;

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [topStocks, setTopStocks] = useState<RankedQuote[]>([]);
  const [newName, setNewName] = useState("");
  const [addState, setAddState] = useState<"idle" | "loading" | "not-found">("idle");

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

  useEffect(() => {
    fetch(`/api/krx/top?n=${TOP_STOCKS_COUNT}`)
      .then((res) => res.json())
      .then((data) => setTopStocks(data.stocks ?? []));
  }, []);

  function handleRemove(code: string) {
    setWatchlist(removeFromWatchlist(code));
  }

  function handleAddItem(code: string, name: string) {
    setWatchlist(addToWatchlist({ code, name }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setAddState("loading");
    const res = await fetch(`/api/krx/search?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      setAddState("not-found");
      return;
    }
    const stock = await res.json();
    handleAddItem(stock.code, stock.name);
    setNewName("");
    setAddState("idle");
  }

  return (
    <main className="max-w-3xl mx-auto w-full p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold">관심종목</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          시세, 재무지표, 공시를 한눈에 확인하세요.
        </p>
      </header>

      <form onSubmit={handleAdd} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setAddState("idle");
            }}
            placeholder="종목명 (예: 삼성전자)"
            className="flex-1 rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addState === "loading"}
            className="rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            추가
          </button>
        </div>
        {addState === "not-found" && (
          <p className="text-xs text-red-500">&quot;{newName}&quot; 종목을 찾을 수 없습니다.</p>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">불러오는 중...</p>
      ) : watchlist.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          관심종목이 없습니다. 종목명을 입력하거나 아래 인기 종목에서 추가해보세요.
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

      {topStocks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-black/70 dark:text-white/70">
            인기 종목 (시가총액 상위 {topStocks.length}개)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topStocks.map(({ code, ...quote }) => (
              <WatchlistCard
                key={code}
                code={code}
                quote={quote}
                onAdd={handleAddItem}
                added={watchlist.some((w) => w.code === code)}
              />
            ))}
          </div>
        </section>
      )}

      <a href="/disclosures" className="text-sm underline text-black/60 dark:text-white/60">
        관심종목 공시 피드 보기 →
      </a>
    </main>
  );
}
