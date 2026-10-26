另存人生 · 免费体验额度中转（v0.0.10，对应 issue #24）
=====================================================

这是什么
--------
一个很小的 Cloudflare Worker。网页默认把 AI 请求发到这里，由它带着你的 DeepSeek 密钥转给 DeepSeek，
这样用户第一次来不用注册、不用填密钥，就能走完一局。

  网页 → 这个中转 → DeepSeek（deepseek-flash，关掉思考，流式原样透传）

它会做的事
- 只转发 POST /v1/chat/completions；GET /health 看它活着没有。
- 只允许模型 deepseek-flash；强制 thinking: disabled；只保留 model / messages / temperature / top_p /
  response_format / stream / max_tokens，其它字段丢掉；max_tokens 有上限。
- 请求体大小上限（默认 256KB）、消息条数上限（默认 8 条）。
- 每个访问者每天限额（默认 40 次）：按「IP + 盐 + 日期」算哈希存在 KV 里，不存原始 IP；
  另有全站每天总上限（默认 3000 次），防止被刷爆账单。
- 用完时返回 429，code 是 daily_limit（这个人用完）或 global_limit（今天全站用完）。
  网页看到后会提示：「明天再来，或者用自己的密钥继续」。
- 每次成功时在响应头 X-Quota-Remaining 里告诉网页今天还剩几次。
- 只接受这些来源：https://huangchenyun25-web.github.io、localhost / 127.0.0.1（本机调试）、
  以及双击打开本地文件时浏览器发的 Origin: null。其它网站来源一律 403。
- 上游报错时不把上游原话转回去，只给一个简短说明。
- 不保存、不记录任何请求内容。
- 可选：设置了 TURNSTILE_SECRET 就要求请求头带 CF-Turnstile-Token（网页目前没接，默认不开）。

密钥放哪里
----------
只放在 Cloudflare 的 secret 里，不写进任何文件，也不进 git：

  npx wrangler secret put DEEPSEEK_API_KEY
  npx wrangler secret put IP_SALT          （随便一串字，建议设）

现在的部署（2026-10-24）
------------------------
- Worker 名：lingcun-relay（Cloudflare 账户 huangchenyun25@gmail.com）
- 地址：https://lingcun-relay.lingcun.workers.dev   （workers.dev 子域：lingcun）
  健康检查：https://lingcun-relay.lingcun.workers.dev/health
- KV：lingcun-relay-QUOTA，id 7da795f6d4134df5abd1b77686b05adc（已填进 wrangler.toml）
- 生效的限额：每人每天 40 次（DAILY_LIMIT），全站每天 3000 次（GLOBAL_DAILY_LIMIT），
  请求体最大 256KB，最多 8 条消息，max_tokens 上限 8192。
- 来源白名单：https://huangchenyun25-web.github.io，加上 localhost / 127.0.0.1 和本地文件（Origin: null）。
- 网页里的 RELAY_URL 已经填成上面的地址（_build/p2.js）。
- 这次是用 Cloudflare 的 API 部署的（没用 wrangler deploy），内容和 wrangler.toml 一致。
- 机密（DEEPSEEK_API_KEY、IP_SALT）用 wrangler secret put 设好了：用的是一枚 Cloudflare API 令牌，
  通过环境变量 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID 传给 wrangler（不用 wrangler login）。密钥不在任何文件里。
- 2026-10-24 线上实测：经 https://lingcun-relay.lingcun.workers.dev 发一次流式请求，返回 200、DeepSeek 正常分段输出，
  X-Quota-Remaining 是 39。

怎么改密钥（DEEPSEEK_API_KEY / IP_SALT）
---------------------------------------
方法一（网页，最简单）：登录 https://dash.cloudflare.com → Workers 和 Pages → lingcun-relay →
  设置（Settings）→ 变量和机密（Variables and Secrets）→ 找到 DEEPSEEK_API_KEY →「编辑」，
  类型选「机密（Secret）」，粘贴密钥 → 部署（Deploy）。IP_SALT 同理（随便一串长的随机字符）。
方法二（命令行）：在这个 relay 文件夹里
  npx wrangler login              （或者不登录：先设环境变量 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID）
  npx wrangler secret put DEEPSEEK_API_KEY
  npx wrangler secret put IP_SALT
  注意：当前文件夹里要有 node_modules（比如先 npm i wrangler），否则 wrangler 可能报 EACCES /node_modules/.cache。
改完立即生效，不用重新部署代码。改限额：改 wrangler.toml 的 [vars] 后 npx wrangler deploy，
或在上面同一个页面里改对应的「文本」变量。

以后更新代码
------------
在这个 relay 文件夹里 npx wrangler login 之后 npx wrangler deploy（会沿用已有的 secret）。

本机测试（不联网、不花钱）
--------------------------
- node v0.0.11/_test/relay_test.mjs
  用假的上游和内存 KV 跑 25 项：来源限制、模型白名单、大小上限、关思考、流式透传、
  每人限额、全站限额、上游出错不泄露、文件里没有密钥等。
- 也可以用 wrangler dev --local，把 UPSTREAM_BASE 指向本机假的上游（写在 .dev.vars 里，
  .dev.vars 不要提交）。v0.0.10 自测时这样跑过：前两次 200、X-Quota-Remaining 依次是 1、0，
  第三次 429 daily_limit。
- 网页端到端：_test/test.js 会把 worker 包成本机服务，用 ?relay=http://127.0.0.1:端口 打开网页走完一局，
  并检查额度用完时的提示。?relay= 只接受 127.0.0.1 / localhost，防止被人用网址改去别的地方。

说明
----
KV 不是严格的计数器，同一瞬间的并发请求可能少记一两次；对「每天几十次」的体验额度够用。
要更严，可以换成 Durable Objects，这一版没做。
