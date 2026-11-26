import crypto from "crypto";
import {
  listVisibleProducts,
  updateProductShop16688BySlug,
  type Product,
} from "./db";
import { env } from "./env";

export type Shop16688Response<T = unknown> = {
  code: number;
  msg: string;
  time: number;
  data: T | null;
};

export type Shop16688GoodsItem = {
  goods_no: string;
  source?: string;
  name: string;
  description?: string;
  image?: string;
  delivery_method?: number;
  available_quantity?: number;
  unit_price?: number;
};

export type Shop16688Category = {
  goods_category_no: string;
  name: string;
  status: number;
};

export type Shop16688OrderSummary = {
  trade_no: string;
  platform?: string;
  identity?: string;
  goods_no?: string;
  goods_name?: string;
  status: number; // 0待支付 / 1待发货 / 2已关闭 / 3已退款 / 4已发货 / 5已完成
  total_amount: number;
  create_time: number;
};

export type Shop16688OrderDetail = Shop16688OrderSummary & {
  delivery_method?: number;
  quantity?: number;
  cards?: Array<{ code: string; sold_time?: number }>;
  content?: string;
  instruction?: string;
  manual_instruction?: string;
};

function getShop16688Config() {
  return {
    baseUrl: env("SHOP16688_BASE_URL", "https://www.16688.com.cn/openApi").replace(
      /\/$/,
      "",
    ),
    appId: env("SHOP16688_APP_ID"),
    secret: env("SHOP16688_APP_SECRET"),
    shopUrl: env("SHOP16688_SHOP_URL").trim(),
    goodsUrlTemplate: env(
      "SHOP16688_GOODS_URL_TEMPLATE",
      "https://www.16688.com.cn/goods/{goods_no}",
    ).trim(),
  };
}

export function isShop16688ApiConfigured() {
  const { appId, secret } = getShop16688Config();
  return Boolean(appId && secret);
}

/**
 * Resolves the direct 16688 payment/product URL for a product:
 * 1. Explicit per-product `shop16688_url` (set in DB/admin)
 * 2. `SHOP16688_GOODS_URL_TEMPLATE` with `{goods_no}` placeholder (e.g. https://.../goods/{goods_no})
 * 3. Fallback `SHOP16688_SHOP_URL` (storefront URL)
 */
export function resolveShop16688PayUrl(product?: Pick<Product, "shop16688_url" | "shop16688_goods_no"> | null): string {
  const cfg = getShop16688Config();
  if (product?.shop16688_url?.trim()) {
    return product.shop16688_url.trim();
  }
  if (product?.shop16688_goods_no?.trim() && cfg.goodsUrlTemplate) {
    return cfg.goodsUrlTemplate.replaceAll(
      "{goods_no}",
      encodeURIComponent(product.shop16688_goods_no.trim()),
    );
  }
  return cfg.shopUrl || "";
}

export function isAlipay16688Enabled() {
  const cfg = getShop16688Config();
  return Boolean(cfg.shopUrl || cfg.goodsUrlTemplate || (cfg.appId && cfg.secret));
}

function normalizeForSign(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForSign);
  }
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = normalizeForSign((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

function canonicalSignValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return JSON.stringify(normalizeForSign(value));
  }
  return String(value);
}

/**
 * Official 16688 OpenAPI HMAC-SHA256 signature:
 * POST\n<controller_lower>\n<action_lower>\n<ascii-sorted k=v&...>
 */
export function signShop16688(
  controller: string,
  action: string,
  params: Record<string, unknown>,
  secret: string,
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign")
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const query = keys.map((k) => `${k}=${canonicalSignValue(params[k])}`).join("&");
  const plain = `POST\n${controller.toLowerCase()}\n${action.toLowerCase()}\n${query}`;
  return crypto.createHmac("sha256", secret).update(plain, "utf8").digest("hex");
}

