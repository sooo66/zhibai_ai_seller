import { isAlipay16688Enabled } from "../shop16688";
import type { PaymentProvider } from "./types";

export function getAlipay16688Provider(): PaymentProvider {
  return {
    id: "alipay_16688",
    label: "支付宝 / 微信（16688）",
    enabled: isAlipay16688Enabled(),
  };
}
