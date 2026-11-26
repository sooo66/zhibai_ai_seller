import crypto from "crypto";
import { env } from "./env";

export type StockMap = Record<string, number>;
export type DescriptionMap = Record<string, string>;

export type DaituSyncSnapshot = {
  stockByCode: StockMap | null;
  descriptionByCode: DescriptionMap;
  syncedAt: number | null;
  configured: boolean;
};

const DEFAULT_INTERVAL_MS = 60_000;

let cache: {
  at: number;
  stockByCode: StockMap;
  descriptionByCode: DescriptionMap;
} | null = null;
let inflight: Promise<DaituSyncSnapshot> | null = null;
let timerStarted = false;

function getIntervalMs() {
  const sec = Number(env("DAITU_SYNC_INTERVAL_SEC", "60"));
  return Number.isFinite(sec) && sec >= 15 ? sec * 1000 : DEFAULT_INTERVAL_MS;
}

function sign(data: Record<string, string | number>, appKey: string) {
  const filtered = Object.entries(data)
    .filter(([k, v]) => k !== "sign" && v !== "" && v !== undefined && v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const qs = filtered.map(([k, v]) => `${k}=${v}`).join("&");
  return crypto.createHash("md5").update(`${qs}&key=${appKey}`).digest("hex");
}

function htmlToPlainText(raw: string): string {
  return raw
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_, href: string, inner: string) => {
        const text = inner.replace(/<[^>]+>/g, "").trim();
        const cleanHref = href.replace(/\/$/, "");
        if (!text) return cleanHref;
        if (
          text.includes(cleanHref) ||
          text.includes(cleanHref.replace(/^https?:\/\//, ""))
        ) {
          return text;
        }
        return `${text} (${cleanHref})`;
      },
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(ul|ol|p|div|h[1-6]|section|article|tr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/([\u4e00-\u9fff])(https?:\/\/)/g, "$1 $2")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type DaituRawItem = {
  code?: string;
  stock?: number | string;
  description?: string;
  desc?: string;
  content?: string;
  status?: number | string;
};

async function fetchDaituItems(): Promise<{
  stockByCode: StockMap;
  descriptionByCode: DescriptionMap;
} | null> {
  const baseUrl = env("DAITU_BASE_URL", "https://daituai.cc").replace(/\/$/, "");
  const appId = env("DAITU_APP_ID");
  const appKey = env("DAITU_APP_KEY");
  if (!appId || !appKey) return null;

  const payload: Record<string, string | number> = { app_id: appId };
  payload.sign = sign(payload, appKey);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) body.set(k, String(v));

  const res = await fetch(`${baseUrl}/shared/commodity/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "magfield-seller/0.2",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const rawText = (await res.text()).replace(/^\uFEFF/, "");
  const json = JSON.parse(rawText) as {
    code?: number;
    data?: Array<{ children?: DaituRawItem[] }>;
  };
  if (json.code !== 200 || !Array.isArray(json.data)) return null;

  const stockByCode: StockMap = {};
  const descriptionByCode: DescriptionMap = {};
  for (const cat of json.data) {
    for (const child of cat.children || []) {
      if (!child.code) continue;
      const n = Number(child.stock);
      const disabled = child.status !== undefined && Number(child.status) === 0;
      stockByCode[child.code] = disabled ? 0 : Number.isFinite(n) ? n : 0;

      const rawDesc = child.description || child.desc || child.content || "";
      if (typeof rawDesc === "string" && rawDesc.trim()) {
        descriptionByCode[child.code] = htmlToPlainText(rawDesc);
      }
    }
  }
  return { stockByCode, descriptionByCode };
}

function isConfigured() {
  return Boolean(env("DAITU_APP_ID") && env("DAITU_APP_KEY"));
}

async function refreshNow(): Promise<DaituSyncSnapshot> {
  if (!isConfigured()) {
    return {
      stockByCode: null,
      descriptionByCode: {},
      syncedAt: null,
      configured: false,
    };
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetchDaituItems();
      if (data) {
        const now = Date.now();
        cache = {
          at: now,
          stockByCode: data.stockByCode,
          descriptionByCode: data.descriptionByCode,
        };
        return {
          stockByCode: data.stockByCode,
          descriptionByCode: data.descriptionByCode,
          syncedAt: now,
          configured: true,
        };
      }
    } catch {
      // Keep last known snapshot on transient upstream blip
    } finally {
      inflight = null;
    }
    return {
      stockByCode: cache?.stockByCode ?? null,
      descriptionByCode: cache?.descriptionByCode ?? {},
      syncedAt: cache?.at ?? null,
      configured: true,
    };
  })();

  return inflight;
}

/** Ensures a single periodic background refresh loop runs once credentials are configured. */
export function ensureDaituPeriodicSync() {
  if (timerStarted || !isConfigured()) return;
  timerStarted = true;
  const intervalMs = getIntervalMs();
  const handle = setInterval(() => {
    void refreshNow();
  }, intervalMs);
  if (typeof handle === "object" && "unref" in handle && typeof handle.unref === "function") {
    handle.unref();
  }
}

/** Returns latest cached stock & upstream descriptions, refreshing automatically when stale. */
export async function getDaituSyncSnapshot(opts?: { force?: boolean }): Promise<DaituSyncSnapshot> {
  if (!isConfigured()) {
    return {
      stockByCode: null,
      descriptionByCode: {},
      syncedAt: null,
      configured: false,
    };
  }
  ensureDaituPeriodicSync();
  const now = Date.now();
  const ttl = getIntervalMs();
  if (!opts?.force && cache && now - cache.at < ttl) {
    return {
      stockByCode: cache.stockByCode,
      descriptionByCode: cache.descriptionByCode,
      syncedAt: cache.at,
      configured: true,
    };
  }
  return refreshNow();
}

/** Backwards-compatible stock lookup helper. */
export async function getDaituStockByCode(): Promise<StockMap | null> {
  const snap = await getDaituSyncSnapshot();
  return snap.stockByCode;
}

export function isInStock(stockMap: StockMap | null, daituCode: string) {
  if (!stockMap) return true; // unconfigured / unknown → allow click; fulfill API validates
  if (!(daituCode in stockMap)) return true;
  return stockMap[daituCode] > 0;
}
