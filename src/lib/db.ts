import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { upsertCatalog } from "./catalog";
import { env } from "./env";
import { hashQueryPassword } from "./query-password";
import { allocateUniqueUsdtAmount, getPaymentTtlMinutes } from "./usdt-amount";

export type FulfillType = "card" | "account" | "manual";

export type Product = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  price_cny: number;
  daitu_code: string;
  fulfill_type: FulfillType;
  channel_tag: string;
  account_warning: string;
  visible: number;
  sort_order: number;
  created_at: string;
};

export type User = {
  id: number;
  email: string;
  created_at: string;
  last_login_at: string;
};

export type EmailOtpRow = {
  id: number;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type PaymentStatus =
  | "pending"
  | "confirming"
  | "paid"
  | "failed"
  | "expired"
  | "manual_review";

export type Order = {
  id: number;
  order_no: string;
  product_id: number;
  product_name: string;
  user_id: number | null;
  email: string;
  query_password_hash: string;
  amount_cny: number;
  amount_usdt: number;
  payment_status: PaymentStatus;
  fulfill_status: "none" | "processing" | "done" | "error";
  payment_channel: string;
  payment_tx_id: string | null;
  expires_at: string | null;
  daitu_trade_no: string | null;
  deliver_secret: string | null;
  fulfill_error: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
};

let db: Database.Database | null = null;

function resolveDbPath() {
  const configured = env("DATABASE_PATH", "./data/zhibai.db");
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function columnExists(database: Database.Database, table: string, column: string) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return cols.some((c) => c.name === column);
}

function migrateSchema(database: Database.Database) {
  if (!columnExists(database, "orders", "payment_channel")) {
    database.exec(
      `ALTER TABLE orders ADD COLUMN payment_channel TEXT NOT NULL DEFAULT 'usdt_trc20'`,
    );
  }
  if (!columnExists(database, "orders", "payment_tx_id")) {
    database.exec(`ALTER TABLE orders ADD COLUMN payment_tx_id TEXT`);
  }
  if (!columnExists(database, "orders", "expires_at")) {
    database.exec(`ALTER TABLE orders ADD COLUMN expires_at TEXT`);
  }
  if (!columnExists(database, "orders", "query_password_hash")) {
    database.exec(
      `ALTER TABLE orders ADD COLUMN query_password_hash TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!columnExists(database, "orders", "user_id")) {
    database.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER`);
  }
  if (!columnExists(database, "products", "fulfill_type")) {
    database.exec(
      `ALTER TABLE products ADD COLUMN fulfill_type TEXT NOT NULL DEFAULT 'card'`,
    );
  }
  if (!columnExists(database, "products", "channel_tag")) {
    database.exec(
      `ALTER TABLE products ADD COLUMN channel_tag TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!columnExists(database, "products", "account_warning")) {
    database.exec(
      `ALTER TABLE products ADD COLUMN account_warning TEXT NOT NULL DEFAULT ''`,
    );
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_tx_id
     ON orders(payment_tx_id) WHERE payment_tx_id IS NOT NULL`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_orders_email_pwd
     ON orders(email, query_password_hash)`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_orders_email
     ON orders(email COLLATE NOCASE)`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_orders_user_id
     ON orders(user_id)`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_email_otps_email
     ON email_otps(email COLLATE NOCASE, id DESC)`,
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_user
     ON user_sessions(user_id)`,
  );
}

export function getDb() {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price_cny REAL NOT NULL,
      daitu_code TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      email TEXT NOT NULL,
      amount_cny REAL NOT NULL,
      amount_usdt REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      fulfill_status TEXT NOT NULL DEFAULT 'none',
      payment_channel TEXT NOT NULL DEFAULT 'usdt_trc20',
      payment_tx_id TEXT,
      expires_at TEXT,
      daitu_trade_no TEXT,
      deliver_secret TEXT,
      fulfill_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      fulfilled_at TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
  migrateSchema(db);
  upsertCatalog(db);
  return db;
}

export function listVisibleProducts() {
  return getDb()
    .prepare(
      "SELECT * FROM products WHERE visible = 1 ORDER BY sort_order ASC, id ASC",
    )
    .all() as Product[];
}

export function listAllProducts() {
  return getDb()
    .prepare("SELECT * FROM products ORDER BY sort_order ASC, id ASC")
    .all() as Product[];
}

export function getProductBySlug(slug: string) {
  return getDb()
    .prepare("SELECT * FROM products WHERE slug = ?")
    .get(slug) as Product | undefined;
}

export function getProductById(id: number) {
  return getDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as Product | undefined;
}

export function updateProduct(
  id: number,
  patch: {
    name?: string;
    summary?: string;
    description?: string;
    price_cny?: number;
    visible?: number | boolean;
  },
) {
  const current = getProductById(id);
  if (!current) return null;
  const visible =
    patch.visible === undefined
      ? current.visible
      : patch.visible
        ? 1
        : 0;
  getDb()
    .prepare(
      `UPDATE products SET name = ?, summary = ?, description = ?, price_cny = ?, visible = ? WHERE id = ?`,
    )
    .run(
      patch.name ?? current.name,
      patch.summary ?? current.summary,
      patch.description ?? current.description,
      patch.price_cny ?? current.price_cny,
      visible,
      id,
    );
  return getProductById(id);
}

/* ---------------- Lightweight OTP User & Session Queries ---------------- */

export function upsertUserByEmail(email: string): User {
  const normalized = email.trim().toLowerCase();
  const database = getDb();
  database
    .prepare(
      `INSERT INTO users (email, created_at, last_login_at)
       VALUES (?, datetime('now'), datetime('now'))
       ON CONFLICT(email) DO UPDATE SET last_login_at = datetime('now')`,
    )
    .run(normalized);
  const user = database
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(normalized) as User;
  // Backfill any earlier orders under the same verified email
  database
    .prepare(
      `UPDATE orders SET user_id = ?
       WHERE user_id IS NULL AND email = ? COLLATE NOCASE`,
    )
    .run(user.id, normalized);
  return user;
}

export function getLatestOtpForEmail(email: string) {
  return getDb()
    .prepare(
      `SELECT * FROM email_otps
       WHERE email = ? COLLATE NOCASE
       ORDER BY id DESC LIMIT 1`,
    )
    .get(email.trim().toLowerCase()) as EmailOtpRow | undefined;
}

export function countOtpsForEmailInLastHour(email: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM email_otps
       WHERE email = ? COLLATE NOCASE
         AND created_at >= datetime('now', '-1 hour')`,
    )
    .get(email.trim().toLowerCase()) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export function countOtpsSentToday(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS cnt FROM email_otps
       WHERE created_at >= datetime('now', 'start of day')`,
    )
    .get() as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export function createEmailOtp(input: {
  email: string;
  codeHash: string;
  ttlMinutes: number;
}) {
  const normalized = input.email.trim().toLowerCase();
  const database = getDb();
  // Invalidate any prior unused OTP for this email
  database
    .prepare(
      `UPDATE email_otps SET consumed_at = datetime('now')
       WHERE email = ? COLLATE NOCASE AND consumed_at IS NULL`,
    )
    .run(normalized);
  database
    .prepare(
      `INSERT INTO email_otps (email, code_hash, expires_at)
       VALUES (?, ?, datetime('now', ?))`,
    )
    .run(normalized, input.codeHash, `+${input.ttlMinutes} minutes`);
}

export function getActiveOtpForEmail(email: string) {
  return getDb()
    .prepare(
      `SELECT * FROM email_otps
       WHERE email = ? COLLATE NOCASE
         AND consumed_at IS NULL
         AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(email.trim().toLowerCase()) as EmailOtpRow | undefined;
}

export function incrementOtpAttempts(id: number) {
  getDb()
    .prepare("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?")
    .run(id);
}

export function consumeEmailOtp(id: number) {
  getDb()
    .prepare("UPDATE email_otps SET consumed_at = datetime('now') WHERE id = ?")
    .run(id);
}

export function insertUserSession(input: {
  userId: number;
  tokenHash: string;
  ttlDays: number;
}) {
  const database = getDb();
  // Opportunistic cleanup of expired sessions
  database
    .prepare("DELETE FROM user_sessions WHERE expires_at <= datetime('now')")
    .run();
  database
    .prepare(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at, last_seen_at)
       VALUES (?, ?, datetime('now', ?), datetime('now'))`,
    )
    .run(input.userId, input.tokenHash, `+${input.ttlDays} days`);
}

export function findSessionUserByTokenHash(tokenHash: string): {
  sessionId: number;
  user: User;
  lastSeenAt: string;
} | null {
  const row = getDb()
    .prepare(
      `SELECT
         s.id AS session_id,
         s.last_seen_at AS session_last_seen_at,
         u.id AS user_id,
         u.email AS user_email,
         u.created_at AS user_created_at,
         u.last_login_at AS user_last_login_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .get(tokenHash) as
    | {
        session_id: number;
        session_last_seen_at: string;
        user_id: number;
        user_email: string;
        user_created_at: string;
        user_last_login_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    sessionId: row.session_id,
    lastSeenAt: row.session_last_seen_at,
    user: {
      id: row.user_id,
      email: row.user_email,
      created_at: row.user_created_at,
      last_login_at: row.user_last_login_at,
    },
  };
}

export function touchUserSession(sessionId: number, ttlDays: number) {
  getDb()
    .prepare(
      `UPDATE user_sessions
       SET last_seen_at = datetime('now'),
           expires_at = datetime('now', ?)
       WHERE id = ?`,
    )
    .run(`+${ttlDays} days`, sessionId);
}

export function deleteUserSessionByTokenHash(tokenHash: string) {
  getDb()
    .prepare("DELETE FROM user_sessions WHERE token_hash = ?")
    .run(tokenHash);
}

/* ---------------- Order Queries ---------------- */

export function createOrder(input: {
  product: Product;
  email: string;
  userId?: number | null;
  queryPassword?: string;
}) {
  const database = getDb();
  const orderNo = `Z${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  const amountUsdt = allocateUniqueUsdtAmount(database, input.product.price_cny);
  const ttl = getPaymentTtlMinutes();
  const queryPasswordHash = input.queryPassword
    ? hashQueryPassword(input.queryPassword)
    : "";

  database
    .prepare(
      `INSERT INTO orders (
        order_no, product_id, product_name, user_id, email, query_password_hash,
        amount_cny, amount_usdt, payment_channel, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'usdt_trc20', datetime('now', ?))`,
    )
    .run(
      orderNo,
      input.product.id,
      input.product.name,
      input.userId ?? null,
      input.email.trim().toLowerCase(),
      queryPasswordHash,
      input.product.price_cny,
      amountUsdt,
      `+${ttl} minutes`,
    );
  return getOrderByNo(orderNo)!;
}

export function getOrderByNo(orderNo: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE order_no = ?")
    .get(orderNo) as Order | undefined;
}

export function findOrder(orderNo: string, email: string) {
  return getDb()
    .prepare(
      "SELECT * FROM orders WHERE order_no = ? AND email = ? COLLATE NOCASE",
    )
    .get(orderNo, email.trim().toLowerCase()) as Order | undefined;
}

export function findOrdersByVerifiedEmail(email: string, userId?: number) {
  const normalized = email.trim().toLowerCase();
  if (userId) {
    return getDb()
      .prepare(
        `SELECT * FROM orders
         WHERE user_id = ? OR email = ? COLLATE NOCASE
         ORDER BY id DESC`,
      )
      .all(userId, normalized) as Order[];
  }
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE email = ? COLLATE NOCASE
       ORDER BY id DESC`,
    )
    .all(normalized) as Order[];
}

export function findOrdersByEmailAndPasswordHash(
  email: string,
  queryPasswordHash: string,
) {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE email = ? COLLATE NOCASE AND query_password_hash = ?
       ORDER BY id DESC`,
    )
    .all(email.trim().toLowerCase(), queryPasswordHash) as Order[];
}

export function findOrderByNoAndPasswordHash(
  orderNo: string,
  queryPasswordHash: string,
) {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE order_no = ? AND query_password_hash = ?`,
    )
    .get(orderNo, queryPasswordHash) as Order | undefined;
}

export function findPendingOrderByUsdtAmount(amountUsdt: number) {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE payment_status IN ('pending', 'confirming')
         AND ABS(amount_usdt - ?) < 0.001
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY id ASC LIMIT 1`,
    )
    .get(amountUsdt) as Order | undefined;
}

export function findOrderByPaymentTx(txId: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE payment_tx_id = ?")
    .get(txId) as Order | undefined;
}

export function listOrders(limit = 100) {
  return getDb()
    .prepare("SELECT * FROM orders ORDER BY id DESC LIMIT ?")
    .all(limit) as Order[];
}

export function listOpenPaymentOrders() {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE payment_status IN ('pending', 'confirming')
       ORDER BY id ASC`,
    )
    .all() as Order[];
}

