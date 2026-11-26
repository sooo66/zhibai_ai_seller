import type { APIRoute } from "astro";
import { z } from "zod";
import { requestEmailOtp } from "../../../lib/auth";
import { verifyAndConsumeCaptcha } from "../../../lib/captcha";
import { allowAttempt, clientKey, recordFail } from "../../../lib/rate-limit";

export const prerender = false;

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  captchaId: z.string().min(8, "请先加载图形验证码"),
  captchaCode: z.string().regex(/^[A-Za-z0-9]{4}$/, "请输入 4 位图形验证码"),
});

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = schema.parse(await request.json());
    const ip = clientIp(request);

    // Layer 1: Single-use SVG graphic captcha (prevents automated bombing & replay)
    if (!verifyAndConsumeCaptcha(body.captchaId, body.captchaCode)) {
      return new Response(
        JSON.stringify({
          error: "图形验证码错误或已过期，请重新输入",
          code: "CAPTCHA_INVALID",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Layer 2: Cross-email IP rate limit (stops random-email bombing from one IP)
    const ipTenMinKey = clientKey(ip, "send-otp-ip-10m");
    const ipHourKey = clientKey(ip, "send-otp-ip-1h");
    if (
      !allowAttempt(ipTenMinKey, 8, 10 * 60_000) ||
      !allowAttempt(ipHourKey, 15, 60 * 60_000)
    ) {
      return new Response(
        JSON.stringify({ error: "当前网络请求验证码过于频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    // Layer 3 + 4: Per-email 60s cooldown, hourly email cap, and global daily Resend cap
    const res = await requestEmailOtp(body.email);
    recordFail(ipTenMinKey, 10 * 60_000);
    recordFail(ipHourKey, 60 * 60_000);

    return new Response(
      JSON.stringify({
        ok: true,
        cooldownSec: res.cooldownSec,
        ttlMinutes: res.ttlMinutes,
        delivery: res.delivery,
        ...(res.devCode ? { devCode: res.devCode } : {}),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "请检查邮箱与图形验证码"
        : err instanceof Error
          ? err.message
          : "验证码发送失败";
    const status = message.includes("过于频繁") || message.includes("上限") ? 429 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
