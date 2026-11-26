import {
  expireOpenOrders,
  findOrderByPaymentTx,
  findOrderByShop16688TradeNo,
  findPendingOrderByUsdtAmount,
  getOrderByNo,
  getProductById,
  setOrderShop16688TradeNo,
  setPaymentStatus,
  type Order,
} from "./db";
import { confirmPaymentAndFulfill } from "./payment-confirm";
import { getUsdtConfig } from "./payment";
import {
  isShop16688ApiConfigured,
  shop16688DeliverOrder,
  shop16688GetOrderInfo,
  shop16688ListOrders,
} from "./shop16688";
import {
  addressesEqual,
  amountsEqual,
  fetchRecentUsdtTransfersTo,
  getUsdtTransferByTxId,
} from "./tron";

function parseSqliteUtcSec(ts: string): number {
  const ms = Date.parse(ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

export async function scanAndMatchOpenOrders() {
  expireOpenOrders();
  const { address } = getUsdtConfig();
  if (!address || address.startsWith("TYour")) {
    return { scanned: 0, matched: [] as string[] };
  }

  const transfers = await fetchRecentUsdtTransfersTo(address, 80);
  const matched: string[] = [];

  for (const t of transfers) {
    if (!t.confirmed) continue;
    if (!addressesEqual(t.to, address)) continue;
    if (findOrderByPaymentTx(t.txId)) continue;

    const order = findPendingOrderByUsdtAmount(t.amountUsdt);
    if (!order) continue;

    try {
      await confirmPaymentAndFulfill({
        orderNo: order.order_no,
        paymentTxId: t.txId,
        source: "scan",
      });
      matched.push(order.order_no);
    } catch {
      // leave for manual review / retry
    }
  }

  return { scanned: transfers.length, matched };
}

async function tryMatchShop16688Order(order: Order): Promise<Order> {
  if (!isShop16688ApiConfigured()) return order;
  const product = getProductById(order.product_id);
  const createdSec = parseSqliteUtcSec(order.created_at);
  const startTime = Math.max(0, createdSec - 300);

  const res = await shop16688ListOrders({
    pageNo: 1,
    pageSize: 20,
    keywords: order.email,
    startTime,
  });
  if (res.code !== 1 || !res.data?.list?.length) return order;

  const candidate = res.data.list.find((item) => {
    if (![1, 4, 5].includes(item.status)) return false; // Must be paid (待发货/已发货/已完成)
    if (Math.abs(Number(item.total_amount) - order.amount_cny) > 0.02) return false;
    if (product?.shop16688_goods_no && item.goods_no && item.goods_no !== product.shop16688_goods_no) {
      return false;
    }
    if (findOrderByShop16688TradeNo(item.trade_no)) return false;
    return true;
  });

  if (!candidate) return order;

  setOrderShop16688TradeNo(order.order_no, candidate.trade_no);
  const updated = await confirmPaymentAndFulfill({
    orderNo: order.order_no,
    paymentTxId: `16688:${candidate.trade_no}`,
    source: "scan",
  });

  if (candidate.status === 1 && updated?.fulfill_status === "done") {
    try {
      await shop16688DeliverOrder(candidate.trade_no);
    } catch {
      // Non-fatal: buyer already got secret on Magfield
    }
  }
  return updated ?? getOrderByNo(order.order_no)!;
}

export async function verifyShop16688TradeNoForOrder(orderNo: string, tradeNo: string) {
  expireOpenOrders();
  const order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");
  if (order.payment_status === "paid") return order;

  const cleanTradeNo = tradeNo.trim();
  const existing = findOrderByShop16688TradeNo(cleanTradeNo);
  if (existing && existing.order_no !== orderNo) {
    throw new Error("该 16688 订单号已关联其他订单");
  }

  const info = await shop16688GetOrderInfo(cleanTradeNo);
  if (info.code !== 1 || !info.data) {
    throw new Error(info.msg || "16688 订单查询失败（OpenAPI 可能暂不可用，请联系客服人工核单）");
  }

  const d = info.data;
  if (![1, 4, 5].includes(d.status)) {
    throw new Error("该 16688 订单尚未完成支付");
  }
  if (Math.abs(Number(d.total_amount) - order.amount_cny) > 0.02) {
    throw new Error(`金额不匹配：16688 订单 ¥${d.total_amount}，本站订单 ¥${order.amount_cny}`);
  }
  const product = getProductById(order.product_id);
  if (product?.shop16688_goods_no && d.goods_no && d.goods_no !== product.shop16688_goods_no) {
    throw new Error("16688 订单商品与本站套餐不匹配");
  }

  setOrderShop16688TradeNo(orderNo, d.trade_no);
  const updated = await confirmPaymentAndFulfill({
    orderNo,
    paymentTxId: `16688:${d.trade_no}`,
    source: "txid",
  });

  if (d.status === 1 && updated?.fulfill_status === "done") {
    try {
      await shop16688DeliverOrder(d.trade_no);
    } catch {
      // Non-fatal
    }
  }
  return updated ?? getOrderByNo(orderNo)!;
}

export async function checkOrderPayment(orderNo: string) {
  expireOpenOrders();
  let order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid" || order.payment_status === "expired") {
    return order;
  }

  if (order.payment_channel === "alipay_16688") {
    try {
      order = await tryMatchShop16688Order(order);
    } catch {
      // 16688 OpenAPI paused or transient error — keep pending
    }
    return getOrderByNo(orderNo)!;
  }

  setPaymentStatus(orderNo, "confirming");
  try {
    await scanAndMatchOpenOrders();
  } catch {
    // RPC blip — stay confirming
  }
  order = getOrderByNo(orderNo)!;
  if (order.payment_status === "confirming" && order.expires_at) {
    const stillOpen =
      !order.expires_at ||
      Date.parse(order.expires_at.replace(" ", "T") + "Z") > Date.now();
    if (stillOpen && order.payment_status === "confirming" && !order.payment_tx_id) {
      setPaymentStatus(orderNo, "pending");
      order = getOrderByNo(orderNo)!;
    }
  }
  return order;
}

export async function verifyTxForOrder(orderNo: string, txId: string) {
  expireOpenOrders();
  const order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid") {
    return order;
  }

  if (order.payment_channel === "alipay_16688") {
    return verifyShop16688TradeNoForOrder(orderNo, txId);
  }

  setPaymentStatus(orderNo, "confirming");
  const transfer = await getUsdtTransferByTxId(txId);
  if (!transfer) {
    return getOrderByNo(orderNo)!;
  }
  if (!transfer.confirmed) {
    return getOrderByNo(orderNo)!;
  }

  const { address } = getUsdtConfig();
  if (!addressesEqual(transfer.to, address)) {
    throw new Error("交易收款地址与本站不一致");
  }
  if (!amountsEqual(transfer.amountUsdt, order.amount_usdt)) {
    throw new Error(
      `金额不匹配：链上 ${transfer.amountUsdt}，订单 ${order.amount_usdt}`,
    );
  }

  return confirmPaymentAndFulfill({
    orderNo,
    paymentTxId: transfer.txId,
    source: "txid",
  });
}
