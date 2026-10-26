(function () {
  "use strict";
  var VERSION = "0.0.16";
  var LS_KEY = "lingcun_v010_state", OLD_LS_KEY = "lingcun_v009_state";
  var LS_AI = "lingcun_v010_ai", OLD_LS_AI = "lingcun_v009_ai";
  var LS_KEYKEY = "lingcun_v010_apikey", OLD_LS_KEYKEY = "lingcun_v009_apikey";
  var LS_FILES = "lingcun_v009_img_"; /* 照片按项目 id 存，沿用 v0.0.9 的前缀，老照片不丢 */
  var LS_METRICS = "lingcun_v010_metrics";
  var REPO_URL = "https://github.com/huangchenyun25-web/lingcun";
  /* #24：免费体验额度的中转服务（Cloudflare Worker，源码在 relay/，2026-10-24 部署）。留空 = 还没部署：页面会请用户先用自己的密钥。
     测试时可以在网址加 ?relay=http://127.0.0.1:端口（只认本机地址），或 ?relay=off 模拟「还没开通」。 */
  var RELAY_URL = "https://lingcun-relay.lingcun.workers.dev";
  (function () { var m = /[?&]relay=([^&#]+)/.exec(location.search); if (m) { var u = decodeURIComponent(m[1]); if (u === "off") RELAY_URL = ""; else if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(u)) RELAY_URL = u.replace(/\/+$/, ""); } })();
  var RELAY_MODEL = "deepseek-flash";
  /* 第 108 条④ + #24：联网说明分两件事说清 */
  var NET_NOTICE = "生成和修改时，你提供的相关内容会发送给 AI 服务处理：默认经过另存人生的中转服务转给 DeepSeek（中转不保存内容）；用自己的密钥时，直接从你的浏览器发给你选的那家。额外搜索网上资料，只在你主动选择并确认搜索内容后进行。";
  var WAIT_LIMIT = 10000, AGENT_LIMIT = 180000; /* v0.0.13（#39）：agent 模式也有超时（三分钟） */ /* 第 102 条 / #9：10 秒是等待体验的阈值，不是完成承诺 */
  var SKIP = "不确定，先跳过", OTHER = "其他，我自己写", PEND = "待补";

  /* 六个固定阶段（#12 定稿：只显示阶段名，不显示会变的 n/m） */
  /* v0.0.10（#19）：一局＝六关，以登月结束；阶段 id 不变，旧进度照样能读 */
  var STAGES = [
    { id: "pick", name: "选这一局", icon: "", todo: "选一个主题，看看这一局会带走什么" },
    { id: "material", name: "补齐材料", icon: "", todo: "补上还缺的几样材料" },
    { id: "draft", name: "做出第一版", icon: "", todo: "让 AI 按你的材料做出第一版" },
    { id: "check", name: "检查与修改", icon: "", todo: "看一看、改一改，记一下做成程度" },
    { id: "save", name: "确认登月", icon: "", todo: "确认这一版是你认可的，然后登月" },
    { id: "again", name: "之后", icon: "", todo: "接着完善这一件，或者做一件新的" }
  ];
  var RM = false; try { RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  function smooth() { return RM ? "auto" : "smooth"; }
  /* #21：本机小统计（只在这个浏览器里，不上传）。都是次数：star 入口的点击 ≠ GitHub 上真的多了 star */
  var METRIC_KEYS = ["started", "completed", "card_seen", "shared", "star_seen", "star_clicked"];
  var METRICS = (function () { var m = {}; try { m = JSON.parse(localStorage.getItem(LS_METRICS) || "{}") || {}; } catch (e) {} METRIC_KEYS.forEach(function (k) { if (typeof m[k] !== "number") m[k] = 0; }); return m; })();
  function bump(k) { METRICS[k] = (METRICS[k] || 0) + 1; try { localStorage.setItem(LS_METRICS, JSON.stringify(METRICS)); } catch (e) {} if (typeof renderMetrics === "function") renderMetrics(); }
  function stageIdx(id) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return i; return 0; }

  /* ========== 小工具 ========== */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400); }
  function short(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); s = s.split(/[。！？；;\n]/)[0]; return s.length > n ? s.slice(0, n) + "…" : s; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function parseJSONLoose(s) {
    s = String(s == null ? "" : s).trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    var a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a > 0 || (b >= 0 && b < s.length - 1)) { if (a >= 0 && b > a) s = s.slice(a, b + 1); }
    return JSON.parse(s);
  }
  /* 极简 JSON Schema 校验（沿用 v0.0.8） */
  function validate(v, sc, path) {
    path = path || "结果"; var e = [];
    if (!sc) return e;
    var t = sc.type, ok = true;
    if (t === "object") ok = v && typeof v === "object" && !Array.isArray(v);
    else if (t === "array") ok = Array.isArray(v);
    else if (t === "string") ok = typeof v === "string";
    else if (t === "integer") ok = typeof v === "number" && Math.floor(v) === v;
    else if (t === "number") ok = typeof v === "number" && isFinite(v);
    else if (t === "boolean") ok = typeof v === "boolean";
    if (!ok) { e.push(path + " 应该是 " + t); return e; }
    if (sc.enum && sc.enum.indexOf(v) < 0) e.push(path + " 只能是 " + sc.enum.join(" / "));
    if (t === "string") { if (sc.minLength && v.trim().length < sc.minLength) e.push(path + " 太短或是空的"); if (sc.maxLength && v.length > sc.maxLength) e.push(path + " 太长（最多 " + sc.maxLength + " 字）"); }
    if (t === "integer" || t === "number") { if (sc.minimum != null && v < sc.minimum) e.push(path + " 不能小于 " + sc.minimum); if (sc.maximum != null && v > sc.maximum) e.push(path + " 不能大于 " + sc.maximum); }
    if (t === "array") {
      if (sc.minItems != null && v.length < sc.minItems) e.push(path + " 至少要 " + sc.minItems + " 项");
      if (sc.maxItems != null && v.length > sc.maxItems) e.push(path + " 最多 " + sc.maxItems + " 项");
      if (sc.items) v.forEach(function (x, i) { e = e.concat(validate(x, sc.items, path + "[" + i + "]")); });
    }
    if (t === "object") {
      (sc.required || []).forEach(function (k) { if (v[k] === undefined || v[k] === null) e.push(path + "." + k + " 缺了"); });
      if (sc.properties) for (var k in sc.properties) if (v[k] !== undefined && v[k] !== null) e = e.concat(validate(v[k], sc.properties[k], path + "." + k));
    }
    return e;
  }
  var STR = function (max) { return { type: "string", minLength: 1, maxLength: max || 400 }; };
  var STRS = function (min, max, len) { return { type: "array", minItems: min, maxItems: max, items: STR(len || 200) }; };
  var STR0 = function (max) { return { type: "string", maxLength: max || 400 }; };

  /* ========== AI 入口层（沿用 v0.0.8 的统一任务入口 + 校验；v0.0.9 加：流式、关思考、10 秒等待、计时） ==========
     agent  —— 只在明确要求时开（?ai=agent 或 window.lingcunAI.enable()）；任务块只写进 DOM 给机器读
     direct —— 用户自己的 API 密钥，浏览器直接调 OpenAI 兼容的 /chat/completions，默认 stream:true，失败回退到一次性返回
     mock   —— 测试专用，网址加 ?ai=mock 才启用，界面上不出现
     模型名 2026-10-23 按官方文档核对：DeepSeek「deepseek-flash」（V4.1-Flash，默认开思考，用 thinking:{type:"disabled"} 关）；
     阿里云百炼「qwen-plus」（混合思考，默认不开，显式 enable_thinking:false）；OpenAI「gpt-6-luna」（支持 reasoning_effort:"none"）。 */
  var PRESETS = {
    deepseek: { name: "DeepSeek", base: "https://api.deepseek.com", model: "deepseek-flash", json: true, search: false, fast: { thinking: { type: "disabled" } },
      note: "2026-10-23 按 DeepSeek 官方文档核对：模型名 deepseek-flash（DeepSeek-V4.1-Flash），它默认开「深度思考」，这一页做常规生成时会关掉思考（thinking: disabled），出字更快。接口允许网页直接调用。不能联网搜索。" },
    qwen: { name: "通义千问（阿里云百炼 · OpenAI 兼容模式）", base: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", json: true, search: true, fast: { enable_thinking: false },
      note: "2026-10-23 按阿里云百炼官方文档核对：qwen-plus 是混合思考模型、默认不开思考，这一页也会显式关掉（enable_thinking: false）。新版控制台给的地址可能是「你的业务空间ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1」，以控制台为准。能联网搜索，但只在你点「查找这次活动的公开资料」并确认搜索内容后才会用。" },
    openai: { name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-6-luna", json: true, search: false, fast: { reasoning_effort: "none" },
      note: "2026-10-23 按 OpenAI 官方文档核对：gpt-6-luna 是面向高频任务的省时模型，支持关掉推理（reasoning_effort: none）。国内网络一般直接连不上；密钥错误时页面读不到原因，只会提示「连不上」。这里不开联网搜索。" },
    custom: { name: "其他（OpenAI 兼容格式）", base: "", model: "", json: false, search: false, fast: null,
      note: "填服务商给的 OpenAI 兼容地址（一般到 /v1 为止）和模型名。能不能从网页直接调用，要看服务商允不允许跨域，页面没测过；连不上时会提示你。如果它有「深度思考」，建议换成不带思考的模型，等待会短很多。" }
  };
  var AI = (function () {
    var cfg = { mode: "", preset: "deepseek", base: "", model: "" }, key = "", quotaLeft = null;
    var tasks = {}, seq = 0, listeners = [], sess = "";
    var m = /[?&]ai=(mock|agent)\b/.exec(location.search); var forced = m ? m[1] : "";
    var mockDelay = 120; var md = /[?&]mockdelay=(\d+)/.exec(location.search); if (md && forced === "mock") mockDelay = +md[1];
    var timings = [];
    try { var c = JSON.parse(localStorage.getItem(LS_AI) || localStorage.getItem(OLD_LS_AI) || "null"); if (c) for (var k in c) cfg[k] = c[k]; } catch (e) {}
    /* v0.0.13（#39）：AI 设置按版本记。换了新版本第一次打开，回到免费体验额度；密钥还留在这个浏览器里，想用再点一下就回来。同一版本里自己选的「用自己的密钥」照旧 */
    if (cfg.v !== VERSION) { if (cfg.mode === "direct") cfg.mode = ""; cfg.v = VERSION; try { localStorage.setItem(LS_AI, JSON.stringify(cfg)); } catch (e) {} }
    try { key = localStorage.getItem(LS_KEYKEY) || localStorage.getItem(OLD_LS_KEYKEY) || ""; if (key && !localStorage.getItem(LS_KEYKEY)) { localStorage.setItem(LS_KEYKEY, key); localStorage.removeItem(OLD_LS_KEYKEY); } } catch (e) {}
    function saveCfg() { cfg.v = VERSION; try { localStorage.setItem(LS_AI, JSON.stringify(cfg)); } catch (e) {} }
    function P() { return PRESETS[cfg.preset] || PRESETS.custom; }
    function base() { return (cfg.base || P().base || "").replace(/\/+$/, ""); }
    function model() { return cfg.model || P().model; }
    /* #24：默认用免费体验额度（中转）；用户存了自己的密钥才走直连 */
    function relayOn() { return !!RELAY_URL; }
    function mode() { if (sess) return sess; if (forced) return forced; if (cfg.mode === "direct") return "direct"; return relayOn() ? "relay" : ""; }
    function label(mo) { mo = mo || mode(); return { agent: "agent 在帮你", direct: key ? (P().name || "API") + "（你的密钥）" : "还没填密钥", relay: "免费体验额度" + (quotaLeft !== null ? "（今天还剩 " + quotaLeft + " 次）" : ""), mock: "测试用模拟", "": "还没选" }[mo]; }
    function emit() { listeners.forEach(function (f) { f(); }); }
    function retryAll() { Object.keys(tasks).forEach(function (id) { if (!tasks[id].cancelled) attempt(tasks[id]); }); }
    function setMode(mo) { if (mo === "agent" || forced) sess = mo; else { sess = ""; cfg.mode = mo === "relay" ? "relay" : mo; saveCfg(); } emit(); retryAll(); }
    function endAgent() { if (forced === "agent") forced = ""; if (sess === "agent") sess = ""; emit(); retryAll(); }
    function setDirect(o) { if (o.preset) cfg.preset = o.preset; if (o.base !== undefined) cfg.base = o.base; if (o.model !== undefined) cfg.model = o.model; if (o.key !== undefined) { key = o.key; try { if (key) localStorage.setItem(LS_KEYKEY, key); else localStorage.removeItem(LS_KEYKEY); } catch (e) {} } saveCfg(); emit(); }
    function forget() { key = ""; try { localStorage.removeItem(LS_KEYKEY); } catch (e) {} emit(); }

    function sysPrompt(t) {
      return ["你是「另存人生」网页里的 AI，角色：" + t.role + "。", "任务类型：" + t.type + (t.category ? "（类目：" + t.category + "）" : ""), "要做的事：",
        t.instructions.map(function (x, i) { return (i + 1) + ". " + x; }).join("\n"),
        "通用规则：中文，大白话，短句；不写价格；不承诺求职结果。",
        "这一类的事实规则：" + (t.factRule || "只依据 inputs 里的内容。"),
        "只输出一个 JSON 对象，不要任何别的文字，不要代码块。必须符合这个 output_schema（JSON Schema）：", JSON.stringify(t.schema)].join("\n");
    }
    function doc(rec) {
      var t = rec.task;
      return { lingcun_task: "v1", id: rec.id, type: t.type, category: t.category || "", role: t.role, instructions: t.instructions, fact_rule: t.factRule || "", inputs: t.inputs, output_schema: t.schema,
        how_to_submit: "把符合 output_schema 的 JSON 填进 #ai-result-" + rec.id + " 再点 #ai-submit-" + rec.id + "；或在页面里调用 window.lingcunAI.submit(\"" + rec.id + "\", 结果对象)。事实按 fact_rule 处理。" };
    }
    function run(task, slot) {
      return new Promise(function (resolve) {
        if (task.key) Object.keys(tasks).forEach(function (id) { if (tasks[id].task.key === task.key) { stopTimers(tasks[id]); delete tasks[id]; } });
        var rec = { id: task.type + "-" + (++seq), task: task, slot: slot, resolve: resolve };
        tasks[rec.id] = rec; attempt(rec);
      });
    }
    function head(rec, how) { var mo = how || mode(); return '<div class="who">' + (mo ? esc(label(mo)) + " · " : "") + esc(rec.task.title || rec.task.type) + "</div>"; }
    /* 计时（#9 验收：首字、完整、解析、重试） */
    function newTiming(rec, mo) {
      var tm = { id: rec.id, type: rec.task.type, category: rec.task.category || "", mode: mo, model: mo === "direct" ? model() : mo === "relay" ? RELAY_MODEL : mo, stream: false, stream_fallback: false,
        started_at: new Date().toISOString(), first_token_ms: null, full_ms: null, parse_ms: null, retries: 0, ok: null, error: "" };
      tm._t0 = now(); timings.push(tm); rec.tm = tm; return tm;
    }
    function endTiming(tm, ok, err) {
      if (!tm || tm.ok !== null) return;
      tm.ok = !!ok; tm.error = err || ""; if (tm.full_ms === null) tm.full_ms = Math.round(now() - tm._t0);
      try { console.info("[lingcun timing] " + JSON.stringify(publicTm(tm))); } catch (e) {}
    }
    function publicTm(tm) { var o = {}; for (var k in tm) if (k.charAt(0) !== "_") o[k] = tm[k]; return o; }
    function stopTimers(rec) { if (rec.at) clearTimeout(rec.at); rec.at = 0; if (rec.iv) clearInterval(rec.iv); rec.iv = 0; if (rec.mt) clearTimeout(rec.mt); rec.mt = 0; if (rec.ms) clearInterval(rec.ms); rec.ms = 0; }
    /* 第 102 条 / #9：请求一开始就显示状态；超过 10 秒给「继续等 / 取消」 */
    function waitUi(rec) {
      stopTimers(rec);
      rec.t0 = now(); rec.keepWaiting = false;
      var el = rec.slot.querySelector("[data-elapsed]"), wc = rec.slot.querySelector("[data-waitchoice]");
      rec.iv = setInterval(function () {
        if (!tasks[rec.id]) return stopTimers(rec);
        var s = Math.floor((now() - rec.t0) / 1000);
        if (el) el.textContent = "已等 " + s + " 秒";
        if (wc && !rec.keepWaiting && now() - rec.t0 >= WAIT_LIMIT && wc.classList.contains("hidden")) wc.classList.remove("hidden");
      }, 250);
      if (wc) {
        wc.querySelector("[data-wait]").onclick = function () { rec.keepWaiting = true; wc.innerHTML = '<span class="hint" style="display:inline">好，接着等。想停随时点 </span><button class="ghost small" data-cancel2="1">取消</button>'; wc.querySelector("[data-cancel2]").onclick = function () { cancel(rec); }; };
        wc.querySelector("[data-cancel]").onclick = function () { cancel(rec); };
      }
    }
    function waitBox() {
      return '<span class="elapsed" data-elapsed>已等 0 秒</span><div class="snip" data-snip><span class="snip-n" data-snip-n></span><div class="stream" data-stream aria-live="off"></div></div>' +
        '<div class="waitchoice hidden" data-waitchoice><div class="warnbox" style="margin:4px 0">已经等了 10 秒多。AI 还在写，你可以继续等，也可以先取消。</div><div class="row"><button class="small" data-wait="1">继续等</button><button class="sec2 small" data-cancel="1">取消</button></div></div>';
    }
    /* 打磨轮（第 136 条）：等 AI 时飞船穿过星云，写出来的字一段一段流进来 */
    function nebula() { return '<div class="nebula" aria-hidden="true"><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i><i class="streaks"></i><span class="nship"><span class="nflame"></span></span></div>'; }
    /* v0.0.13（#39）：等待时不显眼地标出现在用的是哪一种 */
    function modeTag(mo) { var t = { relay: "免费额度", direct: "自己的密钥", mock: "模拟", agent: "agent" }[mo || mode()] || ""; return t ? '<span class="modetag" data-modetag="' + esc(mo || mode()) + '">' + esc(t) + "</span>" : ""; }
    function busy(rec, txt) {
      rec.slot.innerHTML = '<div class="aibox" data-busy>' + head(rec) + nebula() + '<div class="busyt"><span class="dotpulse" aria-hidden="true"></span>' + esc(txt || "正在想…") + "</div>" + modeTag(rec.mode) + waitBox() + "</div>";
      waitUi(rec);
    }
    function cancel(rec) {
      rec.cancelled = true; stopTimers(rec);
      if (rec.ctl) { try { rec.ctl.abort(); } catch (e) {} }
      endTiming(rec.tm, false, "用户取消");
      rec.slot.innerHTML = '<div class="aibox" data-cancelled>' + head(rec) + '<div class="note">已取消这一步，你填的东西都还在。</div><div class="next"><b>下一步：</b>可以再试一次；嫌慢的话，把材料或篇幅改小一点再做。</div>' +
        '<div class="row"><button class="small" data-retry="1">再试一次</button>' + (rec.task.onSmaller ? '<button class="ghost small" data-smaller="1">换一个更小的做法</button>' : "") + "</div></div>";
      rec.slot.querySelector("[data-retry]").onclick = function () { rec.cancelled = false; tasks[rec.id] = rec; attempt(rec); };
      var sm = rec.slot.querySelector("[data-smaller]"); if (sm) sm.onclick = function () { delete tasks[rec.id]; rec.task.onSmaller(); };
    }
    function attempt(rec) {
      if (!tasks[rec.id] || rec.cancelled) return;
      var mo = mode(); rec.mode = mo; stopTimers(rec);
      if (!mo) return keyHelp(rec, "");
      if (mo === "agent") { newTiming(rec, "agent"); return agentBox(rec); }
      if (mo === "mock") {
        newTiming(rec, "mock"); busy(rec, "测试用模拟 AI…");
        /* 模拟也「边写边流」：把模拟结果按时间一段段喂给同一个流式显示 */
        var mout = MOCK[rec.task.type] ? MOCK[rec.task.type](rec.task.inputs, rec.task) : null, mraw = mout ? JSON.stringify(mout) : "", mt0 = now(), msn = rec.slot.querySelector("[data-snip]");
        if (mraw && mockDelay >= 600) rec.ms = setInterval(function () { if (!tasks[rec.id] || rec.cancelled) { clearInterval(rec.ms); return; } var k = Math.min(1, (now() - mt0) / (mockDelay * 0.9)); feedSnip(msn, mraw.slice(0, Math.floor(mraw.length * k))); if (k >= 1) clearInterval(rec.ms); }, 140);
        rec.mt = setTimeout(function () {
          if (rec.ms) clearInterval(rec.ms);
          if (!tasks[rec.id] || rec.cancelled) return;
          var out = mout; var er = check(rec, out);
          if (er.length) { endTiming(rec.tm, false, er.join("；")); fail(rec, "模拟结果不合格式：" + er.join("；")); } else { endTiming(rec.tm, true); finish(rec, out, "mock"); }
        }, mockDelay);
        return;
      }
      if (mo === "relay") {
        if (rec.task.search) return needAI(rec, "免费体验额度不能上网查。可以自己贴一个链接或报道标题；或者在右上角「AI」里用自己的通义千问密钥。");
        newTiming(rec, "relay"); busy(rec, "AI 正在做这一步…");
        callDirect(rec, target("relay")).then(function (out) { if (tasks[rec.id] && !rec.cancelled) { endTiming(rec.tm, true); finish(rec, out, "relay"); } },
          function (e) { if (tasks[rec.id] && !rec.cancelled) { endTiming(rec.tm, false, e.message); if (e.quota) quotaUi(rec, e.quota); else fail(rec, e.message, e.cut); } });
        return;
      }
      if (mo === "direct") {
        if (!key || !base() || !model()) return keyHelp(rec, key ? "接口地址或模型名还没填好。" : "");
        if (rec.task.search && !P().search) return needAI(rec, "你现在用的「" + P().name + "」在这一页里不能上网查。可以在右上角换成通义千问，或者自己贴一个链接。");
        newTiming(rec, "direct"); busy(rec, "正在请「" + P().name + "」做这一步…");
        callDirect(rec, target("direct")).then(function (out) { if (tasks[rec.id] && !rec.cancelled) { endTiming(rec.tm, true); finish(rec, out, "direct"); } },
          function (e) { if (tasks[rec.id] && !rec.cancelled) { endTiming(rec.tm, false, e.message); fail(rec, e.message, e.cut); } });
      }
    }
    function check(rec, out) { var er = validate(out, rec.task.schema); if (!er.length && rec.task.check) er = er.concat(rec.task.check(out) || []); return er; }
    function finish(rec, out, how) {
      stopTimers(rec); delete tasks[rec.id];
      var tm = rec.tm, sec = tm && tm.full_ms != null ? "（用了 " + (Math.round(tm.full_ms / 100) / 10) + " 秒）" : "";
      rec.slot.innerHTML = '<div class="aibox" data-done>' + head(rec, how) + "完成了" + sec + "。</div>";
      rec.resolve(out);
    }
    function modeButtons() {
      return '<div class="row">' + (mode() !== "direct" ? '<button class="sec2 small" data-m="direct">' + (mode() === "agent" ? "改用我的 API 密钥" : "用自己的密钥") + "</button>" : '<button class="sec2 small" data-m="cfg">去填密钥 / 换一家</button>') +
        (mode() === "direct" && relayOn() ? '<button class="ghost small" data-m="relay">改回免费体验额度</button>' : "") + "</div>";
    }
    function bindModes(rec) {
      rec.slot.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () { var v = b.getAttribute("data-m"); if (v === "relay") { setMode("relay"); return; } if (v === "direct" && key) { setMode("direct"); return; } openCfg(true); }; });
    }
    /* #24：今天的免费额度用完了 → 明天再来，或者填自己的密钥（进度都在） */
    function quotaUi(rec, code) {
      stopTimers(rec);
      if (rec.task.onFail) { var of = rec.task.onFail; rec.task.onFail = null; delete tasks[rec.id]; of("quota"); return; }
      var why = code === "global_limit" ? "今天大家一起用的免费额度用完了。" : "你今天的免费体验额度用完了。";
      rec.slot.innerHTML = '<div class="aibox" data-quota>' + head(rec) + '<div class="warnbox"><b>' + esc(why) + "</b>明天再来就能接着做，你填的东西、做到哪一步都留在这个浏览器里。</div>" +
        '<div class="next"><b>想现在就继续：</b>填你自己的 API 密钥，直接用你自己的额度，不占免费体验额度。</div>' +
        '<div class="row"><button class="small" data-m="direct">用自己的密钥继续</button><button class="sec2 small" data-tomorrow="1">好，明天再来</button></div><div data-later-out></div></div>';
      bindModes(rec);
      rec.slot.querySelector("[data-tomorrow]").onclick = function () { saveForLater(); rec.slot.querySelector("[data-later-out]").innerHTML = '<div class="okbox" style="margin-top:8px">进度留好了。明天用这台设备的这个浏览器打开这一页，会看到「上次做到这里」，点「继续」就回到这一步。</div>'; toast("进度已留好"); };
    }
    var KEY_LINKS = [
      { name: "DeepSeek 开放平台 · API Keys 页面", url: "https://platform.deepseek.com/api_keys" },
      { name: "阿里云百炼（通义千问）· API Key 页面", url: "https://bailian.console.aliyun.com/cn-beijing/model/settings/api-key" },
      { name: "阿里云百炼官方说明：获取与配置 API Key", url: "https://help.aliyun.com/zh/model-studio/get-api-key" }
    ];
    function extraButtons(rec) {
      return (rec.task.onSkip ? '<div class="row"><button class="ghost small" data-skip="1">' + esc(rec.task.skipText || "这一步先跳过") + "</button></div>" : "") +
        (rec.task.onSmaller && !rec.task.onSkip ? '<div class="row"><button class="ghost small" data-smaller="1">换一个更小的做法</button></div>' : "");
    }
    function bindExtra(rec) {
      var s = rec.slot.querySelector("[data-skip]"); if (s) s.onclick = function () { delete tasks[rec.id]; rec.task.onSkip(); };
      var sm = rec.slot.querySelector("[data-smaller]"); if (sm) sm.onclick = function () { delete tasks[rec.id]; rec.task.onSmaller(); };
    }
    function keyHelp(rec, why) {
      if (rec.task.onFail) { var of = rec.task.onFail; rec.task.onFail = null; delete tasks[rec.id]; of("nokey"); return; }
      rec.slot.innerHTML = '<div class="aibox keyhelp">' + head(rec) + '<div><b>这一步要请 AI 帮忙</b></div>' +
        (why ? '<div class="warnbox">' + esc(why) + "</div>" : "") +
        (relayOn() ? "" : '<p class="hint" style="margin:6px 0">免费体验额度还没开通（中转服务还没部署）。现在可以先用你自己的 API 密钥：密钥只存在这个浏览器里，不会发给另存人生。</p>') +
        '<div class="row"><button class="small" data-m="cfg">填 API 密钥</button><button class="sec2 small" data-later="1">先留着进度，拿到密钥再回来</button>' + (relayOn() ? '<button class="ghost small" data-m="relay">改回免费体验额度</button>' : "") + "</div>" +
        '<details class="keyhow" style="margin-top:8px"><summary>还没有密钥？怎么拿一个</summary><ol style="margin:6px 0;padding-left:1.3em">' +
        "<li>选一家：DeepSeek，或者阿里云百炼（通义千问）。两家都能用，挑你顺手的。</li>" +
        "<li>打开下面那家的官方页面，注册、登录（可能要手机号或实名认证），找到「创建 API Key」，创建好后复制下来。</li>" +
        "<li>回到这一页，点「填 API 密钥」，选同一家，把密钥贴进去，点「保存」。这一步就会接着往下走。</li></ol>" +
        '<ul style="margin:4px 0;padding-left:1.3em">' + KEY_LINKS.map(function (l) { return '<li><a href="' + l.url + '" target="_blank" rel="noopener noreferrer">' + esc(l.name) + "</a></li>"; }).join("") + "</ul>" +
        '<p class="hint" style="margin:4px 0">调用是按用量计费的，扣的是你自己账户里的额度，以服务商页面为准。密钥像密码一样，别发给别人，也别贴到聊天里。</p></details>' +
        '<div data-later-out></div>' + extraButtons(rec) + "</div>";
      bindModes(rec); bindExtra(rec);
      rec.slot.querySelector("[data-later]").onclick = function () {
        saveForLater();
        rec.slot.querySelector("[data-later-out]").innerHTML = '<div class="next" style="margin-top:8px"><b>进度留好了。</b>拿到密钥后，用这台设备的这个浏览器再打开这一页，会看到「上次做到这里」，点「继续」就回到这一步。要换电脑，先在页面最下面「换设备带走进度」里下载进度文件。</div>';
        toast("进度已留好");
      };
    }
    function needAI(rec, why) {
      rec.slot.innerHTML = '<div class="aibox">' + head(rec) + '<div class="warnbox">' + esc(why) + "</div><div>可以换一家：</div>" + modeButtons() + extraButtons(rec) + "</div>";
      bindModes(rec); bindExtra(rec);
    }
    function fail(rec, msg, cut) {
      stopTimers(rec);
      if (rec.task.onFail) { var of = rec.task.onFail; rec.task.onFail = null; delete tasks[rec.id]; of(msg); return; } /* v0.0.14：后台润色失败就立刻用库，不出「再试一次」 */
      rec.slot.innerHTML = '<div class="aibox"' + (cut ? " data-cut" : "") + ">" + head(rec) + '<div class="warnbox">这一步没成：' + esc(msg) + "</div>" + (cut ? "" : '<div class="next"><b>下一步：</b>先点「再试一次」。连着两次不行，就检查一下密钥、换一家，或者把材料、篇幅改小一点。</div>') +
        '<div class="row"><button class="small" data-retry="1">再试一次</button></div>' + modeButtons() + (rec.task.onSmaller ? '<div class="row"><button class="ghost small" data-smaller="1">换一个更小的做法</button></div>' : "") + "</div>";
      bindModes(rec);
      rec.slot.querySelector("[data-retry]").onclick = function () { tasks[rec.id] = rec; rec.cancelled = false; attempt(rec); };
      var s = rec.slot.querySelector("[data-smaller]"); if (s) s.onclick = function () { delete tasks[rec.id]; rec.task.onSmaller(); };
    }
    /* 第 86 条：任务块只给机器读，人看不到 */
    function agentBox(rec) {
      var json = JSON.stringify(doc(rec)).replace(/</g, "\\u003c");
      rec.slot.innerHTML = '<div class="aibox" data-busy data-ai-task-id="' + rec.id + '"><span class="spin"></span>AI 正在帮你想…' + waitBox() +
        '<script type="application/json" id="ai-task-' + rec.id + '" data-ai-task="' + rec.id + '">' + json + "<\/script>" +
        '<form hidden aria-hidden="true" data-ai-form="' + rec.id + '" onsubmit="return false"><textarea id="ai-result-' + rec.id + '" data-ai-result-for="' + rec.id + '"></textarea>' +
        '<button type="button" id="ai-submit-' + rec.id + '" data-ai-submit="' + rec.id + '">submit</button><output id="ai-err-' + rec.id + '" data-ai-error-for="' + rec.id + '"></output></form>' +
        '<details class="hint" style="margin-top:8px"><summary>等太久了？换一种方式</summary><div>可以改用你自己的 API 密钥，在这一页里直接跑。</div>' + modeButtons() + "</details></div>";
      bindModes(rec); waitUi(rec);
      rec.at = setTimeout(function () { if (tasks[rec.id] && !rec.cancelled && rec.mode === "agent") { endTiming(rec.tm, false, "agent 超时"); fail(rec, "等了三分钟还没有结果"); } }, AGENT_LIMIT);
      rec.slot.querySelector("[data-ai-submit]").onclick = function () { submit(rec.id, rec.slot.querySelector("textarea[data-ai-result-for]").value); };
    }
    function submit(id, val) {
      var rec = tasks[id];
      if (!rec || rec.mode !== "agent") return { ok: false, errors: ["没有这个待办任务（可能已经完成、取消，或被新的任务替换了）"] };
      var obj = val, t1 = now();
      if (typeof val === "string") { try { obj = parseJSONLoose(val); } catch (e) { return bad(rec, ["不是合法的 JSON：" + e.message]); } }
      var er = check(rec, obj);
      if (rec.tm) rec.tm.parse_ms = Math.round(now() - t1);
      if (er.length) { if (rec.tm) rec.tm.retries++; return bad(rec, er); }
      endTiming(rec.tm, true); finish(rec, obj, "agent"); return { ok: true };
    }
    function bad(rec, er) { var el = rec.slot.querySelector("[data-ai-error-for]"); if (el) el.textContent = "格式不对：" + er.join("；"); return { ok: false, errors: er }; }

    /* ---------- 直连：流式（SSE）优先，失败回退 ---------- */
    function httpErr(r, txt, tg) {
      var j = null; try { j = JSON.parse(txt); } catch (e) {}
      var code = j && j.error && j.error.code;
      if (tg && tg.relay) {
        if (r.status === 429 && (code === "daily_limit" || code === "global_limit")) { var q = new Error("今天的免费体验额度用完了"); q.http = 429; q.quota = code; return q; }
        var rm = r.status === 429 ? "免费体验额度这会儿太忙了（429），等一会儿再试" : r.status === 413 ? "这次要发的内容太长了，把材料改短一点再试" : r.status === 403 ? "中转服务拒绝了这次请求（403）" : "中转服务返回了错误（" + r.status + "）";
        var e1 = new Error(rm + (j && j.error && j.error.message ? "：" + String(j.error.message).slice(0, 120) : "")); e1.http = r.status; return e1;
      }
      var msg = r.status === 401 || r.status === 403 ? "密钥不对、过期了，或者没有这个模型的权限（" + r.status + "）" : r.status === 404 ? "接口地址或模型名不对（404）" : r.status === 429 ? "请求太频繁，或者账户额度用完了（429）" : "服务返回了错误（" + r.status + "）";
      if (j && j.error && j.error.message) msg += "：" + String(j.error.message).slice(0, 160);
      var er = new Error(msg); er.http = r.status; return er;
    }
    /* 两条路共用同一套流式读取：relay（免费体验额度，不带密钥）/ direct（用户自己的密钥） */
    function target(kind) {
      if (kind === "relay") return { relay: true, url: RELAY_URL + "/v1/chat/completions", headers: { "Content-Type": "application/json", "X-Lingcun-Client": VERSION }, model: RELAY_MODEL, json: true, fast: { thinking: { type: "disabled" } }, search: false };
      return { relay: false, url: base() + "/chat/completions", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key }, model: model(), json: P().json, fast: P().fast, search: P().search };
    }
    function netErr(e, tg) { var er = new Error(e && e.name === "AbortError" ? "已停止：等了太久（两分钟）或者你点了取消" : tg && tg.relay ? "连不上免费体验额度的中转服务。可能是网络问题，等一会儿再试；也可以用自己的密钥" : "连不上。可能是网络问题、接口地址填错，或者这家服务不允许网页直接调用（跨域）"); er.abort = e && e.name === "AbortError"; return er; }
    /* v0.0.13（#39）：写到上限被截断（finish_reason = length）就直说，不再默默重试 */
    function cutErr() { var e = new Error("要写的内容太长，写到一半被截断了"); e.cut = true; return e; }
    function contentOf(data) { var ch = data && data.choices && data.choices[0]; if (ch && ch.finish_reason === "length") throw cutErr(); var c = ch && ch.message && ch.message.content; if (typeof c !== "string" || !c) throw new Error("服务没有返回内容"); return c; }
    function fetchWith(rec, body, tg) {
      var ctl = window.AbortController ? new AbortController() : null; rec.ctl = ctl;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 120000) : 0;
      return fetch(tg.url, { method: "POST", headers: tg.headers, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { r._timer = timer; if (tg.relay) { var ql = r.headers.get("x-quota-remaining"); if (ql !== null && ql !== "" && !isNaN(+ql)) { quotaLeft = +ql; emit(); } } return r; }, function (e) { clearTimeout(timer); throw netErr(e, tg); });
    }
    function postPlain(rec, body, tg) {
      var tm = rec.tm;
      return fetchWith(rec, body, tg).then(function (r) {
        return r.text().then(function (txt) {
          clearTimeout(r._timer);
          if (!r.ok) throw httpErr(r, txt, tg);
          if (tm.first_token_ms === null) tm.first_token_ms = Math.round(now() - tm._t0);
          var data; try { data = JSON.parse(txt); } catch (e) { throw new Error("服务返回的不是 JSON"); }
          return contentOf(data);
        }, function (e) { clearTimeout(r._timer); throw netErr(e, tg); });
      });
    }
    /* 只取 JSON 里「值」的文字（不显示字段名），边写边流出来 */
    function valuesText(raw) {
      raw = String(raw); var out = "", st = [], inStr = false, isKey = false, esc2 = false, expectKey = false, i, ch;
      for (i = 0; i < raw.length; i++) {
        ch = raw.charAt(i);
        if (inStr) {
          if (esc2) { esc2 = false; if (!isKey) out += ch === "n" || ch === "t" ? " " : ch === "u" ? "" : ch; continue; }
          if (ch === "\\") { esc2 = true; continue; }
          if (ch === '"') { inStr = false; if (!isKey) out += " "; continue; }
          if (!isKey) out += ch; continue;
        }
        if (ch === '"') { inStr = true; isKey = st[st.length - 1] === "{" && expectKey; continue; }
        if (ch === "{" || ch === "[") { st.push(ch); expectKey = ch === "{"; continue; }
        if (ch === "}" || ch === "]") { st.pop(); expectKey = false; continue; }
        if (ch === ",") { expectKey = st[st.length - 1] === "{"; continue; }
        if (ch === ":") { expectKey = false; continue; }
      }
      if (!/[\s\S]/.test(out) && raw && raw.charAt(0) !== "{" && raw.charAt(0) !== "[") out = raw;
      return out.replace(/\s+/g, " ");
    }
    function feedSnip(snip, acc) {
      if (!snip) return;
      var body = snip.querySelector("[data-stream]"), n = snip.querySelector("[data-snip-n]");
      if (!body) { snip.textContent = "已经写了 " + acc.length + " 字：…" + readable(acc); return; }
      var t = valuesText(acc), shown = snip._shown || 0;
      if (n) n.textContent = "已经写了 " + acc.length + " 字";
      if (t.length <= shown) return;
      var piece = document.createElement("span"); piece.className = "piece"; piece.textContent = t.slice(shown); snip._shown = t.length;
      body.appendChild(piece);
      var len = 0; for (var k = body.childNodes.length - 1; k >= 0; k--) { len += body.childNodes[k].textContent.length; if (len > 84 && k > 0) { while (k-- > 0) body.removeChild(body.firstChild); break; } }
    }
    function readable(raw) { return String(raw).replace(/"[A-Za-z_]+"\s*:/g, " ").replace(/\\n/g, " ").replace(/[{}\[\]"\\]/g, " ").replace(/\s+/g, " ").trim().slice(-90); }
    function postStream(rec, body, tg) {
      var tm = rec.tm, snip = rec.slot.querySelector("[data-snip]");
      return fetchWith(rec, body, tg).then(function (r) {
        if (!r.ok) return r.text().then(function (txt) { clearTimeout(r._timer); throw httpErr(r, txt, tg); });
        var ct = (r.headers.get("content-type") || "").toLowerCase();
        if (ct.indexOf("text/event-stream") < 0 || !r.body || !r.body.getReader) {
          return r.text().then(function (txt) { clearTimeout(r._timer); if (tm.first_token_ms === null) tm.first_token_ms = Math.round(now() - tm._t0); var d; try { d = JSON.parse(txt); } catch (e) { var er = new Error("流式返回读不出来"); er.streamBroken = true; throw er; } return contentOf(d); });
        }
        var reader = r.body.getReader(), dec = new TextDecoder("utf-8"), buf = "", acc = "", done = false, cut = false;
        function pump() {
          return reader.read().then(function (x) {
            if (x.done) done = true; else buf += dec.decode(x.value, { stream: true });
            var lines = buf.split(/\r?\n/); buf = done ? "" : lines.pop();
            lines.forEach(function (ln) {
              ln = ln.trim(); if (ln.indexOf("data:") !== 0) return;
              var pl = ln.slice(5).trim(); if (!pl || pl === "[DONE]") { if (pl === "[DONE]") done = true; return; }
              var j; try { j = JSON.parse(pl); } catch (e) { return; }
              var d = j && j.choices && j.choices[0] && j.choices[0].delta;
              if (j && j.choices && j.choices[0] && j.choices[0].finish_reason === "length") cut = true;
              if (d && d.reasoning_content && tm.first_reasoning_ms == null) tm.first_reasoning_ms = Math.round(now() - tm._t0);
              if (d && typeof d.content === "string" && d.content) {
                if (tm.first_token_ms === null) tm.first_token_ms = Math.round(now() - tm._t0);
                acc += d.content;
                feedSnip(snip, acc);
              }
            });
            if (done) { clearTimeout(r._timer); if (cut) throw cutErr(); if (!acc) { var er = new Error("流式返回是空的"); er.streamBroken = true; throw er; } return acc; }
            return pump();
          }, function (e) { clearTimeout(r._timer); if (e && e.cut) throw e; if (e && e.name === "AbortError") throw netErr(e, tg); var er = new Error("流式连接中途断了"); er.streamBroken = true; throw er; });
        }
        return pump();
      });
    }
    function callDirect(rec, tg) {
      var t = rec.task, tm = rec.tm; tg = tg || target("direct");
      var msgs = [{ role: "system", content: sysPrompt(t) }, { role: "user", content: JSON.stringify({ inputs: t.inputs }) }];
      function body(ms, stream) {
        var b = { model: tg.model, messages: ms, temperature: 0.4 };
        if (tg.json) b.response_format = { type: "json_object" };
        var f = tg.fast; if (f) for (var k in f) b[k] = f[k];
        if (t.search && tg.search) b.enable_search = true;
        if (stream) b.stream = true;
        return b;
      }
      function once(ms) {
        if (rec.noStream || t.plain) return postPlain(rec, body(ms, false), tg); /* v0.0.14：库打底的润色任务一次请求就够，不走流式回退 */
        tm.stream = true;
        return postStream(rec, body(ms, true), tg).catch(function (e) {
          if (e && (e.http || e.abort || e.cut)) throw e;
          tm.stream_fallback = true; rec.noStream = true; /* 第 #9 条：流式失败就回退到一次性返回 */
          return postPlain(rec, body(ms, false), tg);
        });
      }
      function parse(c) {
        var t1 = now(), o, er;
        try { o = parseJSONLoose(c); er = validate(o, t.schema).concat(t.check ? (t.check(o) || []) : []); } catch (e) { er = ["不是合法的 JSON"]; }
        tm.parse_ms = (tm.parse_ms || 0) + Math.round(now() - t1);
        return { o: o, er: er };
      }
      return once(msgs).then(function (c) {
        if (tm.full_ms === null) tm.full_ms = Math.round(now() - tm._t0);
        var r1 = parse(c); if (!r1.er.length) return r1.o;
        if (t.noRepair) throw new Error("格式不对（润色任务不重试，直接用库里的原版）");
        tm.retries++; tm.full_ms = null;
        var ms2 = msgs.concat([{ role: "assistant", content: c.slice(0, 6000) }, { role: "user", content: "上一次的输出没满足要求：" + r1.er.slice(0, 6).join("；") + "。请重新只输出一个符合 output_schema 的 JSON 对象。" }]);
        return once(ms2).then(function (c2) {
          tm.full_ms = Math.round(now() - tm._t0);
          var r2 = parse(c2);
          if (r2.er.length) throw new Error("AI 两次都没按格式回答（" + r2.er.slice(0, 3).join("；") + "）");
          return r2.o;
        });
      });
    }
    function ping() {
      var rec = { id: "ping", task: { type: "ping", role: "连通测试", instructions: ["只输出 {\"ok\": true}"], inputs: {}, factRule: "无", schema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } } }, slot: document.createElement("div") };
      newTiming(rec, "direct");
      return callDirect(rec, target("direct")).then(function (o) { endTiming(rec.tm, true); return o; }, function (e) { endTiming(rec.tm, false, e.message); throw e; });
    }
    function pending() { return Object.keys(tasks).filter(function (id) { return tasks[id].mode === "agent" && !tasks[id].cancelled; }).map(function (id) { return doc(tasks[id]); }); }
    /* v0.0.14：后台润色等不到就丢掉，之后换模式也不会再发 */
    function drop(key) { Object.keys(tasks).forEach(function (id) { if (tasks[id].task.key === key) { stopTimers(tasks[id]); tasks[id].cancelled = true; delete tasks[id]; } }); }
    return { run: run, drop: drop, endAgent: endAgent, mode: mode, label: label, relayOn: relayOn, quotaLeft: function () { return quotaLeft; }, setMode: setMode, setDirect: setDirect, forget: forget, ping: ping, pending: pending, submit: submit, sysPrompt: sysPrompt,
      timings: timings, publicTm: publicTm, setMockDelay: function (ms) { mockDelay = ms; },
      cfg: function () { return { mode: cfg.mode, preset: cfg.preset, base: base(), model: model(), hasKey: !!key, search: !!P().search, relay: RELAY_URL }; },
      onChange: function (f) { listeners.push(f); }, P: P };
  })();
  var openCfg = function () {};
  var renderMetrics = null;
  var saveForLater = function () {};
