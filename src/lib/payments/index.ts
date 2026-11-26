import { getAlipay16688Provider } from "./alipay-16688";
import { usdtTrc20Provider } from "./usdt-trc20";
import type { PaymentProvider } from "./types";

export type { PaymentChannelId, PaymentProvider } from "./types";

export function listPaymentProviders(): PaymentProvider[] {
  return [getAlipay16688Provider(), usdtTrc20Provider];
}

export function listEnabledPaymentProviders(): PaymentProvider[] {
  return listPaymentProviders().filter((p) => p.enabled);
}

export function getPaymentProvider(id: string) {
  return listPaymentProviders().find((p) => p.id === id);
}
