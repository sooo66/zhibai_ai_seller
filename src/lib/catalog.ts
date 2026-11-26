import type Database from "better-sqlite3";
import type { FulfillType } from "./db";

export type CatalogRow = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  price_cny: number;
  daitu_code: string;
  fulfill_type: FulfillType;
  channel_tag: string;
  account_warning: string;
  visible: number;
  sort_order: number;
};

const GPT_PLUS_IOS_DESC = `GPT PLUS 充值卡密(IOS美区质保)

GPT PLUS IOS渠道充值卡密（美卡、巴西卡、加拿大礼品卡）

本商品为 ChatGPT Plus IOS渠道充值卡密，购买后自动显示卡密和充值地址。客户复制卡密后，进入充值网站按照页面提示提交即可完成充值。

📦 购买后获得
• GPT Plus IOS渠道充值卡密
• 专用充值网站地址
• 自助充值操作入口 https://vip.sxzfd.com

卡密需在充值网站内提交使用，请按照页面提示填写账号信息并完成充值流程。

✅ 账号建议
强烈建议使用 Gmail 谷歌邮箱注册的 ChatGPT 账号进行充值，通常会减少很多额外风险。
也可以使用 QQ、163、Gmail 等邮箱注册的账号。Outlook、微软邮箱注册的账号稳定性相对较弱，不建议优先使用。

📌 使用说明
• 购买成功后，复制系统发放的充值卡密。
• 打开订单中显示的充值网站地址。
• 按照页面提示填写 ChatGPT 账号相关信息。
• 提交充值，等待系统处理完成。

⚠️ 质保说明
本服务提供质保订阅服务，掉订阅按质保天数退款，封号无质保。
由于 OpenAI 对账号 IP 环境、账号行为、使用内容、异常操作、违规话术等方面存在较严格的风控机制，账号封禁等情况无法准确判断具体触发原因。
账号历史使用记录、注册环境、登录环境、IP 质量、账号本身状态等因素，也可能影响账号稳定性。
下单即视为已了解并接受以上说明，请确认后再购买。`;

const GPT_PLUS_ANNUAL_IOS_DESC = `🧡GPT PLUS IOS年卡充值卡密(12个月)

🧡全自动化充值，即充即到，非人工代充，下单发送卡密和充值地址!

⚠️ 质保说明

本服务提供质保订阅服务，掉订阅按质保天数退款，封号无质保。

由于 OpenAI 对账号 IP 环境、账号行为、使用内容、异常操作、违规话术等方面存在较严格的风控机制，账号封禁等情况无法准确判断具体触发原因。

账号历史使用记录、注册环境、登录环境、IP 质量、账号本身状态，也可能影响账号稳定性。

下单即视为已了解并接受以上说明，请确认后再购买。

谷歌账单逾期不充！谷歌宽限期不充！卡付没取消不充！谷歌自动续费不取消不充！团队版不充！0元购不充！

以上情况都会在覆盖过期和直冲中出现导致不到账！

要充的默认接受自己承担责任！！`;

const GPT_PRO_IOS_DESC = (tier: "10X" | "20X" | "50X") => `🧡GPT ${tier} PRO 充值卡密(iOS正规美区质保)

🧡质保30天不掉订阅，掉订阅按天退差价，封号99%的原因是由于帐号本身的问题，无售后

🧡常见封号原因：批量注册的帐号、帐号共享、频繁更换使用ip、问一些敏感问题、翻译敏感话术等，都会造成封号

🧡全自动化充值，即充即到，非人工代充，下单发送卡密和充值地址!

✅已有Plus 或者 Pro 都可覆盖，重置到期时间`;

