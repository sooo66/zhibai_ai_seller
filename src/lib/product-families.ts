import type { FulfillType, Product } from "./db";

export type FamilyId =
  | "chatgpt"
  | "claude"
  | "grok"
  | "gemini"
  | "codex";

export type FamilyMeta = {
  id: FamilyId;
  vendor: string;
  productLabel: string;
  match: (p: Product) => boolean;
  planLabel: (p: Product) => string;
  periodHint: (p: Product) => string;
};

export const FAMILY_DEFS: FamilyMeta[] = [
  {
    id: "chatgpt",
    vendor: "OpenAI",
    productLabel: "ChatGPT",
    match: (p) => p.slug.startsWith("gpt-"),
    planLabel: (p) => {
      if (p.channel_tag) {
        if (p.slug.includes("plus")) return `Plus · ${p.channel_tag}`;
        if (p.slug.includes("pro-20x")) return `Pro 20x · ${p.channel_tag}`;
        if (p.slug.includes("pro-50x")) return `Pro 50x · ${p.channel_tag}`;
      }
      if (p.slug.includes("chile")) return "Pro 50x 智利";
      if (p.slug.includes("annual")) return "Plus 年卡";
      if (p.slug.includes("plus")) return "Plus";
      if (p.slug.includes("pro-50x")) return "Pro 50x";
      if (p.slug.includes("pro-20x")) return "Pro 20x";
      if (p.slug.includes("pro-10x")) return "Pro 10x";
      return p.name.split("·")[0]?.trim() || p.name;
    },
    periodHint: (p) => (p.slug.includes("annual") ? "/ 年" : "/ 月"),
  },
  {
    id: "claude",
    vendor: "Anthropic",
    productLabel: "Claude",
    match: (p) => p.slug.startsWith("claude-") && p.fulfill_type === "account",
    planLabel: () => "Pro 成品号",
    periodHint: () => "",
  },
  {
    id: "grok",
    vendor: "xAI",
    productLabel: "Grok",
    match: (p) => p.slug.startsWith("grok-"),
    planLabel: (p) => {
      if (p.slug.includes("ultra")) return "Ultra";
      if (p.slug.includes("super")) return "Super";
      if (p.slug.includes("premium")) return "Premium";
      if (p.slug.includes("plus")) return "Plus";
      return "会员";
    },
    periodHint: () => "/ 月",
  },
  {
    id: "gemini",
    vendor: "Google",
    productLabel: "Gemini",
    match: (p) => p.slug.startsWith("gemini-"),
    planLabel: (p) => {
      if (p.slug.includes("topup")) return "Ultra 20X 代充";
      if (p.slug.includes("5x")) return "Ultra 5X 成品号";
      if (p.slug.includes("20x")) return "Ultra 20X 成品号";
      return "成品号";
    },
    periodHint: (p) => (p.slug.includes("topup") ? "/ 月" : ""),
  },
  {
    id: "codex",
    vendor: "OpenAI",
    productLabel: "Codex",
    match: (p) => p.slug.startsWith("codex-"),
    planLabel: () => "点数额度",
    periodHint: () => "",
  },
];

export type PlanNotice = {
  delivery: string;
  requirement: string;
  warranty: string;
  warning: string;
  officialPolicyText: string;
  policyBullets: string[];
};

export type FamilyPlan = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  priceCny: number;
  planLabel: string;
  periodHint: string;
  fulfillType: FulfillType;
  channelTag: string;
  accountWarning: string;
  notice: PlanNotice;
  inStock: boolean;
  daituCode: string;
};

export type ProductFamily = {
  id: FamilyId;
  vendor: string;
  productLabel: string;
  fromPrice: number;
  inStock: boolean;
  plans: FamilyPlan[];
};

type PlanKeyPoints = {
  delivery: string;
  requirement: string;
  warranty: string;
  warning?: string;
};

/**
 * Audited key points verified 1-to-1 against live upstream policies on daituai.cc.
 * Full verbatim policy is always displayed in the "查看完整售后政策" modal.
 */
