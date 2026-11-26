import crypto from "crypto";
import type { AstroCookies } from "astro";
import {
  consumeEmailOtp,
  countOtpsForEmailInLastHour,
  countOtpsSentToday,
  createEmailOtp,
  deleteUserSessionByTokenHash,
  findSessionUserByTokenHash,
  getActiveOtpForEmail,
  getLatestOtpForEmail,
  incrementOtpAttempts,
  insertUserSession,
  touchUserSession,
  upsertUserByEmail,
  type User,
} from "./db";
import { env } from "./env";
import { sendOtpEmail, type SendOtpResult } from "./mailer";

export const SESSION_COOKIE_NAME = "mf_session";
export const OTP_TTL_MINUTES = 10;
export const OTP_COOLDOWN_SECONDS = 60;
export const OTP_MAX_PER_EMAIL_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_TTL_DAYS = 90;

function authSecret() {
  return (
    env("SESSION_SECRET") ||
    env("QUERY_PASSWORD_PEPPER") ||
    env("ADMIN_PASSWORD", "magfield-dev-session-secret")
  );
}

function hashValue(purpose: string, raw: string) {
  return crypto
    .createHmac("sha256", authSecret())
    .update(`${purpose}:${raw}`)
    .digest("hex");
}

function hashOtpCode(email: string, code: string) {
  return hashValue("otp", `${email.trim().toLowerCase()}:${code.trim()}`);
}

function hashSessionToken(token: string) {
  return hashValue("session", token);
}

function parseSqliteUtc(ts: string): number {
  const iso = ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`;
  return Date.parse(iso);
}

function shouldUseSecureCookie() {
  return env("APP_BASE_URL", "").startsWith("https://");
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

/**
 * Generates and dispatches a 6-digit OTP to `email`, enforcing a per-email resend cooldown.
 */
export async function requestEmailOtp(rawEmail: string): Promise<
  SendOtpResult & { cooldownSec: number; ttlMinutes: number }
> {
  const email = normalizeEmail(rawEmail);
  const latest = getLatestOtpForEmail(email);
  if (latest) {
    const elapsedSec = Math.floor((Date.now() - parseSqliteUtc(latest.created_at)) / 1000);
    if (Number.isFinite(elapsedSec) && elapsedSec >= 0 && elapsedSec < OTP_COOLDOWN_SECONDS) {
      const wait = OTP_COOLDOWN_SECONDS - elapsedSec;
      throw new Error(`发送过于频繁，请 ${wait} 秒后再试`);
    }
  }

  if (countOtpsForEmailInLastHour(email) >= OTP_MAX_PER_EMAIL_PER_HOUR) {
    throw new Error("该邮箱 1 小时内获取验证码次数已达上限，请稍后再试");
  }

  const dailyLimit = Number(env("OTP_DAILY_LIMIT", "80"));
  if (Number.isFinite(dailyLimit) && dailyLimit > 0 && countOtpsSentToday() >= dailyLimit) {
    throw new Error("今日全站验证码发送已达安全上限，请稍后再试或联系客服");
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = hashOtpCode(email, code);

  // Dispatch email first so failed sends do not burn cooldown or quota
  const result = await sendOtpEmail({
    to: email,
    code,
    ttlMinutes: OTP_TTL_MINUTES,
  });

  createEmailOtp({
    email,
    codeHash,
    ttlMinutes: OTP_TTL_MINUTES,
  });

  return {
    ...result,
    cooldownSec: OTP_COOLDOWN_SECONDS,
    ttlMinutes: OTP_TTL_MINUTES,
  };
}

/**
 * Verifies a 6-digit OTP code, upserts the lightweight user record, and establishes a 90-day cached session.
 */
export function verifyEmailOtpAndLogin(input: {
  email: string;
  code: string;
  cookies: AstroCookies;
}): User {
  const email = normalizeEmail(input.email);
  const code = input.code.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("请输入 6 位数字验证码");
  }

  const otp = getActiveOtpForEmail(email);
  if (!otp) {
    throw new Error("验证码已过期或不存在，请重新获取");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    consumeEmailOtp(otp.id);
    throw new Error("验证码错误次数过多，请重新获取");
  }

  const expected = hashOtpCode(email, code);
  const a = Buffer.from(expected);
  const b = Buffer.from(otp.code_hash);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    incrementOtpAttempts(otp.id);
    const left = Math.max(0, OTP_MAX_ATTEMPTS - (otp.attempts + 1));
    throw new Error(
      left > 0
        ? `验证码不正确，还可重试 ${left} 次`
        : "验证码错误次数过多，请重新获取",
    );
  }

  consumeEmailOtp(otp.id);
  const user = upsertUserByEmail(email);
  issueSessionCookie(user.id, input.cookies);
  return user;
}

export function issueSessionCookie(userId: number, cookies: AstroCookies) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  insertUserSession({
    userId,
    tokenHash,
    ttlDays: SESSION_TTL_DAYS,
  });
  cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function getSessionUser(cookies: AstroCookies): User | null {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;
  const found = findSessionUserByTokenHash(hashSessionToken(rawToken));
  if (!found) return null;

  // Sliding refresh once per day so returning customers stay signed in seamlessly
  const lastSeenMs = parseSqliteUtc(found.lastSeenAt);
  if (Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs > 24 * 60 * 60 * 1000) {
    touchUserSession(found.sessionId, SESSION_TTL_DAYS);
    cookies.set(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(),
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    });
  }
  return found.user;
}

export function clearSessionCookie(cookies: AstroCookies) {
  const rawToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    deleteUserSessionByTokenHash(hashSessionToken(rawToken));
  }
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
}