const GPT_PRO_50X_CHILE_DESC = `GPT PRO 50X｜CL 充值1个月
不限地区 · 卡密自助充值 · 非成品账号

✅ 适用账号
适用于当前没有任何订阅的普通 ChatGPT 账号，无 GO、PLUS、PRO 等订阅，没有地区限制。

⚠️ 手机订阅用户请注意
如曾通过 iOS、Google Pay 等手机渠道订阅，需在原订阅到期后等待 2–3 天再充值。

📦 购买与充值
下单后获得卡密 + 充值地址，按页面指引自助充值。
提交前核对账号，处理中请勿重复提交。

🛡️ 质保说明
订阅期间如掉订阅，经核实后扣除已使用天数费用，退还剩余天数对应金额。正常到期、额度用尽不属于掉订阅。

⚠️ 封号不质保
账号封禁、停用不在质保范围内，不提供解封服务。请勿进行违规或异常操作。
妥善保管卡密；充值异常请提供订单号及报错截图联系客服，请勿在截图中暴露密码或完整卡密。`;

const GPT_PLUS_PH_DESC = `🧡官方正规充值（非零元购），无需上号自己拿着卡密去自助充值网站充值！
🧡禁止充值微软邮箱注册，低价充值过的账号不能使用，领取过官方0元会员的账号不能使用！
🧡续费充值有概率充值不上，能接受重新注册账号充值的再拍，接受不了换号的别拍！
🧡续费需要等账号变成 Free 后才可以充值，提前充值有充值不成功的风险，充值不成功可以注册新的账号充值，或者等1-3天后重新提交充值，卡密永久可以使用不过期，卡密售出不退不换！
🧡质保30天不掉订阅，掉订阅按天退差价，封号99%的原因是由于帐号本身的问题，无售后
🧡常见封号原因：批量注册的帐号、帐号共享、频繁更换使用ip、问一些敏感问题、翻译敏感话术等，都会造成封号`;

const GPT_PRO_20X_PH_DESC = `ChatGPT Pro 月卡充值说明

📦 购买后发货内容
购买成功后，您将收到一张 充值卡密。请妥善保存卡密，后续需要凭卡密进入充值站点提交订单。

🚀 使用流程
• 购买商品后，复制系统发货的卡密。
• 打开订单中附带的充值站点。
• 在充值页面输入卡密，并按页面提示填写 ChatGPT 账号信息。
• 提交后系统会按订单队列自动处理。
• 可在充值站点的进度查询页面查看处理结果。

📝 提交时需要准备
• ChatGPT 登录邮箱
• 页面要求提交的 Token、Cookie 或其他充值凭证
• 确保账号可以正常登录，且信息填写正确

✅ 服务说明
• 自助提交：无需私聊发送资料，按页面提示操作即可。
• 顺序处理：系统会根据订单队列依次处理充值任务。
• 安全清理：订单完成后，系统会自动清理敏感凭证。
• 状态可查：提交后可在充值站点查询处理进度。
• 售后支持：如遇异常，可联系客服协助核查。

⚠️ 注意事项
• 充值成功后，正价订阅消费原则上不支持退款。
• 账号异常、Token 失效、Cookie 过期、信息填写错误，可能导致充值失败或处理变慢。
• 因账号违规、风控、封禁、KYC 验证、手机号绑定异常等问题导致无法使用，需客户自行处理。
• 因客户主动取消订阅、账号异常、违反平台规则导致的问题，不支持退款。
• 如出现掉订阅、官方账单异常或官方风控问题，需客户自行联系 OpenAI / ChatGPT 官方客服处理。
• 如官方实际退款到账，我们将扣除 20% 处理费后退还剩余金额。

📌 下单提醒
🧡请在购买前确认 ChatGPT 账号可以正常登录，并仔细阅读本商品说明。购买后请及时使用卡密前往充值站点提交信息，提交后请勿频繁重复提交。下单即代表您已了解并接受本商品规则。
🧡续费充值有概率充值不上，能接受重新注册账号充值的再拍，接受不了换号的别拍！
🧡续费需要等账号彻底到期3天后才可以充值，提前充值有充值不成功的风险，充值不成功可以注册新的账号充值，或者等3天后重新提交充值，卡密请勿长囤，7天内使用掉，卡密售出不退不换！`;

