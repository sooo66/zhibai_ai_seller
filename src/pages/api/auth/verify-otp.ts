import type { APIRoute } from "astro";
import { z } from "zod";
import { verifyEmailOtpAndLogin } from "../../../lib/auth";
import { allowAttempt, clientKey, recordFail } from "../../../lib/rate-limit";

export const prerender = false;

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().regex(/^\d{6}$/, "请输入 6 位数字验证码"),
});

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const ip = clientIp(request);
  const ipKey = clientKey(ip, "verify-otp-ip-10m");
  let emailRateKey: string | null = null;

  try {
    if (!allowAttempt(ipKey, 15, 10 * 60_000)) {
      return new Response(
        JSON.stringify({ error: "验证尝试过于频繁，请 10 分钟后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = schema.parse(await request.json());
    emailRateKey = clientKey(ip, `verify-otp:${body.email}`);
    if (!allowAttempt(emailRateKey, 8, 5 * 60_000)) {
      return new Response(
        JSON.stringify({ error: "验证尝试过于频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const user = verifyEmailOtpAndLogin({
      email: body.email,
      code: body.code,
      cookies,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "请检查邮箱和 6 位验证码"
        : err instanceof Error
          ? err.message
          : "验证失败";
    if (!(err instanceof z.ZodError)) {
      recordFail(ipKey, 10 * 60_000);
      if (emailRateKey) recordFail(emailRateKey, 5 * 60_000);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
