import AdmZip from "adm-zip";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// DART identifies companies by an 8-digit corp_code, not the 6-digit KRX
// stock code used everywhere else in this app. DART publishes a bulk
// stock_code -> corp_code mapping as a zipped XML file (~4MB, ~100k rows).
// We download it once, cache the parsed map to disk, and reuse it across
// server restarts for up to a week (DART updates it infrequently).
const CACHE_PATH = path.join(process.cwd(), ".cache", "dart-corp-code.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let inMemory: Map<string, string> | null = null;
let loadPromise: Promise<Map<string, string>> | null = null;

export async function resolveCorpCode(stockCode: string): Promise<string | null> {
  const map = await getCorpCodeMap();
  return map.get(stockCode) ?? null;
}

async function getCorpCodeMap(): Promise<Map<string, string>> {
  if (inMemory) return inMemory;
  if (!loadPromise) loadPromise = load();
  return loadPromise;
}

async function load(): Promise<Map<string, string>> {
  const cached = await readCache();
  if (cached) {
    inMemory = cached;
    return cached;
  }

  const map = await downloadAndParse();
  inMemory = map;
  await writeCache(map).catch(() => {
    // Disk cache is best-effort; in-memory map still works for this process.
  });
  return map;
}

async function readCache(): Promise<Map<string, string> | null> {
  try {
    const raw = await readFile(CACHE_PATH, "utf-8");
    const { savedAt, entries } = JSON.parse(raw) as {
      savedAt: number;
      entries: [string, string][];
    };
    if (Date.now() - savedAt > CACHE_TTL_MS) return null;
    return new Map(entries);
  } catch {
    return null;
  }
}

async function writeCache(map: Map<string, string>): Promise<void> {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const entries = Array.from(map.entries());
  await writeFile(CACHE_PATH, JSON.stringify({ savedAt: Date.now(), entries }));
}

async function downloadAndParse(): Promise<Map<string, string>> {
  const res = await fetch(
    `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${process.env.DART_API_KEY}`
  );
  if (!res.ok) throw new Error(`DART corpCode download failed: ${res.status}`);

  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(zipBuffer);
  const xml = zip.readAsText("CORPCODE.xml");

  const map = new Map<string, string>();
  const listRegex = /<list>([\s\S]*?)<\/list>/g;
  let match: RegExpExecArray | null;
  while ((match = listRegex.exec(xml)) !== null) {
    const block = match[1];
    const corpCode = block.match(/<corp_code>(.*?)<\/corp_code>/)?.[1];
    const stockCode = block.match(/<stock_code>(.*?)<\/stock_code>/)?.[1]?.trim();
    if (corpCode && stockCode) {
      map.set(stockCode, corpCode);
    }
  }
  return map;
}