const CODEX_POINTS_DESC = `Codex 点数额度

按需补充 Codex 点数额度，下单后使用卡密完成兑换，请先确认账号符合购买条件。

重要：下单前请确认账号类型
GPT Free 免费账号无法购买或添加额度，请勿下单。请先确认当前账号具备额度购买资格，因账号类型不符造成的兑换问题需由买家自行承担。

注意：如果账号被封禁则无法质保，一般是账号或者使用问题无法处理。

卡密使用流程
• 获取卡密后，前往下方指定地址。
• 按页面提示登录符合条件的账号，输入卡密并完成兑换。
• 兑换完成后，请在账号内核对额度到账情况。
• 卡密使用地址：https://aiee.fun

温馨提示：卡密属于数字商品，请妥善保管，勿向他人泄露。提交兑换前请再次核对账号信息和所选规格。`;

const GROK_PLUS_DESC = `GROK PLUS · 卡密自助充值
Grok Plus 新版订阅卡付 · 美区卡付渠道 · 充值至您自己的账号 · 不含 Bot

⚠️ 购买前请确认：账号必须为 Free 状态
请使用没有任何有效订阅的 Grok Free 账号充值。已有订阅、仍在订阅有效期内的账号，请勿直接提交。
关闭自动续费不等于订阅已到期，请以账号内实际显示的订阅状态为准。

📦 商品说明
• 本商品为 Grok Plus 新版订阅充值服务，不是成品账号。
• 下单后获取充值卡密，前往指定页面按指引自助充值（https://aiee.fun）。
• 使用美区卡付渠道，订阅周期以您购买的商品规格为准。
• 本商品不包含 Grok Bot，请确认需求后购买。
• 账号需能够正常登录、正常使用，并符合平台对账号及所在地区的要求。

✨ 订阅与使用说明
Grok 可用于 AI 对话、写作辅助、信息分析及创意内容探索。语音、图片和视频等功能的具体开放情况，请以您账号中的 Plus 套餐页面为准。
请注意：本商品不承诺无限使用额度，也不包含额外 API 充值余额。可用模型、功能、额度及刷新规则以官方实际提供为准；达到使用限额不等于订阅失效。

🛡️ 订阅质保
在所购订阅有效期内，如出现订阅异常失效或掉订阅，请携带订单号及订阅状态截图联系客服，核实后按店铺质保规则处理。
正常到期、额度用尽、平台限频或官方功能调整，不属于掉订阅。

⚠️ 封号及账号问题不质保
账号被封禁、停用、限制使用等情况不在质保范围内，不提供解封服务。
因账号资料丢失、账号被盗、违规操作或账号自身权限问题导致无法使用，不属于订阅质保。请遵守平台规则，勿共享敏感资料或进行异常操作。

💡 温馨提示
• 美区卡付指充值渠道，不代表可以绕过平台地区或账号限制。
• 提交前务必核对账号，不要将卡密用于不符合条件的账号。
• 充值处理时间以页面实际进度为准，请勿反复提交。
• 本服务为第三方充值服务，非官方授权销售；官方对第三方购买存在限制，请确认接受相关风险后下单。`;

const GROK_TIER_DESC = (tier: "Premium" | "Super" | "Ultra") => `GROK ${tier.toUpperCase()} · 卡密自助充值
Grok ${tier} 新版订阅卡付 · 美区卡付渠道 · 充值至您自己的账号

⚠️ 下单前请确认：账号必须为 Free 状态
本商品适用于当前没有有效付费订阅的 Free 账号。已有订阅的账号，请等待订阅实际到期，并确认页面显示 Free 后再充值。
关闭自动续费不等于订阅已经到期，请勿重复充值或叠加购买。

📦 商品说明
• 订阅类型：Grok ${tier}，订阅周期以所选商品规格为准。
• 发货形式：下单付款后获得卡密，前往指定充值页面自助操作（https://aiee.fun）。
• 充值渠道：美区卡付渠道，充值至您自己的账号。
• 商品性质：本商品为订阅充值服务，不是成品账号，不包含账号注册服务。

✨ 订阅权益
包含 Grok Bot · Cursor · X 权益（具体开通及使用条件以实际到账套餐和官方页面为准）。
请注意：Grok 与 Cursor 共享套餐内适用额度，并非无限使用；Cursor 权益不等同于独立 Cursor Pro 订阅；第三方模型及额外 API 费用不包含在本商品内。

🛡️ 订阅期间质保
在购买的订阅有效期内，如出现非账号封禁、停用等原因导致的订阅异常掉订，请携带订单号、充值时间及订阅状态截图联系客服核实处理。
正常到期、额度用尽、额度刷新等待及官方功能调整，不属于订阅掉订。

⚠️ 封号及账号问题不质保
账号被封禁、停用不在质保范围内，不提供解封服务。
账号自身的地区限制、资格限制、风控或违规使用导致的功能不可用，不属于订阅充值质保范围。

💡 温馨提示
• 美区卡付指充值渠道，不代表可以绕过账号或地区使用限制。
• 提交充值后，请勿同时通过其他渠道重复充值。
• 本商品为第三方充值服务，非官方授权销售；官方对第三方购买存在限制，请确认接受相关风险后下单。`;

