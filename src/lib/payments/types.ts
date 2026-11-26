export type PaymentChannelId = "usdt_trc20" | "alipay_16688" | "fiat_stub";

export type PaymentProvider = {
  id: PaymentChannelId;
  label: string;
  enabled: boolean;
};
