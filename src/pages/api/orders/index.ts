import type { APIRoute } from "astro";
import { z } from "zod";
import { getSessionUser } from "../../../lib/auth";
import { getDaituSyncSnapshot, isInStock } from "../../../lib/daitu-stock";
import { createOrder, getProductById } from "../../../lib/db";

export const prerender = false;

const schema = z.object({
  productId: z.number().int().positive(),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = getSessionUser(cookies);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: "请先完成邮箱验证码验证后再下单",
          code: "AUTH_REQUIRED",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = schema.parse(await request.json());
    const product = getProductById(body.productId);
    if (!product || !product.visible) {
      return new Response(JSON.stringify({ error: "商品不存在或未上架" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const syncSnap = await getDaituSyncSnapshot();
    if (!isInStock(syncSnap.stockByCode, product.daitu_code)) {
      return new Response(
        JSON.stringify({ error: "该套餐当前已售罄，请刷新页面选择其他规格" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    const order = createOrder({
      product,
      email: user.email,
      userId: user.id,
    });
    return new Response(
      JSON.stringify({
        orderNo: order.order_no,
        amountUsdt: order.amount_usdt,
        expiresAt: order.expires_at,
        email: order.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "下单失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