const CLAUDE_PRO_ACCOUNT_DESC = `Claude Pro 谷歌/微软成品号（免K）

1·【美区实体卡 · 一卡一付】这是已开通 Claude Pro 的优质成品号，一人独享。
2·免 KYC，使用海外实体卡开通，一号一卡，没有连带风险。
3·质保首登，并质保 30 天订阅；本价格不含封号质保。
4·首次登录如遇问题，请在 12 小时内带订单号联系客服协助处理。
5·后续如需续费，可联系客服协助或使用合规美区实体卡处理，避免自行绑定虚拟卡触发风控。
6·下单后请等待商家做号发货，急单勿拍，24小时内交付，一般当天都可以交付。
7·交付格式：邮箱----密码----邮箱clientid-----邮箱rt----id----sk
接码地址：mailcom.yeahzi.app 设置 1 3 4
8·如遇到登录时接收的验证码为点击按钮验证登录，请右键复制链接，在自己电脑中打开，在邮箱中无法打开验证。`;

const GEMINI_ULTRA_ACCOUNT_DESC = (tierLabel: string) => `GEMINI ULTRA
Gemini Ultra 成品账号 · 1个月 · 正规 iOS 充值渠道｜${tierLabel}

⚠️ 下单前请确认商品类型
本商品为 Gemini Ultra 成品账号，仅质保首次登录，不是默认充值到您自己的账号。

📦 账号交付说明
发货资料包含账号、密码、辅助邮箱及 2FA 密钥，格式如下：
账号----密码----辅助邮箱----2FA密钥
2FA 验证码工具：2fa.run
2FA 密钥属于敏感凭据，建议优先使用可信的本地验证器，不要公开分享账号资料或验证码。

🔐 登录与使用建议
• 收到账号后，请及时核对交付资料及订阅状态。
• 尽量使用稳定、可信的网络环境，避免频繁切换 IP 或异常登录。
• 请勿多人共享账号，避免短时间内频繁切换设备。
• 按平台要求完善账号安全设置，绑定自己的恢复方式并妥善保管凭据。
• 遵守平台使用规则。任何操作建议均无法保证账号不触发风控或封禁。

🛡️ 质保规则 · 成品号仅质保首登
本商品为成品账号，仅质保首次登录，不提供后续持续使用或订阅时长保障。
首次登录如无法正常登录，请保留报错截图并提供订单号，联系客服核实处理。
谷歌风控不可控，账号可能因平台风控或不规范使用（如蒸馏等）受到限制或封禁。首次正常登录后的风控、封禁及使用异常，不在本商品约定质保范围内。`;

const GEMINI_ACCOUNT_WARNING =
  "仅质保首次登录，不提供后续持续使用或订阅时长保障！本商品为成品号（非充值到您已有谷歌账号），首登后风控/封禁无售后。";

