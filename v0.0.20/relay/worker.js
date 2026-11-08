/* 另存人生 · 免费体验额度中转（Cloudflare Worker，v0.0.10，#24）
   作用：网页 → 这里 → DeepSeek。密钥只在 Cloudflare 的 secret 里（wrangler secret put DEEPSEEK_API_KEY），不写进任何文件。
   - 只转发 POST /v1/chat/completions；GET /health 用来看活着没有
   - 只允许 deepseek-flash，强制关掉思考（thinking: disabled），流式 SSE 原样透传
   - 每个访问者（IP 加盐哈希，不存原始 IP）每天限额，存在 KV；另有全站每日总上限
   - 只接受另存人生的 GitHub Pages 和本机（localhost / 127.0.0.1 / 本地打开文件的 null）来源
   - 不保存、不记录请求内容 */

const ALLOWED_MODELS = ["deepseek-flash"];
const ALLOWED_KEYS = ["model", "messages", "temperature", "top_p", "response_format", "stream", "max_tokens"];

function num(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; }
function conf(env) {
  return {
    upstream: (env.UPSTREAM_BASE || "https://api.deepseek.com").replace(/\/+$/, ""),
    daily: num(env.DAILY_LIMIT, 40),
    global: num(env.GLOBAL_DAILY_LIMIT, 3000),
    maxBody: num(env.MAX_BODY_BYTES, 262144),
    maxMsgs: num(env.MAX_MESSAGES, 8),
    maxTokens: num(env.MAX_TOKENS, 8192),
    origins: String(env.ALLOWED_ORIGINS || "https://huangchenyun25-web.github.io").split(",").map((s) => s.trim()).filter(Boolean),
    salt: env.IP_SALT || "lingcun"
  };
}

function originOk(origin, c) {
  if (!origin) return false;
  if (origin === "null") return true; /* 本地双击打开 index.html */
  if (c.origins.indexOf(origin) >= 0) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Lingcun-Client",
    "Access-Control-Expose-Headers": "X-Quota-Remaining, X-Quota-Limit",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(status, obj, h) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, h || {}) });
}
function err(status, code, message, h) { return json(status, { error: { code, message } }, h); }

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
function today() { return new Date().toISOString().slice(0, 10); }

/* KV 不是强一致的计数器：同一秒里的并发请求可能少记一两次，对「每天几十次」的体验额度够用 */
async function useQuota(env, ip, c) {
  if (!env.QUOTA) return { ok: true, left: null }; /* 没绑 KV（只在本机调试时）就不限 */
  const d = today(), h = await sha(c.salt + "|" + ip + "|" + d);
  const kUser = "q:" + d + ":" + h, kAll = "g:" + d;
  const [u, g] = await Promise.all([env.QUOTA.get(kUser), env.QUOTA.get(kAll)]);
  const used = num(u, 0), all = num(g, 0);
  if (all >= c.global) return { ok: false, code: "global_limit", left: 0 };
  if (used >= c.daily) return { ok: false, code: "daily_limit", left: 0 };
  const ttl = { expirationTtl: 60 * 60 * 36 };
  await Promise.all([env.QUOTA.put(kUser, String(used + 1), ttl), env.QUOTA.put(kAll, String(all + 1), ttl)]);
  return { ok: true, left: c.daily - used - 1 };
}

async function turnstileOk(env, req, ip) {
  if (!env.TURNSTILE_SECRET) return true; /* 可选：配置了才检查 */
  const t = req.headers.get("CF-Turnstile-Token") || "";
  if (!t) return false;
  const fd = new FormData(); fd.append("secret", env.TURNSTILE_SECRET); fd.append("response", t); if (ip) fd.append("remoteip", ip);
  try { const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd }); const j = await r.json(); return !!j.success; } catch (e) { return false; }
}

function clean(body, c) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { e: "请求格式不对" };
  if (ALLOWED_MODELS.indexOf(body.model) < 0) return { e: "只支持模型：" + ALLOWED_MODELS.join("、") };
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > c.maxMsgs) return { e: "messages 数量不对" };
  for (const m of body.messages) {
    if (!m || typeof m !== "object" || ["system", "user", "assistant"].indexOf(m.role) < 0 || typeof m.content !== "string") return { e: "messages 内容不对" };
  }
  const out = {};
  for (const k of ALLOWED_KEYS) if (body[k] !== undefined) out[k] = body[k];
  out.messages = body.messages.map((m) => ({ role: m.role, content: m.content }));
  out.stream = !!body.stream;
  if (out.stream) out.stream_options = { include_usage: false };
  out.thinking = { type: "disabled" }; /* 强制关思考，不管前端传什么 */
  out.max_tokens = Math.min(num(body.max_tokens, c.maxTokens), c.maxTokens);
  if (typeof out.temperature !== "number") delete out.temperature;
  if (typeof out.top_p !== "number") delete out.top_p;
  if (out.response_format && !(out.response_format.type === "json_object" || out.response_format.type === "text")) delete out.response_format;
  return { body: out };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), c = conf(env);
    const origin = req.headers.get("Origin") || "";
    if (url.pathname === "/health") return json(200, { ok: true, service: "lingcun-relay" });
    if (!originOk(origin, c)) return err(403, "origin", "这个中转只给另存人生的网页用");
    const H = cors(origin);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: H });
    if (url.pathname !== "/v1/chat/completions") return err(404, "not_found", "没有这个地址", H);
    if (req.method !== "POST") return err(405, "method", "只接受 POST", H);
    if (!env.DEEPSEEK_API_KEY) return err(503, "not_configured", "中转还没配好密钥", H);

    const len = num(req.headers.get("Content-Length"), 0);
    if (len > c.maxBody) return err(413, "too_large", "内容太长了", H);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > c.maxBody) return err(413, "too_large", "内容太长了", H);
    let body; try { body = JSON.parse(raw); } catch (e) { return err(400, "bad_json", "请求不是合法的 JSON", H); }
    const cl = clean(body, c);
    if (cl.e) return err(400, "bad_request", cl.e, H);

    const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "0.0.0.0";
    if (!(await turnstileOk(env, req, ip))) return err(403, "turnstile", "人机验证没通过", H);
    const q = await useQuota(env, ip, c);
    const QH = Object.assign({}, H, { "X-Quota-Limit": String(c.daily) });
    if (q.left !== null) QH["X-Quota-Remaining"] = String(q.left);
    if (!q.ok) return err(429, q.code, q.code === "global_limit" ? "今天大家的免费额度都用完了" : "你今天的免费额度用完了", QH);

    let up;
    try {
      up = await fetch(c.upstream + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.DEEPSEEK_API_KEY },
        body: JSON.stringify(cl.body)
      });
    } catch (e) { return err(502, "upstream_unreachable", "连不上 AI 服务", QH); }

    const outH = Object.assign({}, QH, { "Cache-Control": "no-store" });
    if (!up.ok) {
      /* 上游错误不原样转发（可能带账户信息），只给状态和一个简短说明 */
      const code = up.status === 429 ? "upstream_busy" : up.status === 402 ? "upstream_balance" : "upstream_error";
      return err(up.status === 429 ? 503 : 502, code, up.status === 429 ? "AI 服务这会儿太忙" : "AI 服务出错了（" + up.status + "）", outH);
    }
    outH["Content-Type"] = up.headers.get("Content-Type") || (cl.body.stream ? "text/event-stream" : "application/json");
    return new Response(up.body, { status: 200, headers: outH }); /* 流式时原样透传 SSE */
  }
};
