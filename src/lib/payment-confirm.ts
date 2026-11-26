import {
  findOrderByPaymentTx,
  getOrderByNo,
  getProductById,
  markOrderPaid,
  setPaymentStatus,
  type Order,
} from "./db";
import { confirmPaidAndFulfill } from "./fulfill";
import { verifyQueryPassword } from "./query-password";

/**
 * Idempotent: attach tx, mark paid, fulfill once.
 * Semi-style: never double-fulfill; reuse existing paid+done.
 */
export async function confirmPaymentAndFulfill(input: {
  orderNo: string;
  paymentTxId: string;
  source: "scan" | "txid" | "simulate" | "admin";
}) {
  const existingTx = findOrderByPaymentTx(input.paymentTxId);
  if (existingTx && existingTx.order_no !== input.orderNo) {
    throw new Error("该交易号已用于其他订单");
  }

  const order = getOrderByNo(input.orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid") {
    if (order.fulfill_status === "done" && order.deliver_secret) {
      return order;
    }
    return confirmPaidAndFulfill(order.order_no);
  }

  if (
    order.payment_status === "expired" ||
    order.payment_status === "manual_review"
  ) {
    if (input.source !== "admin" && input.source !== "simulate") {
      setPaymentStatus(order.order_no, "manual_review", {
        payment_tx_id: input.paymentTxId,
      });
      throw new Error("订单已过期或进入人工复核，请联系客服");
    }
  }

  markOrderPaid(order.order_no, input.paymentTxId);
  return confirmPaidAndFulfill(order.order_no);
}

export function orderPublicView(
  order: Order,
  opts?: {
    sessionEmail?: string | null;
    queryPassword?: string;
    includeSecret?: boolean;
  },
) {
  const product = getProductById(order.product_id);
  const fulfillType = product?.fulfill_type || "card";
  const sessionOk =
    Boolean(opts?.sessionEmail) &&
    opts!.sessionEmail!.trim().toLowerCase() === order.email.trim().toLowerCase();
  const passwordOk =
    Boolean(opts?.queryPassword) &&
    verifyQueryPassword(opts!.queryPassword!, order.query_password_hash || "");
  const authorized = sessionOk || passwordOk;
  const includeSecret = Boolean(opts?.includeSecret && authorized);

  return {
    orderNo: order.order_no,
    productName: order.product_name,
    email: order.email,
    paymentStatus: order.payment_status,
    fulfillStatus: order.fulfill_status,
    fulfillType,
    amountUsdt: order.amount_usdt,
    amountCny: order.amount_cny,
    paymentTxId: order.payment_tx_id,
    expiresAt: order.expires_at,
    fulfillError: order.fulfill_error,
    deliverSecret: includeSecret ? order.deliver_secret : null,
    secretAuthorized: authorized,
  };
}
