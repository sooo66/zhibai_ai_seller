import crypto from "crypto";
import { env } from "./env";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes 0/O, 1/I/l for crisp readability
const CAPTCHA_TTL_MS = 5 * 60_000;
const MAX_ACTIVE_CAPTCHAS = 2000;

type CaptchaEntry = {
  answerHash: string;
  expiresAt: number;
};

const store = new Map<string, CaptchaEntry>();

function captchaSecret() {
  return (
    env("SESSION_SECRET") ||
    env("QUERY_PASSWORD_PEPPER") ||
    env("ADMIN_PASSWORD", "magfield-captcha-secret")
  );
}

function hashAnswer(id: string, code: string) {
  return crypto
    .createHmac("sha256", captchaSecret())
    .update(`captcha:${id}:${code.trim().toUpperCase()}`)
    .digest("hex");
}

function pruneExpired(now: number) {
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
  while (store.size >= MAX_ACTIVE_CAPTCHAS) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
}

function randInt(min: number, max: number) {
  return crypto.randomInt(min, max + 1);
}

function renderCaptchaSvg(code: string) {
  const width = 118;
  const height = 40;
  const palette = ["#0f172a", "#1d4ed8", "#1e3a8a", "#334155"];

  // Subtle magnetic-cobalt interference arcs
  const curves: string[] = [];
  for (let i = 0; i < 3; i++) {
    const y1 = randInt(6, height - 6);
    const y2 = randInt(6, height - 6);
    const cy = randInt(2, height - 2);
    const cx = randInt(30, width - 30);
    const stroke = i === 0 ? "rgba(37,99,235,0.28)" : "rgba(15,23,42,0.16)";
    curves.push(
      `<path d="M 4 ${y1} Q ${cx} ${cy} ${width - 4} ${y2}" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round"/>`,
    );
  }

  // Subtle background noise dots
  const dots: string[] = [];
  for (let i = 0; i < 16; i++) {
    const x = randInt(5, width - 5);
    const y = randInt(4, height - 4);
    const r = (randInt(8, 16) / 10).toFixed(1);
    const fill = i % 3 === 0 ? "rgba(37,99,235,0.26)" : "rgba(15,23,42,0.18)";
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`);
  }

  // Jittered & rotated characters
  const letters = code
    .split("")
    .map((ch, idx) => {
      const x = 18 + idx * 24 + randInt(-2, 2);
      const y = 27 + randInt(-3, 3);
      const rot = randInt(-16, 16);
      const fill = palette[randInt(0, palette.length - 1)];
      const size = randInt(21, 24);
      return `<text x="${x}" y="${y}" font-family="'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace" font-size="${size}" font-weight="700" fill="${fill}" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" rx="8" fill="#f8fafc"/>
  ${dots.join("")}
  ${curves.join("")}
  ${letters}
</svg>`;
}

export function createCaptchaChallenge() {
  const now = Date.now();
  pruneExpired(now);

  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  const captchaId = crypto.randomBytes(16).toString("hex");
  store.set(captchaId, {
    answerHash: hashAnswer(captchaId, code),
    expiresAt: now + CAPTCHA_TTL_MS,
  });

  const svg = renderCaptchaSvg(code);
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  return {
    captchaId,
    svgDataUrl,
    expiresInSec: Math.floor(CAPTCHA_TTL_MS / 1000),
  };
}

/**
 * Verifies a captcha challenge and ALWAYS consumes (deletes) it immediately
 * so neither valid nor invalid challenges can be replayed or brute-forced.
 */
export function verifyAndConsumeCaptcha(captchaId: string, userInput: string): boolean {
  const id = captchaId.trim();
  const code = userInput.trim();
  if (!id || !/^[A-Za-z0-9]{4}$/.test(code)) {
    if (id) store.delete(id);
    return false;
  }

  const entry = store.get(id);
  store.delete(id); // Always single-use!
  if (!entry || entry.expiresAt <= Date.now()) {
    return false;
  }

  const actual = Buffer.from(hashAnswer(id, code));
  const expected = Buffer.from(entry.answerHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