export async function shop16688Call<T = unknown>(
  controller: string,
  action: string,
  bizParams: Record<string, unknown> = {},
): Promise<Shop16688Response<T>> {
  const { baseUrl, appId, secret } = getShop16688Config();
  if (!appId || !secret) {
    throw new Error("未配置 SHOP16688_APP_ID / SHOP16688_APP_SECRET");
  }

  const payload: Record<string, unknown> = {
    app_id: appId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    nonce: crypto.randomBytes(12).toString("hex"),
    ...bizParams,
  };
  payload.sign = signShop16688(controller, action, payload, secret);

  const res = await fetch(`${baseUrl}/${controller}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "magfield-16688/0.1",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const text = await res.text();
  let json: Shop16688Response<T>;
  try {
    json = JSON.parse(text) as Shop16688Response<T>;
  } catch {
    throw new Error(`16688 接口返回非 JSON: HTTP ${res.status}`);
  }
  return json;
}

export async function shop16688ListCategories(pageNo = 1, pageSize = 100) {
  return shop16688Call<{ total: number; list: Shop16688Category[] }>(
    "goodsCategory",
    "list",
    { page_no: pageNo, page_size: pageSize },
  );
}

export async function shop16688CreateCategory(name: string, sort = 0) {
  return shop16688Call<Shop16688Category>("goodsCategory", "create", {
    name,
    image: "",
    sort,
  });
}

export async function shop16688GenerateCover(text: string) {
  return shop16688Call<{ url: string; width: number; height: number }>(
    "goods",
    "cover",
    { text: text.slice(0, 80) },
  );
}

export async function shop16688ListGoods(pageNo = 1, pageSize = 100) {
  return shop16688Call<{ total: number; list: Shop16688GoodsItem[] }>(
    "goods",
    "list",
    { page_no: pageNo, page_size: pageSize, source: "local" },
  );
}

export async function shop16688CreateOrUpdateGoods(input: {
  goodsNo?: string;
  name: string;
  image: string;
  description: string;
  price: number;
  costPrice?: number;
  categoryNo?: string;
  sort?: number;
  manualInstruction: string;
}) {
  const params: Record<string, unknown> = {
    name: input.name.slice(0, 255),
    image: input.image,
    description: input.description,
    delivery_method: 3, // 人工发货：由 Magfield 核单后自动从带土出卡并回写发货
    price: input.price,
    manual_instruction: input.manualInstruction,
    agent_status: 0,
    sort: input.sort ?? 0,
  };
  if (input.goodsNo) params.goods_no = input.goodsNo;
  if (input.costPrice && input.costPrice > 0) params.cost_price = input.costPrice;
  if (input.categoryNo) params.goods_category_no = input.categoryNo;
  return shop16688Call<{ goods_no: string; audit_status: number; status: number }>(
    "goods",
    "create",
    params,
  );
}

export async function shop16688ListOrders(params: {
  pageNo?: number;
  pageSize?: number;
  status?: number | "";
  keywords?: string;
  startTime?: number;
  endTime?: number;
}) {
  const biz: Record<string, unknown> = {
    page_no: params.pageNo ?? 1,
    page_size: params.pageSize ?? 20,
    status: params.status ?? "",
    platform: "shop",
    keywords: params.keywords ?? "",
  };
  if (params.startTime) biz.start_time = params.startTime;
  if (params.endTime) biz.end_time = params.endTime;
  return shop16688Call<{ total: number; list: Shop16688OrderSummary[] }>(
    "order",
    "list",
    biz,
  );
}

export async function shop16688GetOrderInfo(tradeNo: string) {
  return shop16688Call<Shop16688OrderDetail>("order", "info", {
    trade_no: tradeNo.trim(),
  });
}

export async function shop16688DeliverOrder(tradeNo: string) {
  return shop16688Call<{ trade_no: string; status: number }>("order", "deliver", {
    trade_no: tradeNo.trim(),
  });
}

function categoryNameForSlug(slug: string) {
  if (slug.startsWith("gpt-")) return "ChatGPT";
  if (slug.startsWith("claude-")) return "Claude";
  if (slug.startsWith("grok-")) return "Grok";
  if (slug.startsWith("gemini-")) return "Gemini";
  if (slug.startsWith("codex-")) return "Codex";
  return "AI 订阅";
}

export type Sync16688Report = {
  ok: boolean;
  message: string;
  synced: Array<{ slug: string; name: string; price: number; goodsNo: string; action: "created" | "updated" }>;
  failed: Array<{ slug: string; name: string; error: string }>;
};

/**
 * Batch uploads/updates all visible Magfield products to 16688 shop using OpenAPI.
 * Idempotent: matches existing goods by saved `shop16688_goods_no` or exact name.
 */
export async function syncCatalogTo16688(): Promise<Sync16688Report> {
  const catRes = await shop16688ListCategories(1, 100);
  if (catRes.code !== 1) {
    return {
      ok: false,
      message: catRes.msg || "16688 OpenAPI 暂不可用",
      synced: [],
      failed: [],
    };
  }

  const catMap = new Map<string, string>();
  for (const c of catRes.data?.list || []) {
    catMap.set(c.name, c.goods_category_no);
  }

  const goodsRes = await shop16688ListGoods(1, 100);
  if (goodsRes.code !== 1) {
    return {
      ok: false,
      message: goodsRes.msg || "拉取 16688 商品列表失败",
      synced: [],
      failed: [],
    };
  }
  const existingByName = new Map<string, Shop16688GoodsItem>();
  const existingByNo = new Map<string, Shop16688GoodsItem>();
  for (const g of goodsRes.data?.list || []) {
    existingByName.set(g.name.trim(), g);
    existingByNo.set(g.goods_no, g);
  }

  const products = listVisibleProducts();
  const baseAppUrl = env("APP_BASE_URL", "https://magfieldai.top").replace(/\/$/, "");
  const synced: Sync16688Report["synced"] = [];
  const failed: Sync16688Report["failed"] = [];

  for (const p of products) {
    try {
      const catName = categoryNameForSlug(p.slug);
      let catNo = catMap.get(catName);
      if (!catNo) {
        const createdCat = await shop16688CreateCategory(catName, p.sort_order);
        if (createdCat.code === 1 && createdCat.data?.goods_category_no) {
          catNo = createdCat.data.goods_category_no;
          catMap.set(catName, catNo);
        }
      }

      const existing =
        (p.shop16688_goods_no ? existingByNo.get(p.shop16688_goods_no) : undefined) ||
        existingByName.get(p.name.trim());

      let imageUrl = existing?.image || "";
      if (!imageUrl) {
        const cover = await shop16688GenerateCover(p.name);
        if (cover.code !== 1 || !cover.data?.url) {
          throw new Error(cover.msg || "生成文字封面失败");
        }
        imageUrl = cover.data.url;
      }

      const manualInstruction = [
        `<p><strong>感谢付款！</strong></p>`,
        `<p>请返回 Magfield 付款页面或 <a href="${baseAppUrl}/orders" target="_blank">${baseAppUrl}/orders</a> 领取您的卡密 / 账号资料。</p>`,
        `<p>下单时请确保填写与 Magfield 一致的验证邮箱，系统将自动核对付款并出卡；如需协助请联系 support@magfieldai.top。</p>`,
      ].join("");

      const res = await shop16688CreateOrUpdateGoods({
        goodsNo: existing?.goods_no || p.shop16688_goods_no || undefined,
        name: p.name,
        image: imageUrl,
        description: p.description || p.summary,
        price: p.price_cny,
        costPrice: p.cost_cny || undefined,
        categoryNo: catNo,
        sort: p.sort_order,
        manualInstruction,
      });

      if (res.code !== 1 || !res.data?.goods_no) {
        throw new Error(res.msg || "创建/更新商品失败");
      }

      const goodsNo = res.data.goods_no;
      const resolvedUrl = resolveShop16688PayUrl({
        shop16688_url: p.shop16688_url,
        shop16688_goods_no: goodsNo,
      });
      updateProductShop16688BySlug(p.slug, {
        goodsNo,
        url: resolvedUrl && resolvedUrl !== getShop16688Config().shopUrl ? resolvedUrl : "",
      });

      synced.push({
        slug: p.slug,
        name: p.name,
        price: p.price_cny,
        goodsNo,
        action: existing ? "updated" : "created",
      });
    } catch (err) {
      failed.push({
        slug: p.slug,
        name: p.name,
        error: err instanceof Error ? err.message : "同步失败",
      });
    }
  }

  return {
    ok: failed.length === 0,
    message:
      failed.length === 0
        ? `成功同步 ${synced.length} 个商品至 16688 店铺`
        : `同步完成：成功 ${synced.length} 个，失败 ${failed.length} 个`,
    synced,
    failed,
  };
}
