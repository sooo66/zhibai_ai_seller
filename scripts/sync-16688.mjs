#!/usr/bin/env node
import crypto from "crypto";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// Load local .env if present
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const baseUrl = (process.env.SHOP16688_BASE_URL || "https://www.16688.com.cn/openApi").replace(/\/$/, "");
const appId = process.env.SHOP16688_APP_ID || "";
const secret = process.env.SHOP16688_APP_SECRET || "";
const goodsUrlTemplate = (
  process.env.SHOP16688_GOODS_URL_TEMPLATE || "https://www.16688.com.cn/goods/{goods_no}"
).trim();
const appBaseUrl = (process.env.APP_BASE_URL || "https://magfieldai.top").replace(/\/$/, "");
const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || "./data/zhibai.db");

if (!appId || !secret) {
  console.error("Missing SHOP16688_APP_ID or SHOP16688_APP_SECRET in .env");
  process.exit(1);
}

function normalizeObj(v) {
  if (Array.isArray(v)) return v.map(normalizeObj);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = normalizeObj(v[k]);
    return out;
  }
  return v;
}
function canonical(v) {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(normalizeObj(v));
  return String(v);
}
async function call16688(controller, action, biz = {}) {
  const payload = {
    app_id: appId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    nonce: crypto.randomBytes(12).toString("hex"),
    ...biz,
  };
  const keys = Object.keys(payload).filter((k) => k !== "sign").sort();
  const qs = keys.map((k) => `${k}=${canonical(payload[k])}`).join("&");
  const plain = `POST\n${controller.toLowerCase()}\n${action.toLowerCase()}\n${qs}`;
  payload.sign = crypto.createHmac("sha256", secret).update(plain, "utf8").digest("hex");
  const res = await fetch(`${baseUrl}/${controller}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function catNameForSlug(slug) {
  if (slug.startsWith("gpt-")) return "ChatGPT";
  if (slug.startsWith("claude-")) return "Claude";
  if (slug.startsWith("grok-")) return "Grok";
  if (slug.startsWith("gemini-")) return "Gemini";
  if (slug.startsWith("codex-")) return "Codex";
  return "AI 订阅";
}

async function main() {
  const catRes = await call16688("goodsCategory", "list", { page_no: 1, page_size: 100 });
  if (catRes.code !== 1) {
    console.error(`[16688] OpenAPI unavailable: ${catRes.msg}`);
    process.exit(2);
  }
  const catMap = new Map((catRes.data?.list || []).map((c) => [c.name, c.goods_category_no]));

  const goodsRes = await call16688("goods", "list", { page_no: 1, page_size: 100, source: "local" });
  if (goodsRes.code !== 1) {
    console.error(`[16688] Failed listing goods: ${goodsRes.msg}`);
    process.exit(2);
  }
  const byName = new Map();
  const byNo = new Map();
  for (const g of goodsRes.data?.list || []) {
    byName.set(g.name.trim(), g);
    byNo.set(g.goods_no, g);
  }

  const db = new Database(dbPath);
  const rows = db
    .prepare("SELECT * FROM products WHERE visible = 1 ORDER BY sort_order ASC, id ASC")
    .all();

  const updateStmt = db.prepare(
    `UPDATE products
     SET shop16688_goods_no = ?,
         shop16688_url = CASE WHEN ? <> '' THEN ? ELSE shop16688_url END
     WHERE id = ?`,
  );

  for (const p of rows) {
    const catName = catNameForSlug(p.slug);
    let catNo = catMap.get(catName);
    if (!catNo) {
      const created = await call16688("goodsCategory", "create", { name: catName, image: "", sort: p.sort_order });
      if (created.code === 1 && created.data?.goods_category_no) {
        catNo = created.data.goods_category_no;
        catMap.set(catName, catNo);
      }
    }

    const existing = (p.shop16688_goods_no && byNo.get(p.shop16688_goods_no)) || byName.get(p.name.trim());
    let image = existing?.image || "";
    if (!image) {
      const cov = await call16688("goods", "cover", { text: p.name.slice(0, 80) });
      if (cov.code !== 1 || !cov.data?.url) {
        console.error(`[FAIL] ${p.slug}: cover failed — ${cov.msg}`);
        continue;
      }
      image = cov.data.url;
    }

    const manualInstruction =
      `<p><strong>感谢付款！</strong></p>` +
      `<p>请回到 Magfield 付款页面或 <a href="${appBaseUrl}/orders" target="_blank">${appBaseUrl}/orders</a> 查看自动发放的卡密 / 账号资料。</p>`;

    const params = {
      name: p.name,
      image,
      description: p.description || p.summary,
      delivery_method: 3,
      price: p.price_cny,
      manual_instruction: manualInstruction,
      agent_status: 0,
      sort: p.sort_order,
    };
    if (existing?.goods_no || p.shop16688_goods_no) params.goods_no = existing?.goods_no || p.shop16688_goods_no;
    if (p.cost_cny > 0) params.cost_price = p.cost_cny;
    if (catNo) params.goods_category_no = catNo;

    const r = await call16688("goods", "create", params);
    if (r.code !== 1 || !r.data?.goods_no) {
      console.error(`[FAIL] ${p.slug}: ${r.msg}`);
      continue;
    }
    const goodsNo = r.data.goods_no;
    const url = goodsUrlTemplate ? goodsUrlTemplate.replaceAll("{goods_no}", encodeURIComponent(goodsNo)) : "";
    updateStmt.run(goodsNo, url, url, p.id);
    console.log(`[OK] ${existing ? "updated" : "created"} ${p.slug} -> ${goodsNo} (¥${p.price_cny}, cost ¥${p.cost_cny})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