export function setPaymentStatus(
  orderNo: string,
  status: PaymentStatus,
  extra?: { payment_tx_id?: string | null },
) {
  if (extra?.payment_tx_id !== undefined) {
    getDb()
      .prepare(
        `UPDATE orders SET payment_status = ?, payment_tx_id = COALESCE(?, payment_tx_id),
         paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
         WHERE order_no = ?`,
      )
      .run(status, extra.payment_tx_id, status, orderNo);
  } else {
    getDb()
      .prepare(
        `UPDATE orders SET payment_status = ?,
         paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
         WHERE order_no = ?`,
      )
      .run(status, status, orderNo);
  }
  return getOrderByNo(orderNo);
}

export function markOrderPaid(orderNo: string, paymentTxId?: string | null) {
  getDb()
    .prepare(
      `UPDATE orders SET payment_status = 'paid', paid_at = datetime('now'),
       payment_tx_id = COALESCE(?, payment_tx_id) WHERE order_no = ?`,
    )
    .run(paymentTxId ?? null, orderNo);
  return getOrderByNo(orderNo);
}

export function expireOpenOrders() {
  getDb()
    .prepare(
      `UPDATE orders SET payment_status = 'expired'
       WHERE payment_status IN ('pending', 'confirming')
         AND expires_at IS NOT NULL
         AND expires_at <= datetime('now')`,
    )
    .run();
}

export function markOrderFulfillResult(
  orderNo: string,
  result: {
    fulfill_status: Order["fulfill_status"];
    daitu_trade_no?: string | null;
    deliver_secret?: string | null;
    fulfill_error?: string | null;
  },
) {
  getDb()
    .prepare(
      `UPDATE orders SET
        fulfill_status = ?,
        daitu_trade_no = COALESCE(?, daitu_trade_no),
        deliver_secret = COALESCE(?, deliver_secret),
        fulfill_error = ?,
        fulfilled_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE fulfilled_at END
      WHERE order_no = ?`,
    )
    .run(
      result.fulfill_status,
      result.daitu_trade_no ?? null,
      result.deliver_secret ?? null,
      result.fulfill_error ?? null,
      result.fulfill_status,
      orderNo,
    );
  return getOrderByNo(orderNo);
}
