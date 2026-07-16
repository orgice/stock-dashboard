export type WatchlistItem = { code: string; name: string };

const STORAGE_KEY = "watchlist";

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { code: "005930", name: "삼성전자" },
  { code: "000660", name: "SK하이닉스" },
  { code: "035420", name: "NAVER" },
];

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_WATCHLIST;
  try {
    return JSON.parse(raw) as WatchlistItem[];
  } catch {
    return DEFAULT_WATCHLIST;
  }
}

export function addToWatchlist(item: WatchlistItem): WatchlistItem[] {
  const current = getWatchlist();
  if (current.some((i) => i.code === item.code)) return current;
  const next = [...current, item];
  save(next);
  return next;
}

export function removeFromWatchlist(code: string): WatchlistItem[] {
  const next = getWatchlist().filter((i) => i.code !== code);
  save(next);
  return next;
}

function save(items: WatchlistItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
