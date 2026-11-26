import type { APIRoute } from "astro";
import { z } from "zod";
import { getSessionUser } from "../../../lib/auth";
import { orderPublicView } from "../../../lib/payment-confirm";
import { verifyTxForOrder } from "../../../lib/payment-watcher";
import { paymentStatusLabel } from "../../../lib/payment";

export const prerender = false;

const schema = z.object({
  orderNo: z.string().min(6),
  txId: z.string().min(16),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = schema.parse(await request.json());
    const order = await verifyTxForOrder(body.orderNo, body.txId);
    if (!order) {
      return new Response(JSON.stringify({ error: "订单不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const sessionUser = getSessionUser(cookies);
    return new Response(
      JSON.stringify({
        ...orderPublicView(order, {
          sessionEmail: sessionUser?.email ?? null,
          includeSecret: true,
        }),
        paymentStatusLabel: paymentStatusLabel(order.payment_status),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "验真失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
