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

部署步骤（这一版还没有部署，下面是给你自己操作的）
--------------------------------------------------
1. 装好 Node.js，在这个 relay 文件夹里运行：
     npx wrangler login
2. 建一个 KV 存每日计数：
     npx wrangler kv namespace create QUOTA
   把它给出的 id 填进 wrangler.toml 里 REPLACE_WITH_KV_NAMESPACE_ID 的位置。
3. 设密钥（见上面）。
4. 按需要改 wrangler.toml 里的 [vars]：DAILY_LIMIT、GLOBAL_DAILY_LIMIT、MAX_BODY_BYTES 等。
5. 部署：
     npx wrangler deploy
   它会给你一个地址，比如 https://lingcun-relay.你的子域.workers.dev
6. 把这个地址填进网页源码 _build/p2.js 里的 RELAY_URL = "" 这一行，重新 build，再发布网页。
   RELAY_URL 为空时，网页会说「免费体验额度还没开通」，只能用自己的密钥。
7. 在 DeepSeek 后台给这个密钥设个余额提醒；想收紧就把 DAILY_LIMIT / GLOBAL_DAILY_LIMIT 调小再 deploy。

本机测试（不联网、不花钱）
--------------------------
- node v0.0.10/_test/relay_test.mjs
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