const PLAN_KEYPOINTS_BY_SLUG: Record<string, PlanKeyPoints> = {
  "gpt-plus-ios": {
    delivery: "发放 iOS 渠道自助充值卡密 + 专用充值地址（美/巴/加礼品卡）",
    requirement:
      "支持覆盖充值至原号；强烈建议 Gmail 账号（亦可用 QQ/163），不建议 Outlook/微软邮箱",
    warranty: "质保订阅，掉订阅按质保天数退款；因风控或账号原因封号无质保",
  },
  "gpt-plus-annual-ios": {
    delivery: "发放 12 个月 iOS 年卡全自动卡密 + 充值地址，即充即到",
    requirement:
      "严禁谷歌账单逾期/宽限期、卡付或谷歌自动续费未取消、团队版、0元购账号（强充不到账自负）",
    warranty: "质保订阅 12 个月，掉订阅按质保天数退款；封号无质保",
  },
  "gpt-pro-10x-ios": {
    delivery: "发放 iOS 美区全自动卡密 + 充值地址，即充即到（非人工代充）",
    requirement: "已有 Plus 或 Pro 均可覆盖充值并重置到期时间",
    warranty: "质保 30 天不掉订阅，掉订阅按天退差价；封号无售后",
  },
  "gpt-pro-20x-ios": {
    delivery: "发放 iOS 美区全自动卡密 + 充值地址，即充即到（非人工代充）",
    requirement: "已有 Plus 或 Pro 均可覆盖充值并重置到期时间",
    warranty: "质保 30 天不掉订阅，掉订阅按天退差价；封号无售后",
  },
  "gpt-pro-50x-ios": {
    delivery: "发放 iOS 美区全自动卡密 + 充值地址，即充即到（非人工代充）",
    requirement: "已有 Plus 或 Pro 均可覆盖充值并重置到期时间",
    warranty: "质保 30 天不掉订阅，掉订阅按天退差价；封号无售后",
  },
  "gpt-pro-50x-chile": {
    delivery: "发放智利区自助充值卡密 + 充值地址，充至本人原号（非成品号）",
    requirement:
      "不限地区，但仅限当前无任何订阅（无 GO/PLUS/PRO）的普通号；曾用手机端订阅需到期后等 2–3 天",
    warranty: "订阅期掉订阅扣已用天数退差价（正常到期/额度用尽不算）；封号不质保",
  },
  "gpt-plus-ph": {
    delivery: "发放菲区自助充值卡密（永久有效不过期，卡密售出不退不换）",
    requirement:
      "禁止微软邮箱、低价充过或领过 0 元会员账号；续费需等变 Free 后充（充不上需接受换新号）",
    warranty: "质保 30 天不掉订阅，掉订阅按天退差价；封号无售后",
  },
  "gpt-pro-20x-ph": {
    delivery:
      "发放菲区 Pro 充值卡密，至充值站提交登录邮箱 + Token/Cookie 按队列自动处理（7 天内使用，不退不换）",
    requirement: "续费需彻底到期 3 天后再充（有概率充不上，能接受换新号再拍）",
    warranty:
      "掉订阅/账单异常需客户自行联系 OpenAI 官方客服，官方实际退款到账后扣 20% 处理费退还剩余金额；封号无售后",
  },
  "codex-points": {
    delivery: "发放兑换卡密，前往指定站点（aiee.fun）登录账号自助兑换",
    requirement: "仅限具备额度购买资格的已订阅账号，GPT Free 免费账号请勿下单（不符自负）",
    warranty: "仅保障有效卡密兑换到账；账号封禁或类型不符无法质保",
  },
  "grok-plus": {
    delivery: "发放美区卡付自助充值卡密，前往充值站（aiee.fun）充至本人原号（不含 Grok Bot）",
    requirement: "账号必须为 Free 状态，关闭自动续费不等于已到期，已有订阅请勿提交",
    warranty:
      "订阅期内异常掉订联系客服核实按规则处理（正常到期/额度用尽/限频不算）；封号及账号问题不质保",
  },
  "grok-premium": {
    delivery: "发放美区卡付自助卡密（aiee.fun）充至原号，含 Grok Bot / Cursor / X 权益",
    requirement:
      "账号必须为 Free 状态（关闭自动续费≠已到期）；Grok 与 Cursor 共享额度，非独立 Cursor Pro",
    warranty:
      "订阅期内非封禁停用导致的异常掉订核实处理（正常到期/额度用尽不算）；封号及账号问题不质保",
  },
  "grok-super": {
    delivery: "发放美区卡付自助卡密（aiee.fun）充至原号，含 Grok Bot / Cursor / X 权益",
    requirement:
      "账号必须为 Free 状态（关闭自动续费≠已到期）；权益不代表无限使用或独立最高档订阅",
    warranty:
      "订阅期内非封禁导致的异常掉订核实处理（正常到期/额度用尽不算）；封号及账号问题不质保",
  },
  "grok-ultra": {
    delivery: "发放美区卡付自助卡密（aiee.fun）充至原号，含 Grok Bot / Cursor / X 权益",
    requirement:
      "账号必须为 Free 状态（关闭自动续费≠已到期）；权益不代表无限使用或独立最高档订阅",
    warranty:
      "订阅期内非封禁导致的异常掉订核实处理（正常到期/额度用尽不算）；封号及账号问题不质保",
  },
  "claude-pro-account": {
    delivery:
      "美区实体卡一卡一付免 K 独享成品号，非秒发，24 小时内做号交付（急单勿拍）",
    requirement: "直接登录交付成品号（附接码地址 mailcom.yeahzi.app），保持稳定纯净网络",
    warranty: "质保首次登录（12 小时内反馈）+ 质保 30 天订阅；不含封号质保",
  },
  "gemini-ultra-5x-account": {
    delivery: "正规 iOS 渠道 99.99 美元档成品号（交付 账号----密码----辅助邮箱----2FA密钥）",
    requirement: "本商品为成品号而非充到自有谷歌号；登录后勿频繁切 IP 或多人共享",
    warranty: "仅质保首次登录，不提供后续持续使用或订阅时长保障；首登后风控/封禁无售后",
  },
  "gemini-ultra-20x-account": {
    delivery: "正规 iOS 渠道 200 美元档成品号（交付 账号----密码----辅助邮箱----2FA密钥）",
    requirement: "本商品为成品号而非充到自有谷歌号；登录后勿频繁切 IP 或多人共享",
    warranty: "仅质保首次登录，不提供后续持续使用或订阅时长保障；首登后风控/封禁无售后",
  },
  "gemini-ultra-topup": {
    delivery: "正规 iOS 渠道 200 美元档人工代充至您自有谷歌账号（非成品号，非自动发卡密）",
    requirement: "需提供本人自有谷歌账号配合代充，下单前建议先联系客服确认账号条件",
    warranty: "充至自有账号较成品号更稳妥，但谷歌风控不可控，自有账号同样无法保证完全避免风控",
  },
};

