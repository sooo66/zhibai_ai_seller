import type { APIRoute } from "astro";
import { createCaptchaChallenge } from "../../../lib/captcha";
import { allowAttempt, clientKey, recordFail } from "../../../lib/rate-limit";

export const prerender = false;

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export const GET: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  const key = clientKey(ip, "captcha-issue");
  if (!allowAttempt(key, 40, 5 * 60_000)) {
    return new Response(
      JSON.stringify({ error: "刷新验证码过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
  recordFail(key, 5 * 60_000);

  const challenge = createCaptchaChallenge();
  return new Response(JSON.stringify(challenge), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
