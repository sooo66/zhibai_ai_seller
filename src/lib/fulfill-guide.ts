import type { Product } from "./db";

export type FulfillGuide = {
  title: string;
  subtitle: string;
  actionUrl?: string;
  actionLabel?: string;
  steps: string[];
};

export function getFulfillGuide(product?: Pick<Product, "slug" | "fulfill_type"> | null): FulfillGuide {
  const slug = product?.slug || "";
  const type = product?.fulfill_type || "card";

  if (slug === "gpt-plus-ios") {
    return {
      title: "ChatGPT Plus（iOS 美区）自助充值教程",
      subtitle: "全自动卡密，支持覆盖充值至本人原号，约 1～3 分钟到账。",
      actionUrl: "https://vip.sxzfd.com",
      actionLabel: "打开自助充值站 ↗",
      steps: [
        "复制上方发货内容中的充值卡密（若发货内容附带专用充值地址，请以发货地址为准）。",
        "打开自助充值页面，按提示填写您的 ChatGPT 账号信息并粘贴卡密（强烈建议 Gmail 注册账号，不建议 Outlook/微软邮箱）。",
        "提交后等待系统自动完成处理，处理期间请勿重复提交；完成后回到 ChatGPT 刷新确认 Plus 已生效。",
      ],
    };
  }

  if (slug === "gpt-pro-20x-ph") {
    return {
      title: "ChatGPT Pro（菲区）排队自助充值教程",
      subtitle: "请在 7 天内使用卡密，按队列顺序自动处理。",
      steps: [
        "复制上方发货卡密，并打开发货信息中附带的充值站点（续费账号需彻底到期 3 天后再提交）。",
        "在充值页面输入卡密，并按指引填写 ChatGPT 登录邮箱及页面要求的 Token / Cookie 凭证。",
        "提交后系统将按队列依次处理，可在充值站进度页查看结果；完成后系统会自动清理敏感凭证，回 ChatGPT 核对 Pro 状态。",
      ],
    };
  }

  if (slug === "gpt-plus-ph") {
    return {
      title: "ChatGPT Plus（菲区）自助充值教程",
      subtitle: "卡密永久有效，请确认账号符合条件后再提交。",
      steps: [
        "确认待充值账号已恢复 Free 状态，且非微软邮箱注册、未低价充过或领取过官方 0 元会员。",
        "复制上方卡密，打开随卡附带的自助充值站点，按页面指引填写账号并提交充值。",
        "提交后等待系统处理完成并回 ChatGPT 核对订阅；若老号续费未成功，可等待 1–3 天重试或注册新号使用同一张卡密充值。",
      ],
    };
  }

  if (slug === "gpt-pro-50x-chile") {
    return {
      title: "ChatGPT Pro 50x（智利区）自助充值教程",
      subtitle: "不限账号地区，仅限当前无任何订阅（无 GO/PLUS/PRO）的普通号。",
      steps: [
        "确认当前账号无任何生效订阅；若曾通过 iOS / Google Pay 手机端订阅，需在原订阅到期后等待 2–3 天。",
        "复制上方发货卡密，打开随卡附带的充值站点，核对账号后输入卡密提交。",
        "处理中请勿重复提交；完成后登录 ChatGPT 确认 Pro 50x 订阅生效。",
      ],
    };
  }

  if (slug.startsWith("gpt-")) {
    return {
      title: "ChatGPT 卡密自助充值教程",
      subtitle: "全自动即充即到，按页面提示 3 步完成激活。",
      steps: [
        "复制上方发货内容中的卡密，并打开随卡附带的自助充值站点。",
        "核对账号是否符合所购套餐要求（iOS Pro 套餐支持已有 Plus/Pro 覆盖重置到期时间；年卡严禁谷歌逾期/未取消续费/团队版/0元号）。",
        "粘贴卡密提交充值，等待 1～3 分钟处理完成，回到 ChatGPT 刷新确认订阅状态。",
      ],
    };
  }

  if (slug.startsWith("codex-")) {
    return {
      title: "Codex 点数额度兑换教程",
      subtitle: "仅限具备额度购买资格的付费 ChatGPT 账号，Free 账号不可兑换。",
      actionUrl: "https://aiee.fun",
      actionLabel: "打开兑换站 aiee.fun ↗",
      steps: [
        "确认你的 ChatGPT 账号已开通对应付费资格（GPT Free 免费账号无法添加额度）。",
        "复制上方卡密并打开兑换地址 aiee.fun，按页面指引登录符合条件的账号并输入卡密完成兑换。",
        "兑换成功后，返回账号内查看 Codex 剩余额度是否已增加。",
      ],
    };
  }

  if (slug.startsWith("grok-")) {
    return {
      title: "Grok 卡密自助充值教程",
      subtitle: "仅限当前为 Free 状态的原号充值（关闭自动续费不等于已到期）。",
      actionUrl: "https://aiee.fun",
      actionLabel: "打开充值站 aiee.fun ↗",
      steps: [
        "登录你的 Grok 账号，确认套餐页面明确显示为 Free 状态（仍在有效期内的账号请勿提交）。",
        "复制上方发货卡密，前往充值站 aiee.fun 选择对应套餐，填写账号与卡密并提交（处理中切勿重复提交）。",
        "等待处理完成后，回到账号「设置 → 订阅/账单」核对套餐有效期及对应权益。",
      ],
    };
  }

  if (slug.startsWith("claude-") || (type === "account" && slug.includes("claude"))) {
    return {
      title: "Claude Pro 成品号登录教程",
      subtitle: "美区实体卡独享成品号，质保首登（12 小时内反馈）+ 30 天订阅。",
      actionUrl: "https://mailcom.yeahzi.app",
      actionLabel: "打开接码邮箱 ↗",
      steps: [
        "妥善保存上方完整交付资料（格式：邮箱----密码----clientid----rt----id----sk）。",
        "登录 claude.ai 输入邮箱，前往接码站点 mailcom.yeahzi.app（设置 1 3 4）查收登录验证邮件。",
        "若收到的是「点击按钮验证登录」邮件，请右键复制按钮链接到自己浏览器中打开；使用稳定纯净节点登录，首登异常请 12 小时内带单号联系客服。",
      ],
    };
  }

  if (slug.startsWith("gemini-")) {
    return {
      title: "Gemini Ultra 成品号登录教程",
      subtitle: "本商品为成品号（仅质保首次登录），请保持网络环境稳定。",
      actionUrl: "https://2fa.run",
      actionLabel: "打开 2FA 工具 2fa.run ↗",
      steps: [
        "保存上方交付资料（格式：账号----密码----辅助邮箱----2FA密钥）。",
        "在稳定纯净的网络环境下登录谷歌账号；弹出两步验证时，将 2FA 密钥填入本地验证器或 2fa.run 获取 6 位动态码。",
        "首次登录成功后立即核对 Gemini Ultra 订阅状态并完善恢复方式，切勿频繁切 IP、切设备或多人共享。",
      ],
    };
  }

  if (type === "manual") {
    return {
      title: "人工代充对接流程",
      subtitle: "支付完成后由客服人工为您处理自有账号代充。",
      steps: [
        "复制本页订单号并保存付款截图。",
        "发送订单号至客服邮箱 support@magfieldai.top 确认自有账号状态与代充排期。",
        "客服完成代充后会第一时间通知您登录核对订阅有效期。",
      ],
    };
  }

  return {
    title: "卡密激活使用说明",
    subtitle: "复制卡密并按发货附带的指引完成自助激活。",
    steps: [
      "点击复制上方发货内容，妥善保存卡密与充值网址。",
      "打开发货说明中的自助充值页面，按页面指引填写账号信息与卡密。",
      "提交后等待处理完成，回到对应 AI 平台刷新核对订阅状态。",
    ],
  };
}