function buildPlanNotice(p: Product, upstreamDesc?: string): PlanNotice {
  const isAccount = p.fulfill_type === "account";
  const isManual = p.fulfill_type === "manual";
  const mapped = PLAN_KEYPOINTS_BY_SLUG[p.slug];

  const delivery =
    mapped?.delivery ??
    (isAccount
      ? "成品账号交付（非充值到您已有个人账号）"
      : isManual
        ? "人工代充服务，付款后请携带订单号联系客服完成代充"
        : "发放自助充值卡密与地址，充至您自己的原号");

  const requirement =
    mapped?.requirement ??
    (isAccount
      ? "直接登录交付的成品账号使用，请保持登录 IP 稳定"
      : isManual
        ? "下单前请先联系客服确认自有账号条件，付款后配合客服完成代充"
        : "下单前请仔细阅读完整商品说明，确认账号符合充值条件");

  const warranty =
    mapped?.warranty ??
    "售后规则以完整商品说明为准；封号通常不在质保范围内";

  const warning = p.account_warning || mapped?.warning || "";
  const officialPolicyText = (upstreamDesc || "").trim() || (p.description || "").trim();

  const policyBullets = [
    isAccount
      ? "虚拟数字商品说明：成品账号发货后不支持无理由退款，请确认上述说明与使用环境后再下单。"
      : isManual
        ? "人工代充说明：付款后请携带订单号联系客服安排代充；完成充值后虚拟订阅服务不支持无理由退款。"
        : "虚拟数字商品说明：充值卡密属一次性数字凭据，发货后不支持无理由退款，请确认账号符合条件后再下单。",
    "平台订单支持：如遇支付已扣款未自动出卡、代充对接或符合上述售后条件的核查需求，请携带订单号与脱敏截图联系 support@magfieldai.top。",
  ];

  return {
    delivery,
    requirement,
    warranty,
    warning,
    officialPolicyText,
    policyBullets,
  };
}

export function groupProductsByFamily(
  products: Product[],
  stockByCode: Record<string, number> | null,
  descriptionByCode?: Record<string, string> | null,
): ProductFamily[] {
  return FAMILY_DEFS.map((def) => {
    const plans = products
      .filter(def.match)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => {
        const known =
          stockByCode && Object.prototype.hasOwnProperty.call(stockByCode, p.daitu_code);
        const inStock = !known || (stockByCode![p.daitu_code] ?? 0) > 0;
        const upstreamDesc = descriptionByCode?.[p.daitu_code];
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          summary: p.summary || "",
          description: p.description || "",
          priceCny: p.price_cny,
          planLabel: def.planLabel(p),
          periodHint: def.periodHint(p),
          fulfillType: p.fulfill_type || "card",
          channelTag: p.channel_tag || "",
          accountWarning: p.account_warning || "",
          notice: buildPlanNotice(p, upstreamDesc),
          inStock,
          daituCode: p.daitu_code,
        };
      });
    if (plans.length === 0) return null;
    const activePlans = plans.filter((p) => p.inStock);
    const priceBasis = activePlans.length > 0 ? activePlans : plans;
    return {
      id: def.id,
      vendor: def.vendor,
      productLabel: def.productLabel,
      fromPrice: Math.min(...priceBasis.map((p) => p.priceCny)),
      inStock: activePlans.length > 0,
      plans,
    };
  }).filter((f): f is ProductFamily => f !== null);
}
