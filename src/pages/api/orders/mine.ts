import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth";
import {
  expireOpenOrders,
  findOrdersByVerifiedEmail,
  getProductById,
} from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = getSessionUser(cookies);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "请先通过邮箱验证码登录", code: "AUTH_REQUIRED" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  expireOpenOrders();
  const orders = findOrdersByVerifiedEmail(user.email, user.id).map((order) => {
    const product = getProductById(order.product_id);
    return {
      orderNo: order.order_no,
      productName: order.product_name,
      email: order.email,
      amountCny: order.amount_cny,
      amountUsdt: order.amount_usdt,
      paymentStatus: order.payment_status,
      fulfillStatus: order.fulfill_status,
      fulfillType: product?.fulfill_type || "card",
      deliverSecret: order.deliver_secret,
      fulfillError: order.fulfill_error,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      fulfilledAt: order.fulfilled_at,
    };
  });

  return new Response(
    JSON.stringify({
      user: { id: user.id, email: user.email },
      orders,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
