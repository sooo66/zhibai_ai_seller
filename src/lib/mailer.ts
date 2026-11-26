import { env } from "./env";

export type SendOtpResult = {
  delivery: "resend" | "dev";
  devCode?: string;
};

function canDevEcho() {
  return env("OTP_DEV_ECHO") === "1" || env("ALLOW_PAYMENT_SIMULATE") === "1";
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Sends a 6-digit OTP login/verification code via Resend API.
 * In local dev mode (when RESEND_API_KEY is unset and ALLOW_PAYMENT_SIMULATE=1 or OTP_DEV_ECHO=1),
 * logs the code and returns `delivery: "dev"` + `devCode` so the full checkout flow can be verified locally.
 */
export async function sendOtpEmail(input: {
  to: string;
  code: string;
  ttlMinutes: number;
}): Promise<SendOtpResult> {
  const apiKey = env("RESEND_API_KEY");
  const brand = env("PUBLIC_BRAND_NAME", "Magfield");
  const from = env("MAIL_FROM", `${brand} <noreply@connect.magfieldai.top>`);

  if (!apiKey) {
    if (canDevEcho()) {
      console.info(
        `[OTP DEV] to=${input.to} code=${input.code} (valid ${input.ttlMinutes}m — configure RESEND_API_KEY to send real emails)`,
      );
      return { delivery: "dev", devCode: input.code };
    }
    throw new Error("邮件发送服务尚未配置，请联系客服处理");
  }

  const subject = `${input.code} 是您的 ${brand} 登录验证码`;
  const text = [
    `您好，`,
    ``,
    `您的 ${brand} 邮箱验证码为：${input.code}`,
    `验证码将在 ${input.ttlMinutes} 分钟后失效。验证后浏览器将自动保持登录状态，后续下单与查看历史订单无需重复验证。`,
    ``,
    `如非本人操作，请直接忽略本邮件。`,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Inter','PingFang SC',sans-serif;max-width:460px;margin:0 auto;padding:28px 24px;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#2563eb;letter-spacing:0.02em;">${escapeHtml(brand)}</p>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:600;line-height:1.35;">您的邮箱验证码</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">请在页面中输入以下 6 位验证码完成验证（${input.ttlMinutes} 分钟内有效）：</p>
      <div style="margin:0 0 22px;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.24em;color:#0f172a;">
        ${escapeHtml(input.code)}
      </div>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">验证成功后，当前设备将自动保持长期登录状态，后续下单与找回历史卡密均无需重复输入密码。如非本人操作，请忽略此邮件。</p>
    </div>
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[Resend] sendOtpEmail failed:", res.status, detail.slice(0, 300));
    if (res.status === 403 && detail.toLowerCase().includes("testing emails")) {
      throw new Error(
        "Resend 尚未绑定自定义发信域名：当前测试发件箱仅支持发送到 Resend 注册邮箱；请在 Resend 后台验证域名并更新 MAIL_FROM",
      );
    }
    if (res.status === 403 && detail.toLowerCase().includes("domain is not verified")) {
      throw new Error("发信域名尚未在 Resend 完成 DNS 验证，请联系管理员检查 MAIL_FROM");
    }
    throw new Error("验证码邮件发送失败，请稍后重试");
  }

  return { delivery: "resend" };
}

/**
 * Optional fire-and-forget fulfillment backup email when RESEND_API_KEY is configured.
 */
export async function sendOrderFulfilledEmail(input: {
  to: string;
  orderNo: string;
  productName: string;
  deliverSecret: string;
  fulfillType: "card" | "account" | "manual";
}) {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return;
  const brand = env("PUBLIC_BRAND_NAME", "Magfield");
  const from = env("MAIL_FROM", `${brand} <noreply@connect.magfieldai.top>`);
  const baseUrl = env("APP_BASE_URL", "https://magfieldai.top").replace(/\/$/, "");

  const label =
    input.fulfillType === "account"
      ? "成品账号资料"
      : input.fulfillType === "manual"
        ? "人工代充凭据"
        : "充值卡密与说明";

  const subject = `[${brand}] 订单 ${input.orderNo} 已发货 · ${input.productName}`;
  const text = [
    `您的订单已支付并完成发货：`,
    `订单号：${input.orderNo}`,
    `商品：${input.productName}`,
    ``,
    `${label}：`,
    input.deliverSecret,
    ``,
    `您也可以随时前往 ${baseUrl}/orders 查看全部历史订单。`,
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Inter','PingFang SC',sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;color:#0f172a;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#2563eb;">${escapeHtml(brand)}</p>
      <h1 style="margin:0 0 12px;font-size:19px;font-weight:600;">订单已发货</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;">订单号：<code>${escapeHtml(input.orderNo)}</code><br/>套餐：<strong>${escapeHtml(input.productName)}</strong></p>
      <div style="margin:0 0 18px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${escapeHtml(label)}</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;color:#0f172a;">${escapeHtml(input.deliverSecret)}</pre>
      </div>
      <p style="margin:0;font-size:12px;color:#64748b;">随时可访问 <a href="${escapeHtml(baseUrl)}/orders" style="color:#2563eb;">历史订单</a> 使用此邮箱找回全部记录。</p>
    </div>
  `.trim();

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Non-fatal backup email error
  }
}
