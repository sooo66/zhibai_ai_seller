import type { APIRoute } from "astro";
import { z } from "zod";
import { getSessionUser } from "../../../lib/auth";
import { orderPublicView } from "../../../lib/payment-confirm";
import { checkOrderPayment } from "../../../lib/payment-watcher";
import { paymentStatusLabel } from "../../../lib/payment";

export const prerender = false;

const schema = z.object({
  orderNo: z.string().min(6),
  queryPassword: z.string().min(6).max(12).optional(),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = schema.parse(await request.json());
    const order = await checkOrderPayment(body.orderNo);
    const sessionUser = getSessionUser(cookies);
    const view = orderPublicView(order, {
      sessionEmail: sessionUser?.email ?? null,
      queryPassword: body.queryPassword,
      includeSecret: true,
    });
    return new Response(
      JSON.stringify({
        ...view,
        paymentStatusLabel: paymentStatusLabel(order.payment_status),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "检查失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