const GEMINI_ULTRA_TOPUP_DESC = `GEMINI ULTRA
Gemini Ultra 代充值 · 1个月 · 正规 iOS 充值渠道｜200 美元档位

⚠️ 下单前请确认商品类型
本商品为 Gemini Ultra 20X 人工代充值，默认充值到您自己的谷歌账号（非成品号，非自动发卡密）。

📦 交付与代充说明
• 渠道与档位：正规 iOS 充值渠道，200 美元档位（1 个月）。
• 为了更稳妥，建议您提供自己的谷歌账号由我们代充；下单前请先联系客服确认账号条件及代充安排。
• 付款完成后系统会生成代充订单号，请携带订单号联系客服协助完成充值。

🛡️ 质保与风控提醒
• 自有账号代充相比成品号更稳妥，但谷歌风控不可控，自有账号同样无法保证完全避免平台风控或封禁。
• 请遵守平台使用规则，避免异常操作或违规使用（如蒸馏等）。`;

/** Canonical Magfield A/C catalog — upserted on boot. */
export const CATALOG_ROWS: CatalogRow[] = [
  {
    slug: "gpt-plus-ios",
    name: "ChatGPT Plus · iOS 美区",
    summary: "iOS 渠道自助卡密，支持覆盖充值至原号（推荐 Gmail 账号）。",
    description: GPT_PLUS_IOS_DESC,
    price_cny: 149,
    daitu_code: "8C2F1E5A1F8D8118",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号建议：强烈建议使用 Gmail 注册账号（亦可用 QQ/163），Outlook/微软邮箱稳定性较弱不建议优先使用；掉订阅按质保天数退款，封号无质保。",
    visible: 1,
    sort_order: 10,
  },
  {
    slug: "gpt-plus-annual-ios",
    name: "ChatGPT Plus · 年卡（iOS）",
    summary: "12 个月 iOS 全自动充值卡密，质保订阅 12 个月。",
    description: GPT_PLUS_ANNUAL_IOS_DESC,
    price_cny: 1680,
    daitu_code: "GPTPLUS-ANNUAL-IOS-20261002",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "不可充账号：谷歌账单逾期、谷歌宽限期、卡付未取消、谷歌自动续费未取消、团队版、0元购账号均不可充，强行充值不到账需自行承担责任。",
    visible: 1,
    sort_order: 15,
  },
  {
    slug: "gpt-pro-10x-ios",
    name: "ChatGPT Pro 10x · iOS 美区",
    summary: "iOS 美区全自动卡密即充即到，已有 Plus/Pro 均可覆盖充值。",
    description: GPT_PRO_IOS_DESC("10X"),
    price_cny: 759,
    daitu_code: "F75FAA3508D63C46",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "覆盖提示：已有 Plus 或 Pro 均可覆盖并重置到期时间；质保 30 天掉订阅按天退差价，封号无售后。",
    visible: 1,
    sort_order: 20,
  },
  {
    slug: "gpt-pro-20x-ios",
    name: "ChatGPT Pro 20x · iOS 美区",
    summary: "iOS 美区全自动卡密即充即到，已有 Plus/Pro 均可覆盖充值。",
    description: GPT_PRO_IOS_DESC("20X"),
    price_cny: 1490,
    daitu_code: "D88A649A5CC464F5",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "覆盖提示：已有 Plus 或 Pro 均可覆盖并重置到期时间；质保 30 天掉订阅按天退差价，封号无售后。",
    visible: 1,
    sort_order: 30,
  },
  {
    slug: "gpt-pro-50x-ios",
    name: "ChatGPT Pro 50x · iOS 美区",
    summary: "iOS 美区全自动卡密即充即到，已有 Plus/Pro 均可覆盖充值。",
    description: GPT_PRO_IOS_DESC("50X"),
    price_cny: 3490,
    daitu_code: "2C3BD75F9CE2C758",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "覆盖提示：已有 Plus 或 Pro 均可覆盖并重置到期时间；质保 30 天掉订阅按天退差价，封号无售后。",
    visible: 1,
    sort_order: 40,
  },
  {
    slug: "gpt-pro-50x-chile",
    name: "ChatGPT Pro 50x · 智利区",
    summary: "不限地区自助卡密，仅限当前无任何订阅的普通账号充值。",
    description: GPT_PRO_50X_CHILE_DESC,
    price_cny: 3490,
    daitu_code: "GPTPRO25X-CHILE-20260930",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号条件：不限地区，但仅限当前无任何订阅（无 GO/PLUS/PRO）的普通号；曾用 iOS/Google Pay 订阅需到期后等 2–3 天再充。",
    visible: 1,
    sort_order: 45,
  },
  {
    slug: "gpt-plus-ph",
    name: "ChatGPT Plus · 菲区通道",
    summary: "菲区特惠卡密自助充，卡密永久有效不退不换（禁微软邮箱/0元购号）。",
    description: GPT_PLUS_PH_DESC,
    price_cny: 129,
    daitu_code: "6D66FF49218BF45C",
    fulfill_type: "card",
    channel_tag: "特惠通道",
    account_warning:
      "严格限制：禁止微软邮箱、低价充过或领过 0 元会员的账号；续费需变 Free 后充（有概率充不上，能接受换新号再拍）；卡密售出不退不换。",
    visible: 1,
    sort_order: 50,
  },
  {
    slug: "gpt-pro-20x-ph",
    name: "ChatGPT Pro 20x · 菲区通道",
    summary: "菲区 Pro 卡密排队自助充（需提交邮箱+Token/Cookie，卡密 7 天内使用）。",
    description: GPT_PRO_20X_PH_DESC,
    price_cny: 1180,
    daitu_code: "69526F78D0568841",
    fulfill_type: "card",
    channel_tag: "特惠通道",
    account_warning:
      "特别售后规则：续费需彻底到期 3 天后再充，卡密 7 天内使用、售出不退不换；若掉订阅需自行联系 OpenAI 官方客服，官方实际退款到账后扣 20% 处理费退还剩余金额。",
    visible: 1,
    sort_order: 55,
  },
  {
    slug: "codex-points",
    name: "Codex 点数额度",
    summary: "按规格发放卡密至 aiee.fun 兑换额度（GPT Free 免费账号勿下）。",
    description: CODEX_POINTS_DESC,
    price_cny: 100,
    daitu_code: "DRAFT6893152BA47870EF",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "重要提示：GPT Free 免费账号无法购买或添加额度，请勿下单（因账号类型不符造成的兑换问题由买家自行承担）；账号封禁无法质保。",
    visible: 1,
    sort_order: 60,
  },
  {
    slug: "grok-plus",
    name: "Grok Plus · 美区蓝V",
    summary: "美区卡付自助充至原号，仅限 Free 状态账号（不含 Grok Bot）。",
    description: GROK_PLUS_DESC,
    price_cny: 68,
    daitu_code: "0B96BC7C7F85809E",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号必须为 Free 状态（关闭自动续费不等于已到期），已有订阅请勿提交；本商品不含 Grok Bot，不承诺无限额度。",
    visible: 1,
    sort_order: 70,
  },
  {
    slug: "grok-premium",
    name: "Grok Premium · 美区",
    summary: "美区卡付原号自助充（含 Grok Bot/Cursor/X 权益，仅限 Free 账号）。",
    description: GROK_TIER_DESC("Premium"),
    price_cny: 268,
    daitu_code: "C01878BB9126D760",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号必须为 Free 状态（关闭自动续费不等于已到期）；Grok 与 Cursor 共享额度非无限使用，Cursor 权益不等同于独立 Cursor Pro。",
    visible: 1,
    sort_order: 75,
  },
  {
    slug: "grok-super",
    name: "Grok Super · 美区",
    summary: "美区卡付原号自助充（含 Grok Bot/Cursor/X 权益，仅限 Free 账号）。",
    description: GROK_TIER_DESC("Super"),
    price_cny: 838,
    daitu_code: "9BFFB902156EC0F1",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号必须为 Free 状态（关闭自动续费不等于已到期）；含 Grok Bot/Cursor/X 权益，不代表无限使用或独立最高档订阅。",
    visible: 1,
    sort_order: 80,
  },
  {
    slug: "grok-ultra",
    name: "Grok Ultra · 美区",
    summary: "美区卡付原号自助充（含 Grok Bot/Cursor/X 权益，仅限 Free 账号）。",
    description: GROK_TIER_DESC("Ultra"),
    price_cny: 1680,
    daitu_code: "96A0C324544B897E",
    fulfill_type: "card",
    channel_tag: "",
    account_warning:
      "账号必须为 Free 状态（关闭自动续费不等于已到期）；含 Grok Bot/Cursor/X 权益，不代表无限使用或独立最高档订阅。",
    visible: 1,
    sort_order: 85,
  },
  {
    slug: "claude-pro-account",
    name: "Claude Pro · 免K成品号",
    summary: "美区实体卡一卡一付免K独享成品号，24小时内交付（急单勿拍）。",
    description: CLAUDE_PRO_ACCOUNT_DESC,
    price_cny: 288,
    daitu_code: "21B2AC8107463979",
    fulfill_type: "account",
    channel_tag: "",
    account_warning:
      "非秒发成品号：下单等待商家做号，24 小时内交付（急单勿拍）；首次登录如有问题请在 12 小时内带订单号联系客服，本价格不含封号质保。",
    visible: 1,
    sort_order: 90,
  },
  {
    slug: "gemini-ultra-5x-account",
    name: "Gemini Ultra 5X · 成品号",
    summary: "iOS 正规渠道 99.99 美元档成品号（交付账号/密码/辅邮/2FA）。",
    description: GEMINI_ULTRA_ACCOUNT_DESC("99.99 美元档位"),
    price_cny: 548,
    daitu_code: "8E7B67C254E14278",
    fulfill_type: "account",
    channel_tag: "",
    account_warning: GEMINI_ACCOUNT_WARNING,
    visible: 1,
    sort_order: 100,
  },
  {
    slug: "gemini-ultra-20x-account",
    name: "Gemini Ultra 20X · 成品号",
    summary: "iOS 正规渠道 200 美元档成品号（交付账号/密码/辅邮/2FA）。",
    description: GEMINI_ULTRA_ACCOUNT_DESC("200 美元档位"),
    price_cny: 780,
    daitu_code: "B9CFC5EAB8580343",
    fulfill_type: "account",
    channel_tag: "",
    account_warning: GEMINI_ACCOUNT_WARNING,
    visible: 1,
    sort_order: 105,
  },
  {
    slug: "gemini-ultra-topup",
    name: "Gemini Ultra 20X · 代充",
    summary: "正规 iOS 200 美元档人工代充至您自有谷歌账号（暂不上架，仅保留配置）。",
    description: GEMINI_ULTRA_TOPUP_DESC,
    price_cny: 898,
    daitu_code: "B7A1E6DC817933A8",
    fulfill_type: "manual",
    channel_tag: "",
    account_warning:
      "本商品为人工代充至您自己的谷歌账号（非成品号，非自动发卡密）；下单前建议先联系客服确认账号条件，付款后请带订单号联系客服完成代充；自有账号同样无法保证完全避免谷歌风控。",
    visible: 0,
    sort_order: 910,
  },
  // Legacy rows — keep but hide
  {
    slug: "claude-pro-month",
    name: "Claude Pro · 直充月卡（下架）",
    summary: "旧码已失效，已下架。",
    description: "请改选 Claude Pro 成品号。",
    price_cny: 168,
    daitu_code: "307E565E19051098",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 0,
    sort_order: 900,
  },
];

export function upsertCatalog(database: Database.Database) {
  const insert = database.prepare(`
    INSERT INTO products (
      slug, name, summary, description, price_cny, daitu_code,
      fulfill_type, channel_tag, account_warning, visible, sort_order
    ) VALUES (
      @slug, @name, @summary, @description, @price_cny, @daitu_code,
      @fulfill_type, @channel_tag, @account_warning, @visible, @sort_order
    )
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      summary = excluded.summary,
      description = excluded.description,
      price_cny = excluded.price_cny,
      daitu_code = excluded.daitu_code,
      fulfill_type = excluded.fulfill_type,
      channel_tag = excluded.channel_tag,
      account_warning = excluded.account_warning,
      visible = excluded.visible,
      sort_order = excluded.sort_order
  `);

  const tx = database.transaction(() => {
    for (const row of CATALOG_ROWS) insert.run(row);
  });
  tx();
}
