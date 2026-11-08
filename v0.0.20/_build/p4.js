
  /* ========== 状态：只存在本浏览器的 localStorage（#10、第 96 条③：不再写进网址） ========== */
  function blank() {
    return { v: VERSION, t: 0, stage: "pick", entry: { mode: "", act: "", idea: "", bg: { weekly: "", keep: "", avoid: "" }, situation: "", goal: "", small: false },
      cur: -1, projects: [], ask: { q: "", stage: "", resolved: true, a: null }, match: { dir: null, desc: "", items: {}, open: "" }, nextGoal: "", gh: {} };
  }
  var S = blank();
  function newProject(cat, idea) {
    var t0 = Date.now();
    return { id: t0 + Math.floor(Math.random() * 1000), cat: cat, idea: idea || "", title: "", a: {}, photos: [], out: null, warn: [], pub: null, cands: null, candNote: "", query: "",
      degree: null, sat: null, selfOk: [], fix: null, fixPart: -1, revs: 0, saved: false, savedAt: 0, runs: 1, stage: "material", small: !!S.entry.small, paused: false, createdAt: t0, updatedAt: t0,
      theme: "", landed: false, landedAt: 0, planet: -1, change: "", confirm: {}, tried: false };
  }
  function merge(o) {
    var b = blank(), k, j;
    for (k in o) b[k] = o[k];
    ["entry", "ask", "match"].forEach(function (k2) { var d = blank()[k2]; if (!b[k2] || typeof b[k2] !== "object") b[k2] = d; for (j in d) if (b[k2][j] === undefined) b[k2][j] = d[j]; });
    if (!Array.isArray(b.projects)) b.projects = [];
    b.projects.forEach(function (p) { var had = p.updatedAt, hadLanded = p.landed !== undefined, d = newProject(p.cat || "generic"); for (var k3 in d) if (p[k3] === undefined) p[k3] = d[k3]; if (!CATS[p.cat]) p.cat = "generic"; if (!had) { p.updatedAt = p.savedAt || o.t || 0; p.createdAt = p.createdAt === d.createdAt ? p.updatedAt : p.createdAt; } if (!p.title) p.title = titleFromInput(p);
      if (!hadLanded && p.saved) { p.landed = true; p.landedAt = p.savedAt || p.updatedAt || 0; p.planet = -1; } });
    /* #22：v0.0.9 存过的作品算「登陆过」，按保存先后排星球（第一件是月球） */
    var nxt = 0; b.projects.forEach(function (p) { if (p.landed && p.planet >= nxt) nxt = p.planet + 1; });
    b.projects.filter(function (p) { return p.landed && p.planet < 0; }).sort(function (x, y) { return (x.landedAt || 0) - (y.landedAt || 0); }).forEach(function (p) { p.planet = nxt++; });
    if (b.cur >= b.projects.length) b.cur = b.projects.length - 1;
    if (stageIdx(b.stage) < 0) b.stage = "pick";
    return b;
  }
  /* #17：updatedAt 只在这件东西的内容真的变了时才更新（打开、看一眼不算） */
  var sigs = {};
  function sigOf(p) { return JSON.stringify([p.a, p.out, p.photos, p.saved, p.degree, p.revs, p.title, p.pub, p.sat, p.selfOk]); }
  function touch() { var p = curP(); if (!p) return; var g = sigOf(p); if (sigs[p.id] !== undefined && sigs[p.id] !== g) p.updatedAt = Date.now(); sigs[p.id] = g; }
  function resetSigs() { sigs = {}; S.projects.forEach(function (p) { sigs[p.id] = sigOf(p); }); }
  function save() { touch(); if (typeof renderBagBtn === "function") renderBagBtn(); S.t = Date.now(); try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast("这个浏览器的存储满了，记得点「下载」把文件存好"); } }
  function load() {
    if (/state=/.test(location.hash)) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} } /* v0.0.8 的旧存档链接：不再读网址里的进度 */
    try { var raw = localStorage.getItem(LS_KEY) || localStorage.getItem(OLD_LS_KEY); if (raw) { S = merge(JSON.parse(raw)); resetSigs(); return true; } } catch (e) {}
    return false;
  }
  function download(name, text, type) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: (type || "text/html") + ";charset=utf-8" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast("已下载：" + name);
  }
  function curP() { return S.cur >= 0 && S.cur < S.projects.length ? S.projects[S.cur] : null; }
  var ui = { frozen: {}, running: {} };
  function go(stage, noScroll) {
    var p = curP(); S.stage = stage; if (p) { p.stage = stage; p.paused = false; }
    if (stage === "material" && p) delete ui.frozen[p.id];
    save(); render();
    /* v0.0.12：一次只显示一屏，换屏就回到顶部 */
    if (!noScroll) setTimeout(function () { try { window.scrollTo(0, 0); } catch (e) {} }, 0);
  }
  function smaller(p) {
    if (p.cat === "novel") { p.a.n_len = { i: 0 }; toast("换成微小说（500 字左右），直接出正文"); }
    else toast("把材料改少一点，再做一次");
    p.out = null; go("material");
  }

  /* ---------- 通用选择题（每道都有「不确定，先跳过」和「其他，我自己写」） ---------- */
  function qHtml(key, title, opts, a, multi, num) {
    a = a || {}; var typ = multi ? "checkbox" : "radio", nm = "q_" + key;
    var sel = function (i) { return multi ? (a.is || []).indexOf(i) >= 0 : a.i === i && !a.skip && !a.other; };
    var h = '<div class="q" data-q="' + key + '"><div class="qt">' + (num ? '<span class="n">' + num + "</span>" : "") + esc(title) + "</div><div class=\"choices" + (opts.length > 4 ? " two" : "") + '">' +
      opts.map(function (o, i) { return '<label class="choice"><input type="' + typ + '" name="' + nm + '" value="' + i + '"' + (sel(i) ? " checked" : "") + " /><span>" + esc(o) + "</span></label>"; }).join("") +
      '<label class="choice skip"><input type="' + typ + '" name="' + nm + '" value="skip"' + (a.skip ? " checked" : "") + " /><span>" + SKIP + "</span></label>" +
      '<label class="choice"><input type="' + typ + '" name="' + nm + '" value="other"' + ((a.other !== undefined && a.other !== null && a.otherOn) ? " checked" : "") + " /><span>" + OTHER + "</span></label></div>" +
      '<input type="text" id="o_' + key + '" class="' + (a.otherOn ? "" : "hidden") + '" placeholder="写一句就好" value="' + esc(a.other || "") + '" /></div>';
    return h;
  }
  function readQ(root, key, multi) {
    var ins = [].slice.call(root.querySelectorAll('input[name="q_' + key + '"]:checked')), oi = $("o_" + key), other = oi ? oi.value.trim() : "";
    var vals = ins.map(function (x) { return x.value; });
    if (multi) {
      if (vals.indexOf("skip") >= 0) return { skip: true, is: [] };
      var r = { is: vals.filter(function (v) { return /^\d+$/.test(v); }).map(Number) };
      if (vals.indexOf("other") >= 0) { r.otherOn = true; r.other = other; }
      return (r.is.length || r.otherOn) ? r : null;
    }
    var v = vals[0]; if (v === undefined) return null;
    if (v === "skip") return { skip: true };
    if (v === "other") return { otherOn: true, other: other };
    return { i: +v };
  }
  function bindQ(root, key, multi, onv) {
    root.querySelectorAll('input[name="q_' + key + '"]').forEach(function (x) {
      x.onchange = function () {
        if (multi && x.checked && x.value === "skip") root.querySelectorAll('input[name="q_' + key + '"]').forEach(function (y) { if (y !== x) y.checked = false; });
        if (multi && x.checked && x.value !== "skip") { var sk = root.querySelector('input[name="q_' + key + '"][value="skip"]'); if (sk) sk.checked = false; }
        var v = readQ(root, key, multi); var oi = $("o_" + key); if (oi) oi.classList.toggle("hidden", !(v && v.otherOn)); onv(v);
      };
    });
    var oi = $("o_" + key); if (oi) oi.oninput = function () { onv(readQ(root, key, multi)); };
  }
  function qAnswered(a) { return !!(a && (a.skip || typeof a.i === "number" || (a.is && a.is.length) || (a.otherOn && a.other))); }
  function qText(opts, a) { if (!a) return ""; if (a.skip) return PEND; if (a.otherOn && a.other) return a.other; if (typeof a.i === "number") return opts[a.i]; return ""; }

  /* ========== 渲染 ========== */
  function render() {
    var p = curP(); if (!p && S.stage !== "pick") S.stage = "pick";
    var si = stageIdx(S.stage);
    STAGES.forEach(function (st, i) {
      var el = $("s-" + st.id); el.classList.remove("show", "collapsed");
      $("h-" + st.id).innerHTML = '<span class="lv">' + st.icon + "</span>" + esc(st.name);
      if (!p) { if (st.id === "pick") el.classList.add("show"); return; }
      if (i < si) el.classList.add("show", "collapsed"); else if (i === si) el.classList.add("show");
    });
    $("stages").innerHTML = STAGES.map(function (st, i) { return '<span class="' + (i < si && p ? "done" : i === si ? "now" : "") + '" data-st="' + st.id + '" title="' + esc(st.name) + '"><span aria-hidden="true">' + st.icon + "</span> " + esc(st.name) + "</span>"; }).join("");
    $("todo").textContent = "现在要做：" + STAGES[si].todo + (p ? " · " + CATS[p.cat].name + (p.title ? "「" + p.title + "」" : "") : "");
    renderSummaries();
    ({ pick: renderPick, material: renderMaterial, draft: renderDraft, check: renderCheck, save: renderSave, again: renderAgain })[S.stage]();
    appendAsk(S.stage);
  }
  function renderSummaries() {
    var p = curP();
    $("sum-pick").textContent = p ? "要做：" + CATS[p.cat].name + (p.title ? "「" + p.title + "」" : "") : "";
    if (!p) return;
    var fs = fieldsOf(p), known = fs.filter(function (f) { return answered(p, f) && !isSkipped(p, f); }).length, pend = fs.length - known;
    $("sum-material").textContent = "已经给了 " + known + " 项" + (pend ? "，待补 " + pend + " 项（AI 不会替你编成事实）" : "");
    $("sum-draft").textContent = p.out ? "第一版：" + (p.out.title || p.out.headline || p.out.summary || "已做出") : "";
    $("sum-check").textContent = p.degree ? "做成程度：" + qText(DEGREE, p.degree) + (p.revs ? " · 改过 " + p.revs + " 次" : "") : "";
    $("sum-save").textContent = p.landed ? "已登陆：" + planetOf(p.planet).n + (p.saved ? "" : " · 改过之后还没再确认") : "还没登月";
    $("sum-again").textContent = "";
  }

  /* ---------- ① 选这一局（#20：【记录】【改写】【创造】三个主题；#19：开局说清这一局会带走什么；#25：分流不越过事实边界、原话不丢） ---------- */
  /* 例子同时带「主题」和「形态」；点了直接预填。pre 里数字 = 选项序号，字符串 = 文字题的值 */
  var EXAMPLES = [
    { cat: "photo", t: "把旅行照片做成一页纪念册", idea: "把旅行照片做成一页纪念册，发给一起去的朋友", small: true, pre: { ph_theme: "一次旅行", ph_use: 0, ph_order: 0 } },
    { cat: "novel", t: "写一篇五百字的雨夜小故事", idea: "写一篇五百字左右的微小说，雨夜，温暖一点", small: true, pre: { n_len: 0, n_style: 0 } },
    { cat: "tool", t: "做一个「本周行动清单」小网页", idea: "把这周想做的几件事写下来、勾掉，关掉再打开还在", small: true, pre: { t_input: 2, t_action: 0 } },
    { cat: "create", t: "想一个小游戏的第一步", idea: "我想做一个游戏", small: true },
    { cat: "essay", t: "写写妈妈做的一道菜（真实的记录）", idea: "写写妈妈做的番茄炒蛋，和我第一次学做它的那天", pre: { e_len: 0, e_style: 1 } },
    { cat: "resume", t: "把品牌活动经历改写成投内容运营的简历", idea: "把做品牌活动的经历，改写成投内容运营的一页简历", pre: { r_len: 0, r_target: "内容运营" } },
    { cat: "exp", t: "把办过的一场活动写成一页复盘", idea: "把办过的一场活动写成一页复盘", pre: { x_type: 0 } },
    { cat: "generic", t: "给家里的猫做一页成长手账", idea: "给家里的猫做一页成长手账", pre: { g_form: 0, g_for: 1, g_kind: 0 } },
    { cat: "tool", t: "做一个习惯打卡小网页", idea: "每天给一两个习惯打卡，看连续了几天", pre: { t_input: 2, t_action: 1 } },
    { cat: "novel", t: "写一个三千字左右的校园短篇", idea: "写一个三千字左右的校园短篇小说", pre: { n_len: 1, n_type: 4 } }
  ];
  /* 三个主题 → 具体做法（每个做法对应一份现有配置）。入口是主题，不是严格分类；事实规则仍按内容走 */
  var THEMES = {
    record: { name: "记录", icon: "", desc: "把经历、感受或脑海里的故事，写成一件属于你的作品。", old: "原来的「写点东西」：散文、随笔，或一直想写的故事", take: "一篇你读过、愿意留下的文字作品", ways: [
      { t: "写一篇真实的记录", s: "散文、随笔：一个人、一件事、一段感受。写真的，不虚构", cat: "essay" },
      { t: "写一个故事（小说）", s: "可以虚构；跳过的设定由 AI 来创作", cat: "novel" },
      { t: "写一页短文、清单或计划", s: "真实的事还是设想，你来选", cat: "generic", pre: { g_form: 0 } }] },
    rewrite: { name: "改写", icon: "", desc: "从过去做过的事里，找到与下一段方向有关的经验，把它讲清楚。", old: "原来的「整理已有材料」：简历、经历复盘为主，照片其次", take: "一页你核对过事实、朝想去的方向讲清楚的经历材料", ways: [
      { t: "把经历改写成简历", s: "朝你想去的方向重新组织；只写真做过的事", cat: "resume" },
      { t: "把一段经历写成复盘", s: "背景、我做了什么、结果；可以讲给新方向听", cat: "exp" },
      { t: "介绍一件做过的作品", s: "是什么、怎么做的；只写真实的事", cat: "generic", pre: { g_form: 0, g_kind: 0 }, idea: "介绍我做过的一件作品" },
      { t: "整理照片（其次）", s: "排成一页纪念册或展示页；照片不发给 AI", cat: "photo" }],
      note: "改写只用你在这一页里写下的内容，不会去读你电脑里的表格、聊天记录或别的应用。过去的职责和成果保持原样，不会因为换了说法就变成做过新领域的工作。" },
    create: { name: "创造", icon: "", desc: "一个游戏、一场活动，或一件作品。", old: "原来的「做个小工具」", take: "", ways: [{ t: "一个游戏或作品", cat: "create" }] },
    /* v0.0.14（#42）：首页三个大类 = 第一步库的三大类 */
    learn: { name: "学习", icon: "", desc: "一门语言、一项技能，或一场考试。", take: "", ways: [{ t: "学一样东西", cat: "create" }] },
    career: { name: "转行", icon: "", desc: "换一个岗位、行业或方向。", take: "", ways: [{ t: "换一个方向", cat: "create" }] }
  };
  var HOME_ACTS = ["create", "learn", "career"];
  function libAct(k) { return HOME_ACTS.indexOf(k) >= 0; }
  var THEME_OF = { novel: "record", essay: "record", generic: "record", resume: "rewrite", exp: "rewrite", photo: "rewrite", tool: "create", create: "create" };
  function themeOf(p) { return p.theme && THEMES[p.theme] ? p.theme : THEME_OF[p.cat] || "record"; }
  var CLAR_LABEL = { novel: "写一个故事（小说，可以虚构）", essay: "写一篇真实的记录（散文、随笔）", photo: "整理照片", tool: "做个小工具（能点能记的小网页）", create: "一个游戏或作品（概念和第一步）", resume: "简历", exp: "经历复盘（过去做过的事）", generic: "都不像：按通用方式做" };
  var CLAR_ALL = ["essay", "novel", "photo", "create", "tool", "resume", "exp", "generic"];
  var ANX = /焦虑|慌|迷茫|崩溃|压力|好累|撑不住|难受|失眠|没意义|浑浑噩噩|很烦|烦躁|害怕|不安/;
  function anxious() { var e = S.entry; return ANX.test([e.situation, e.bg.weekly, e.bg.keep, e.bg.avoid, e.idea].join(" ")); }
  function lastOpen() { var best = -1, t = -1; S.projects.forEach(function (p, i) { if (!p.saved && (p.updatedAt || 0) > t) { t = p.updatedAt || 0; best = i; } }); return best; }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function ideaHint(idea) {
    var r = routeIdea(idea);
    if (!idea.trim()) return { r: r, text: "", clar: false, opts: [], go: "" };
    /* v0.0.14（#41）：创造 / 学习 / 转行（或没选大类）都走第一步库，在类内按原话匹配，不再猜别的做法 */
    if (libAct(S.entry.act) || !S.entry.act) return { r: r, text: "", clar: false, opts: [], go: "开始" };
    /* v0.0.13（#37）：选了【创造】就直接走创造（原话明说小工具 / 小网页的除外），不再猜别的做法 */
    if (S.entry.act === "create" && !(r.cat === "tool" && STRONG.tool.test(idea))) return { r: r, text: "", clar: false, opts: [], go: "按「创造」开始" };
    if (r.cat && r.strong) return { r: r, text: "看起来是「" + CATS[r.cat].name + "」。点下面就按这个做法开始；不是的话，在下面换一个。", clar: false, opts: [], go: "按「" + CATS[r.cat].name + "」开始" };
    if (r.cat) return { r: r, text: "我猜是「" + CATS[r.cat].name + "」：" + r.why + "。对吗？不对就在下面换一个。", clar: true, opts: uniq([r.cat].concat(r.alts || [], ["generic"])), go: "对，按「" + CATS[r.cat].name + "」开始" };
    if (r.hits.length > 1) return { r: r, text: "这句话同时像好几种做法（" + r.hits.map(function (k) { return CATS[k].name; }).join("、") + "）。你想要的更接近哪一种？", clar: true, opts: uniq(r.hits.concat(["generic"])), go: "按通用方式开始" };
    return { r: r, text: "没对上现成的做法。更接近下面哪一种？都不像就按通用方式做，不硬套。", clar: true, opts: CLAR_ALL.slice(), go: "按通用方式开始" };
  }
  function clarHtml(hh) { return hh.opts.map(function (c) { return '<button class="sec2 small" data-clar="' + c + '">' + esc(CLAR_LABEL[c]) + "</button>"; }).join(""); }
  function takeHtml() {
    return '<div class="hint" id="pk-take"><b>这一局会带走什么</b><br>' + Object.keys(THEMES).filter(function (k) { return THEMES[k].take; }).map(function (k) { var T0 = THEMES[k]; return "【" + esc(T0.name) + "】" + esc(T0.take); }).join("<br>") +
      "<br>登月前你会再确认一次，不确认就不登月。第一局大约 20 分钟到 1 小时。</div>";
  }
  /* v0.0.12（#34 #35）：入口分两屏。第 1 屏「今天，做成一件小事」：三个胶囊 + 出发；第 2 屏「想做什么？」：一句话 + 发送。其余都收进「更多」 */
  ui.pickStep = "home";
  var ARROW = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  function bk() { return '<span class="bk tl"></span><span class="bk tr"></span><span class="bk bl"></span><span class="bk br"></span>'; }
  function renderPick() {
    var e = S.entry, B = $("b-pick"), anx = anxious(), hint = ideaHint(e.idea), lo = lastOpen(), h = "";
    var home = ui.pickStep !== "idea";
    $("s-pick").classList.toggle("idea", !home);
    if (home) {
      h += '<div class="homefig" aria-hidden="true">' + MASCOT.stand + "</div>";
      h += '<div class="brk" id="pk-caps">' + bk() + '<div class="caps" role="group" aria-label="这一局想做哪一种">' + HOME_ACTS.map(function (k) { var a = THEMES[k]; return '<button class="cap gl act' + (e.act === k ? " on" : "") + '" data-act="' + k + '" aria-pressed="' + (e.act === k) + '" title="' + esc(a.desc) + '">' + esc(a.name) + '<span class="notch"></span><span class="tick"></span></button>'; }).join("") + "</div></div>";
      h += '<div class="pk-hint' + (THEMES[e.act] ? "" : " hidden") + '" id="pk-desc">' + (THEMES[e.act] ? esc(THEMES[e.act].desc) : "") + "</div>";
      h += '<div class="homelinks">' + (lo >= 0 ? '<button id="pk-last">继续上次「' + esc(S.projects[lo].title || CATS[S.projects[lo].cat].name) + "」</button>" : "") + '<button id="pk-ex">看看例子</button>' + (S.projects.length ? '<button id="pk-map">星图</button>' : "") + "</div>";
      h += '<div class="dock"><button class="main" id="pk-start">出发</button></div>';
      B.innerHTML = h;
      B.querySelectorAll("[data-act]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-act"); e.act = e.act === k ? "" : k; save(); renderPick(); appendAsk("pick"); }; });
      $("pk-start").onclick = function () { ui.pickStep = "idea"; render(); try { $("pk-idea").focus({ preventScroll: true }); } catch (er) {} };
      $("pk-ex").onclick = function () { e.mode = "none"; save(); ui.pickStep = "idea"; render(); var m = $("pk-more"); if (m) m.open = true; };
      if ($("pk-last")) $("pk-last").onclick = function () { S.cur = lo; go(S.projects[lo].stage || "material"); };
      if ($("pk-map")) $("pk-map").onclick = function () { openBag(); };
      return;
    }
    var A = e.act && THEMES[e.act] ? THEMES[e.act] : null;
    var vo = voiceOn();
    if (A) h += '<div class="pk-cap" id="pk-cap">' + esc(A.name) + "</div>";
    h += '<div class="brk' + (vo ? " hidden" : "") + '" id="pk-typebox">' + bk() + '<div class="gl ideabox"><input type="text" id="pk-idea" placeholder="一句就够" aria-label="想做什么？一句就够" autocomplete="off" value="' + esc(e.idea) + '" /><button class="send" id="pk-go">' + ARROW + '<span class="sr" id="pk-go-t">' + esc(hint.go || "按通用方式开始") + '</span></button>' + (vo || !voiceCan() ? "" : '<button class="vz-back" id="pk-tovoice">说话</button>') + "</div></div>" + (ui.vnote ? '<div class="pk-hint" id="vz-note">' + esc(ui.vnote) + "</div>" : "");
    if (vo) h += voiceHtml();
    h += '<div class="pk-hint' + (hint.text ? "" : " hidden") + '" id="pk-sug">' + esc(hint.text) + "</div>" +
      '<div class="clar' + (hint.clar ? "" : " hidden") + '" id="pk-clar">' + clarHtml(hint) + "</div>";
    if (A && A.ways.length > 1) h += '<div class="ways" id="act-sub"><span class="wl">或者直接选一种</span>' + A.ways.map(function (w, i) { return '<button data-way="' + i + '" title="' + esc(w.s || "") + '">' + esc(w.t) + "</button>"; }).join("") + (A.note ? '<details class="wnote"><summary>只用你写下的内容</summary><p class="hint" style="display:block">' + esc(A.note) + "</p></details>" : "") + "</div>";
    h += '<p class="netline">' + (voiceCan() ? "说的话由浏览器自带的语音识别转成文字（可能经过浏览器厂商的服务）。" : "") + "写下的内容会发给 AI 润色（默认经过另存人生的中转，中转不保存）；连不上也能走完。</p>";
    h += '<details class="more" id="pk-more"' + (e.mode === "none" || e.goal ? " open" : "") + "><summary>更多</summary>";
    h += '<div class="big" style="margin-top:12px"><button class="bigbtn' + (e.mode === "none" ? " on" : "") + '" id="pk-none"><strong>还没想好，看看例子</strong><small>点一下就预填好，之后都能改。</small></button></div>';
    if (e.mode === "none") {
      var ex = EXAMPLES.filter(function (x) { return !anx || x.small; });
      h += '<details id="pk-bg" style="margin-top:12px"' + (e.situation || e.bg.weekly || e.bg.keep || e.bg.avoid ? " open" : "") + '><summary>说一点背景（可选）</summary>' +
        '<label class="field"><span class="h">每周重复在做的事</span><input type="text" id="bg-weekly" placeholder="例：整理照片、给朋友回消息" value="' + esc(e.bg.weekly) + '" /></label>' +
        '<label class="field"><span class="h">想继续做、想多做一点的</span><input type="text" id="bg-keep" placeholder="例：写点东西、拍照" value="' + esc(e.bg.keep) + '" /></label>' +
        '<label class="field"><span class="h">不想再做的麻烦事</span><input type="text" id="bg-avoid" placeholder="例：每周手抄投递记录表" value="' + esc(e.bg.avoid) + '" /></label>' +
        '<label class="field"><span class="h">现在的处境（可选，想说再说）</span><input type="text" id="bg-sit" placeholder="例：刚离开一份工作，在缓一缓" value="' + esc(e.situation) + '" /></label></details>';
      if (anx) h += '<div class="note" id="anx-reply">听起来最近不太轻松。先不用想清楚以后，把今天的事缩小一点：下面只留几个最小的例子。</div>';
      var bgs = [];
      if (e.bg.avoid) bgs.push({ cat: "tool", t: "根据你写的：让「" + short(e.bg.avoid, 16) + "」少做一步的小工具", idea: e.bg.avoid });
      if (e.bg.keep) { var rk = routeIdea(e.bg.keep); bgs.push({ cat: rk.cat || "generic", t: "根据你写的：从「" + short(e.bg.keep, 16) + "」做出一件小东西", idea: e.bg.keep, pre: rk.pre }); }
      h += '<div class="qt">' + (anx ? "今天可以先试的一小步" : "挑一个例子") + '</div><div class="big">' + bgs.concat(ex).map(function (x, i) {
        return '<button class="bigbtn" data-ex="' + i + '"><strong>' + esc(x.t) + "</strong><small>【" + esc(THEMES[THEME_OF[x.cat]].name) + "】" + esc(CATS[x.cat].name) + " · " + esc(anx ? CATS[x.cat].firstStep : CATS[x.cat].deliverable) + "</small></button>";
      }).join("") + "</div>";
      ui.ex = bgs.concat(ex);
    }
    h += '<details style="margin-top:12px" id="pk-all"><summary>直接选具体做法（全部）</summary><div class="grid2">' + CAT_ORDER.concat(["generic"]).map(function (k) { var c = CATS[k]; return '<button class="bigbtn" data-cat="' + k + '"><strong>' + esc(c.name) + "</strong><small>" + esc(c.one) + "</small></button>"; }).join("") + "</div></details>";
    h += '<details style="margin-top:12px"' + (e.goal ? " open" : "") + '><summary>你想往哪去？（可选）</summary><input type="text" id="pk-goal" placeholder="例：GEO 方向的内容运营与产品增长" value="' + esc(e.goal) + '" /><p class="hint">写了的话，【改写】会围绕这个方向整理你的经历。不写也完全可以。</p></details>';
    h += takeHtml() + (A && A.note ? '<p class="hint">' + esc(A.note) + "</p>" : "") + "</details>";
    h += '<button class="ghost small back" id="pk-back">换一个主题</button>';
    B.innerHTML = h;
    var rer = function () { save(); renderPick(); appendAsk("pick"); };
    B.querySelectorAll("[data-way]").forEach(function (b) { b.onclick = function () { var w = THEMES[e.act].ways[+b.getAttribute("data-way")]; startProject(w.cat, e.idea.trim() ? e.idea : (w.idea || ""), w.pre, e.act); }; });
    var idea = $("pk-idea");
    idea.oninput = function () {
      e.idea = idea.value; save(); var hh = ideaHint(e.idea), sg = $("pk-sug"), cl = $("pk-clar");
      sg.textContent = hh.text; sg.classList.toggle("hidden", !hh.text); $("pk-go-t").textContent = hh.go || "按通用方式开始";
      cl.innerHTML = clarHtml(hh); cl.classList.toggle("hidden", !hh.clar); bindClar();
    };
    idea.onkeydown = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); $("pk-go").click(); } };
    function bindClar() { B.querySelectorAll("[data-clar]").forEach(function (b) { b.onclick = function () { var c = b.getAttribute("data-clar"), r = routeIdea(e.idea); startProject(c, e.idea, c === r.cat ? r.pre : null); }; }); }
    bindClar();
    voiceBind();
    $("pk-go").onclick = function () {
      /* v0.0.14（#41）：创造 / 学习 / 转行 → 第一步库；【创造】里原话明说小工具 / 小网页的，照旧走小工具 */
      if (libAct(e.act) || !e.act) { var rt0 = routeIdea(e.idea), tl0 = e.act !== "learn" && e.act !== "career" && rt0.cat === "tool" && STRONG.tool.test(e.idea) && !CAREER_RE.test(e.idea); startProject(tl0 ? "tool" : "create", e.idea, tl0 ? rt0.pre : null, tl0 ? "create" : (e.act || "")); return; }
      /* v0.0.13（#37）：【创造】默认走「创造」；只有原话明说了小工具 / 小网页，才走小工具 */
      if (e.act === "create") { var rt = routeIdea(e.idea), tl = rt.cat === "tool" && STRONG.tool.test(e.idea); startProject(tl ? "tool" : "create", e.idea, tl ? rt.pre : null, "create"); return; }
      if (!e.idea.trim()) { toast(A && A.ways.length > 1 ? "写一句想法，或者在下面直接选一种" : "写一句想法就好"); try { idea.focus(); } catch (er) {} return; }
      var r = routeIdea(e.idea); startProject(r.cat || "generic", e.idea, r.pre);
    };
    $("pk-back").onclick = function () { ui.pickStep = "home"; render(); };
    $("pk-none").onclick = function () { e.mode = "none"; rer(); var m = $("pk-more"); if (m) m.open = true; };
    B.querySelectorAll("[data-cat]").forEach(function (b) { b.onclick = function () { startProject(b.getAttribute("data-cat"), e.idea); }; });
    B.querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { var x = ui.ex[+b.getAttribute("data-ex")]; S.entry.small = anxious() || !!x.small; startProject(x.cat, x.idea, x.pre); }; });
    [["bg-weekly", "weekly"], ["bg-keep", "keep"], ["bg-avoid", "avoid"]].forEach(function (x) { var el = $(x[0]); if (el) { el.oninput = function () { e.bg[x[1]] = el.value.trim(); save(); }; el.onchange = function () { renderPick(); appendAsk("pick"); }; } });
    var sit = $("bg-sit"); if (sit) { sit.oninput = function () { e.situation = sit.value.trim(); save(); }; sit.onchange = function () { renderPick(); appendAsk("pick"); }; }
    $("pk-goal").oninput = function () { e.goal = this.value.trim(); save(); };
  }
  function startProject(cat, idea, pre, theme) {
    var p = newProject(cat, idea); p.small = !!S.entry.small || anxious(); p.theme = theme && THEMES[theme] ? theme : THEME_OF[cat];
    if (cat === "create" && !libAct(p.theme)) p.theme = "create";
    if (idea) guessFrom(p, idea);
    if (idea && cat === "generic") p.a.g_what = { v: idea };
    if (idea && cat === "tool") p.a.t_scene = { v: idea };
    if (idea && cat === "essay") p.a.e_about = { v: idea };
    if (idea && cat === "create") p.a.c_idea = { v: idea };
    if (cat === "create") libAssign(p, idea, theme);
    if (pre) for (var k in pre) p.a[k] = typeof pre[k] === "number" ? { i: pre[k] } : { v: String(pre[k]) };
    if (S.entry.goal && cat === "resume" && !p.a.r_target) p.a.r_target = { v: S.entry.goal };
    if (S.entry.goal && cat === "exp" && !p.a.x_dir) p.a.x_dir = { v: S.entry.goal };
    if (p.small) { if (cat === "novel" && !p.a.n_len) p.a.n_len = { i: 0 }; if (cat === "resume" && !p.a.r_len) p.a.r_len = { i: 0 }; if (cat === "essay" && !p.a.e_len) p.a.e_len = { i: 0 }; }
    p.title = idea ? short(idea, 18) : "";
    S.projects.push(p); S.cur = S.projects.length - 1; bump("started"); if (cat === "create") createConcepts(p); go("material");
  }
  function takeOf(p) {
    var c = CATS[p.cat];
    if (p.cat === "novel") return novelMode(p) === "outline" ? "完整的故事结构＋写好的第一段（大项目这一局只带走这一小块，说好就不缩水；后面几段之后接着展开）" : "一篇写完的" + (idx(p, "n_len") === 1 ? "短篇" : "微小说") + "（你定设定，AI 帮你写）";
    if (p.cat === "generic" && idx(p, "g_form") === 3) return CATS.tool.take;
    return c.take || c.deliverable;
  }

  /* ---------- ② 补齐材料：预置问题，只显示还缺的（#9 ①） ---------- */
  function fieldHtml(p, f, n) {
    var a = p.a[f.id] || {};
    if (f.type === "one" || f.type === "many") return qHtml(f.id, f.t, f.o, a, f.type === "many", n);
    if (f.type === "text") return '<div class="q" data-q="' + f.id + '"><div class="qt"><span class="n">' + n + "</span>" + esc(f.t) + (f.must ? "" : ' <span class="hint" style="display:inline">（可跳过）</span>') + '</div><textarea id="t_' + f.id + '" rows="2" placeholder="' + esc(f.ph || "") + '"' + (a.skip ? " disabled" : "") + ">" + esc(a.v || "") + "</textarea>" +
      (f.must ? "" : '<label class="choice skip" style="margin-top:4px"><input type="checkbox" id="k_' + f.id + '"' + (a.skip ? " checked" : "") + " /><span>" + SKIP + "（标成「待补」）</span></label>") + "</div>";
    if (f.type === "photos") {
      var imgs = imgsOf(p);
      return '<div class="q" data-q="' + f.id + '"><div class="qt"><span class="n">' + n + "</span>" + esc(f.t) + '</div><input type="file" id="ph-file" accept="image/*" multiple /><div class="thumbs">' + (p.photos || []).map(function (x, i) {
        return '<div class="th"><img src="' + (imgs[x.id] || "") + '" alt="照片 ' + esc(x.id) + '" /><input type="text" data-cap="' + i + '" placeholder="一句说明（可选）" value="' + esc(x.cap || "") + '" /><button class="ghost small" data-rmph="' + i + '">删</button></div>';
      }).join("") + '</div><p class="hint">照片会缩小后只存在这个浏览器里；做展示页时由页面排版，不会发给 AI（AI 只看到你写的说明）。只放你自己拍的、或者有权使用的照片。</p></div>';
    }
    return "";
  }
  function renderMaterial() {
    var p = curP(), c = CATS[p.cat], B = $("b-material");
    var fs = fieldsOf(p);
    if (!ui.frozen[p.id]) { ui.frozen[p.id] = {}; fs.forEach(function (f) { if (answered(p, f)) ui.frozen[p.id][f.id] = 1; }); }
    var fr = ui.frozen[p.id], known = fs.filter(function (f) { return fr[f.id] && answered(p, f); }), ask = fs.filter(function (f) { return !(fr[f.id] && answered(p, f)); });
    var h = '<div class="pcard" id="mat-take"><div style="font-weight:700;margin-bottom:4px">' + c.icon + " 【" + esc(THEMES[themeOf(p)].name) + "】" + esc(c.name) + (p.title ? "「" + esc(p.title) + "」" : "") + "</div><div><b>这一局带走</b>" + esc(takeOf(p)) + "，外加一张能分享的完成卡</div><div><b>在哪里做</b>就在这一页里：你补材料，AI 做第一版，你检查修改，确认之后登月</div>" + (p.small ? "<div><b>今天</b>" + esc(c.firstStep) + "</div>" : "") + "</div>";
    if (p.cat === "novel" && R_REAL.test(p.idea || "") && !R_FICTION.test(p.idea || "")) h += '<div class="warnbox" id="mat-real">你提到了真实的人或事。小说会虚构情节；想写真事、不虚构，点最下面「换一类做」，选【记录】里的「写一篇真实的记录」。</div>';
    if (p.idea && p.idea.trim()) h += '<div class="hint" id="mat-idea">你的原话：「' + esc(p.idea.trim()) + "」（AI 做的时候会看到这句话）</div>";
    if (known.length) h += '<div class="known"><div style="font-weight:600">已经知道的（不再问）</div>' + known.map(function (f) { var ga = p.a[f.id]; return "<div><span>" + esc(f.t.replace(/[（(：:].*$/, "").replace(/[？?]$/, "")) + "：" + pt(String(Array.isArray(valueOf(p, f)) ? (f.type === "photos" ? valueOf(p, f).length + " 张" : valueOf(p, f).join("、")) : valueOf(p, f))) + (ga && ga.guessed ? '<span class="guess">（从你的话里猜的，不对就点「改」）</span>' : "") + '</span><button class="sec2" data-re="' + f.id + '">改</button></div>'; }).join("") + "</div>";
    h += ask.length ? '<p class="hint">' + (p.cat === "novel" ? "不确定的可以跳过：跳过的设定标成「待补」，由 AI 来创作。" : "不确定的可以跳过：跳过的标成「待补」，AI 不会替你编成事实。") + "</p>" : '<div class="okbox">材料都齐了，可以做第一版了。</div>';
    ask.forEach(function (f, i) { h += fieldHtml(p, f, i + 1); });
    if (p.cat === "exp" && expType(p) === "event") h += '<div id="search-box"></div>';
    var miss = missingMust(p);
    h += '<div class="err" id="err-mat"></div><div class="next"><b>下一步：</b>' + (miss.length ? "还差必填的 " + miss.length + " 项：" + esc(miss.map(function (f) { return f.t.replace(/[（(：？?].*$/, ""); }).join("、")) + "。其余都可以跳过。" : "材料够了，点下面让 AI 做出第一版。") + '</div><div class="row"><button id="mat-go">材料够了，做出第一版</button><button class="ghost small" id="mat-back">换一类做</button></div>';
    B.innerHTML = h;
    B.querySelectorAll("[data-re]").forEach(function (b) { b.onclick = function () { delete fr[b.getAttribute("data-re")]; renderMaterial(); appendAsk("material"); }; });
    ask.forEach(function (f) {
      if (f.type === "one" || f.type === "many") bindQ(B, f.id, f.type === "many", function (v) { if (v) p.a[f.id] = v; else delete p.a[f.id]; save(); renderSummaries(); if (f.id === "x_type" || f.id === "x_data" || f.id === "n_len" || (f.id === "l_q3" && timeAffects(p))) { if (f.id === "l_q3") fixQ4(p); renderMaterial(); appendAsk("material"); } else updNext(p); });
      if (f.type === "text") {
        var ta = $("t_" + f.id), k = $("k_" + f.id);
        ta.oninput = function () { p.a[f.id] = { v: ta.value }; if (k) k.checked = false; if (f.id === "x_name" && $("pub-q") && !p.query) $("pub-q").value = ta.value.trim(); save(); renderSummaries(); updNext(p); };
        ta.onchange = function () { if (f.id === "x_data") { renderMaterial(); appendAsk("material"); } };
        if (k) k.onchange = function () { if (k.checked) { p.a[f.id] = { skip: true }; ta.disabled = true; } else { ta.disabled = false; p.a[f.id] = { v: ta.value }; } save(); updNext(p); };
      }
      if (f.type === "photos") bindPhotos(p);
    });
    if ($("search-box")) renderSearch(p);
    $("mat-back").onclick = function () {
      /* 刚开、什么都没动过的这一件不留在星图里（不算「航行中」）；你写的那句话还在入口 */
      if (!p.out && p.updatedAt === p.createdAt && !(p.photos || []).length) { S.projects.splice(S.cur, 1); if (METRICS.started > 0) { METRICS.started--; try { localStorage.setItem(LS_METRICS, JSON.stringify(METRICS)); } catch (e) {} } }
      S.cur = -1; S.entry.mode = S.entry.mode || "have"; ui.pickStep = "idea"; go("pick");
    };
    $("mat-go").onclick = function () {
      var mm = missingMust(p);
      if (mm.length) { $("err-mat").textContent = "还差：" + mm.map(function (f) { return f.t.replace(/[（(：？?].*$/, ""); }).join("、") + "（这几项是做出第一版必须的）。"; return; }
      if (!p.title) p.title = titleFromInput(p);
      p.out = null; p.degree = null; p.saved = false; go("draft");
    };
  }
  function updNext(p) { var nx = $("b-material").querySelector(".next"), miss = missingMust(p); if (nx) nx.innerHTML = "<b>下一步：</b>" + (miss.length ? "还差必填的 " + miss.length + " 项：" + esc(miss.map(function (f) { return f.t.replace(/[（(：？?].*$/, ""); }).join("、")) + "。其余都可以跳过。" : "材料够了，点下面让 AI 做出第一版。"); }
  function resizeImg(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.8)); }; im.onerror = rej; im.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function bindPhotos(p) {
    var max = p.small ? 4 : 8, inp = $("ph-file");
    inp.onchange = function () {
      var files = [].slice.call(this.files || []); if (!files.length) return;
      files = files.slice(0, Math.max(0, max - p.photos.length)); if (!files.length) { toast("最多 " + max + " 张，先删一张"); return; }
      Promise.all(files.map(resizeImg)).then(function (arr) {
        var m = imgsOf(p); arr.forEach(function (src) { var id = "p" + (Date.now() % 100000) + Math.floor(Math.random() * 100); m[id] = src; p.photos.push({ id: id, cap: "" }); });
        if (setImgs(p, m)) toast("放好了 " + arr.length + " 张"); save(); renderMaterial(); appendAsk("material");
      }, function () { toast("这张图读不出来，换一张试试"); });
    };
    $("b-material").querySelectorAll("[data-cap]").forEach(function (x) { x.oninput = function () { p.photos[+x.getAttribute("data-cap")].cap = x.value.trim(); save(); }; });
    $("b-material").querySelectorAll("[data-rmph]").forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-rmph"), m = imgsOf(p); delete m[p.photos[i].id]; p.photos.splice(i, 1); setImgs(p, m); save(); renderMaterial(); appendAsk("material"); }; });
  }
  /* 第 108 条④：搜索只在用户主动选择并确认搜索内容后进行 */
  function renderSearch(p) {
    var el = $("search-box"), manual = '<label class="field" style="margin-top:8px"><span class="h">或者自己贴：活动的链接或报道标题（可选）</span><input type="text" id="pub-manual" value="' + esc(p.pubManual || "") + '" /></label>';
    if (p.pub) {
      el.innerHTML = '<div class="okbox">你确认了公开资料：<b>' + esc(p.pub.label || "") + "</b> " + esc(p.pub.title) + "（" + esc([p.pub.date, p.pub.place, p.pub.organizer].filter(Boolean).join(" · ")) + '）</div><p class="hint">复盘页只放它的文字信息和来源链接，不转载别人的图片。</p><div class="row"><button class="ghost small" id="pub-re">重新选</button></div>';
      $("pub-re").onclick = function () { p.pub = null; p.cands = null; save(); renderSearch(p); };
      return;
    }
    if (p.cands) {
      el.innerHTML = (p.cands.length ? '<div class="qt" style="font-weight:400">找到这几个，哪个是你做的那一场？</div>' + p.cands.map(function (x, i) { var u = safeUrl(x.source_url); return '<label class="cand choice"><input type="radio" name="cand" value="' + i + '" /><span><b>' + esc(x.label || String.fromCharCode(65 + i)) + "</b> " + esc(x.title) + "<br><small>" + esc([x.date, x.place, x.organizer].filter(Boolean).join(" · ")) + "</small>" + (u ? '<br><a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">打开来源核对</a>' : "") + "</span></label>"; }).join("") + '<label class="cand choice"><input type="radio" name="cand" value="-1" /><span>都不是</span></label>' : '<div class="note">没查到。可以自己贴一个链接或报道标题，或者先不放。</div>') +
        (p.candNote ? '<p class="hint">' + esc(p.candNote) + "</p>" : "") + '<div class="row">' + (p.cands.length ? '<button class="small" id="cand-pick">就是这个</button>' : "") + '<button class="ghost small" id="cand-again">换个词再查</button></div>' + manual;
      var pk = $("cand-pick"); if (pk) pk.onclick = function () { var r = el.querySelector('input[name="cand"]:checked'); if (!r) { toast("先点一个"); return; } var v = +r.value; if (v >= 0) p.pub = p.cands[v]; else { p.cands = []; p.candNote = "都不是。可以自己贴一个链接或报道标题，或者先不放。"; } save(); renderSearch(p); };
      $("cand-again").onclick = function () { p.cands = null; save(); renderSearch(p); };
    } else {
      var q = p.query || [answeredText(p, "x_name") ? p.a.x_name.v : ""].join(" ").trim();
      el.innerHTML = '<details' + (p.query ? " open" : "") + '><summary>查找这次活动的公开资料（可选）</summary><p class="hint">只在你点「确认，用这个词去查」之后才会上网查：会把下面这个搜索词发给你选的 AI 服务。查到的只给候选和来源，让你自己确认；不转载图片。</p>' +
        '<label class="field"><span class="h">搜索词（可以改）</span><input type="text" id="pub-q" value="' + esc(q) + '" placeholder="例：2024 某品牌上海快闪" /></label><div class="row"><button class="sec2 small" id="pub-go">确认，用这个词去查</button></div><div id="pub-slot"></div></details>' + manual;
      $("pub-q").oninput = function () { p.query = this.value.trim(); save(); };
      $("pub-go").onclick = function () {
        var qq = $("pub-q").value.trim(); if (!qq) { toast("先写一个搜索词"); return; } p.query = qq; save();
        AI.run(taskSearch(p, qq, function () { $("pub-slot").innerHTML = '<p class="hint">好，在下面贴一个链接或报道标题就行。</p>'; }), $("pub-slot")).then(function (o) { p.cands = o.candidates || []; p.candNote = o.honest_note || ""; save(); if ($("search-box")) renderSearch(p); });
      };
    }
    var mi = $("pub-manual"); if (mi) mi.oninput = function () { p.pubManual = mi.value.trim(); if (p.pubManual) p.pub = null; save(); };
  }

  /* ---------- ③ 做出第一版：生成粒度按类目定（#9 ③） ---------- */
  function previewTag(id) { return '<iframe class="preview" id="' + id + '" sandbox="allow-scripts" title="预览"></iframe>'; }
  var SHIM = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:">' +
    '<script>(function(){var t=0;function f(){if(t)return;t=1;try{parent.postMessage({lingcunTried:1},"*")}catch(e){}}document.addEventListener("click",f,true);document.addEventListener("input",f,true);document.addEventListener("change",f,true);})();<\/script>' +
    '<script>(function(){try{window.localStorage.length;}catch(e){var m={},s={getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null}};Object.defineProperty(s,"length",{get:function(){return Object.keys(m).length}});try{Object.defineProperty(window,"localStorage",{value:s,configurable:true});}catch(e2){}}})();<\/script>';
  function sandboxed(html) { html = String(html || ""); return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (m) { return m + SHIM; }) : SHIM + html; }
  function setPreview(id, html) { var f = $(id); if (f) f.srcdoc = sandboxed(html); }
  function grainText(p) {
    if (p.cat === "novel") return novelMode(p) === "outline" ? "这是中长篇：先出故事结构（几段、每段讲什么），你看过再一段一段展开，不用一次等完整篇。" : "这是短篇：直接写出正文，边写边能看到进度。";
    if (p.cat === "photo") return "先给一个编排预览（怎么分组、什么顺序），满意了再生成展示页。";
    if (p.cat === "resume") return "简历不长：直接出第一版，你再检查哪里不对。";
    if (p.cat === "create") return "";
    if (p.out && p.out.html !== undefined || p.cat === "tool" || (p.cat === "generic" && idx(p, "g_form") === 3)) return "小网页：直接做出能点、能记的第一版。";
    return "直接出第一版，先做最小的一份。";
  }
  function runTask(p, task, slot, then) {
    var k = task.key; if (ui.running[k]) return; ui.running[k] = 1;
    AI.run(task, slot).then(function (o) { delete ui.running[k]; then(o); });
  }
  /* 没有 AI 标题时：用用户自己写的（一句话、作品名、情节、主题…），最后才用类目名 */
  function titleFromInput(p) {
    var cand = [p.idea, answeredText(p, "c_idea") && p.a.c_idea.v, answeredText(p, "x_name") && p.a.x_name.v, answeredText(p, "g_what") && p.a.g_what.v, answeredText(p, "t_scene") && p.a.t_scene.v,
      answeredText(p, "ph_theme") && p.a.ph_theme.v, answeredText(p, "n_plot") && p.a.n_plot.v, answeredText(p, "r_target") && p.a.r_target.v && ("简历 · " + p.a.r_target.v), answeredText(p, "r_exp") && p.a.r_exp.v];
    for (var i = 0; i < cand.length; i++) if (cand[i] && String(cand[i]).trim()) return short(String(cand[i]).trim(), 18);
    return CATS[p.cat].name;
  }
  function setOut(p, o) {
    if (o.html === undefined && p.cat === "novel" && o.sections && o.logline !== undefined) { p.out = { title: o.title, logline: o.logline, style_note: o.style_note, sections: o.sections.map(function (s) { return { heading: s.heading, summary: s.summary, text: "" }; }) }; }
    else p.out = o;
    var ot = p.out && (p.out.title || p.out.headline); /* #17：AI 产出的标题回写成项目名（不额外调 AI 命名） */
    if (ot && String(ot).trim()) p.title = short(String(ot).trim(), 24);
    if (p.cat === "exp" || p.cat === "resume") p.warn = unknownNums(textsOf(p.out), p.cat === "exp" ? caseFacts(p) : inputsOf(p));
  }
  function renderDraft() {
    var p = curP(), B = $("b-draft");
    if (!p.out) {
      B.innerHTML = '<div class="note">' + esc(grainText(p)) + '</div><div id="dr-slot"></div>';
      runTask(p, taskDraft(p), $("dr-slot"), function (o) { setOut(p, o); save(); if (S.stage === "draft" && curP() === p) { renderDraft(); appendAsk("draft"); } });
      return;
    }
    var o = p.out, outline = p.cat === "novel" && o.logline !== undefined, wrote = outline ? o.sections.filter(function (s) { return s.text; }).length : 0;
    var h = "";
    if (outline && !wrote) {
      h = '<div class="okbox"><b>故事结构出来了：</b>' + esc(o.title) + " · " + esc(o.logline) + "</div><ol>" + o.sections.map(function (s) { return "<li><b>" + esc(s.heading) + "</b>：" + esc(s.summary) + "</li>"; }).join("") + '</ol><p class="hint">' + esc(o.style_note) + "</p>" +
        '<div class="next"><b>下一步：</b>结构可以的话，展开第一段；不满意就重出一版结构。</div><div class="row"><button id="dr-exp">结构可以，展开第一段</button><button class="ghost small" id="dr-redo">重新出一版结构</button></div><div id="dr-slot"></div>';
    } else {
      h = '<div class="okbox"><b>第一版做出来了。</b>' + esc(o.summary || o.title || o.headline || "") + "</div>" + previewTag("dr-prev") +
        (outline ? '<p class="hint">已经展开了 ' + wrote + " 段，结构一共 " + o.sections.length + " 段。可以接着展开，也可以先拿写好的去检查。</p>" : "") +
        '<div class="next"><b>下一步：</b>去「检查与修改」：页面先帮你查一遍，你再看哪里要改。</div><div class="row"><button id="dr-next">去检查与修改</button>' +
        (outline && wrote < o.sections.length ? '<button class="sec2" id="dr-exp">展开下一段</button>' : "") + '</div><div id="dr-slot"></div>';
    }
    B.innerHTML = h;
    if ($("dr-prev")) setPreview("dr-prev", renderOut(p, false));
    if ($("dr-next")) $("dr-next").onclick = function () { go("check"); };
    if ($("dr-redo")) $("dr-redo").onclick = function () { p.out = null; save(); renderDraft(); appendAsk("draft"); };
    if ($("dr-exp")) $("dr-exp").onclick = function () { expandNext(p, $("dr-slot"), function () { if (S.stage === "draft") { renderDraft(); appendAsk("draft"); } }); };
  }
  function expandNext(p, slot, done) {
    var k = -1; p.out.sections.some(function (s, i) { if (!s.text) { k = i; return true; } return false; });
    if (k < 0) return toast("每一段都展开了");
    runTask(p, taskSection(p, k), slot, function (o) { p.out.sections[k].text = o.text; p.out.sections[k].heading = o.heading || p.out.sections[k].heading; save(); toast("第 " + (k + 1) + " 段写好了"); done(); });
  }

  /* ---------- ④ 检查与修改（「做成程度」在这里，排在「保存」之前） ---------- */
  var DEGREE = ["做出来了，但我还不满意", "基本满意", "已经在用了 / 已经发出去了"];
  /* v0.0.12（#35）第 5 屏「这是第一版」：文字类成果直接摊开，点一句就能只改这一句；小网页、照片页用预览，写一句想改哪里 */
  ui.sn = {};
  function splitSent(t) { return String(t || "").match(/[^。！？!?…\n]+(?:[。！？!?…]+[」”』’）)]*)?|[。！？!?…]+/g) || []; }
  function sentModel(p) {
    var o = p.out, L = [], add = function (kind, t, part) { if (t && String(t).trim()) L.push({ k: kind, t: String(t).trim(), part: part === undefined ? -1 : part }); };
    if (!o || o.html !== undefined || o.groups) return null;
    if (o.experiences) { add("h", o.headline); add("p", o.summary); o.experiences.forEach(function (x) { add("h", [x.org, x.role, x.period].filter(Boolean).join(" · ")); (x.bullets || []).forEach(function (y) { add("p", y); }); }); if (o.skills && o.skills.length) add("p", "技能：" + o.skills.join("、")); (o.transfer || []).forEach(function (y) { add("p", y); }); return L; }
    if (o.one_line !== undefined) { add("h", o.title); add("p", o.one_line); add("p", o.background); add("p", o.my_role); (o.what_i_did || []).forEach(function (y) { add("p", y); }); (o.results || []).forEach(function (y) { add("p", y); }); add("p", o.evidence_sentence); (o.if_again || []).forEach(function (y) { add("p", y); }); return L; }
    if (o.sections) { if (o.summary) add("p", o.summary); o.sections.forEach(function (x, i) { if (x.text) { add("h", x.heading, i); String(x.text).split(/\n+/).forEach(function (pp) { add("p", pp, i); }); } else if (x.points) { add("h", x.heading, i); x.points.forEach(function (y) { add("p", y, i); }); } }); return L.length ? L : null; }
    return null;
  }
  function resultHtml(p) {
    var M = sentModel(p), o = p.out, n = 0, list = [], h = "";
    if (!M) { ui.sn[p.id] = { list: [], sel: -1 }; return '<div class="gl result" id="ck-result"><div class="kick">' + esc(p.title || CATS[p.cat].name) + " · v" + (p.revs + 1) + "</div>" + previewTag("ck-prev") + '<div class="hint2">' + (o && o.html !== undefined ? "试一试，想改哪里写一句" : "看一看，想改哪里写一句") + "</div></div>"; }
    var st = ui.sn[p.id] && ui.sn[p.id].rev === p.revs ? ui.sn[p.id] : { sel: -1 };
    h += '<div class="gl result ugc" id="ck-result"><div class="kick">' + esc(p.title || CATS[p.cat].name) + " · v" + (p.revs + 1) + "</div>";
    h += '<div class="rbody" id="ck-body">';
    M.forEach(function (x) {
      if (x.k === "h") { h += '<div class="sh">' + esc(x.t) + "</div>"; return; }
      h += '<p class="para">' + splitSent(x.t).map(function (sn) { var i = n++; list.push({ t: sn, part: x.part }); return '<span class="sn' + (i === st.sel ? " sel" : "") + '" data-sn="' + i + '" tabindex="0" role="button" aria-pressed="' + (i === st.sel) + '">' + pt(sn) + "</span>"; }).join("") + "</p>";
    });
    ui.sn[p.id] = { list: list, sel: st.sel < list.length ? st.sel : -1, rev: p.revs };
    /* 第 5 屏默认只露前几行（底部淡出），长的才给「展开 / 收起」 */
    var chars = list.reduce(function (a, x) { return a + x.t.length; }, 0) + M.filter(function (x) { return x.k === "h"; }).length * 16;
    return h + '</div><div class="hint2">点一句，改一处</div>' + (chars > 90 ? '<button class="foldbtn" id="ck-fold" aria-controls="ck-body" aria-expanded="false">展开</button>' : "") + "</div>";
  }
  function editBar(p, fixOpts) {
    var st = ui.sn[p.id], one = st && st.sel >= 0 ? st.list[st.sel] : null, tool = !sentModel(p);
    if (!one && !tool) return '<div id="sn-bar"></div>';
    return '<div class="gl editbar" id="sn-bar">' + (one ? '<button class="x" id="sn-x" aria-label="不改这一句">×</button><div class="q-sn">改这一句</div>' : '<div class="q-sn">想改哪里？</div>') +
      '<input type="text" id="sn-req" maxlength="120" placeholder="' + (one ? "想怎么改？一句就好" : "例：按钮大一点；加一个删除") + '" />' +
      ((fixOpts || []).length ? '<div class="chips" id="sn-chips">' + fixOpts.map(function (x) { return '<button data-snq="' + esc(x) + '">' + esc(x) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="err" id="sn-err"></div><div class="row"><button class="small" id="sn-go">' + (one ? "改这一句" : "按这个改") + '</button></div><div id="sn-slot"></div></div>';
  }
  function afterRevise(p, part, o2) {
    if (p.cat === "novel" && part >= 0) { p.out.sections[part].text = o2.text; }
    else if (p.cat === "novel" && p.out.logline !== undefined) { var wi = []; p.out.sections.forEach(function (s, i) { if (s.text) wi.push(i); }); o2.sections.forEach(function (s, i) { var t = p.out.sections[wi[i]]; if (t) { t.text = s.text; t.heading = s.heading; } }); }
    else setOut(p, o2);
    p.revs++; p.fix = null; p.saved = false; p.confirm = {}; if (ui.sn[p.id]) ui.sn[p.id].sel = -1; save(); toast("改好了"); if (S.stage === "check") { renderCheck(); appendAsk("check"); }
  }
  function renderCheck() {
    var p = curP(), B = $("b-check"), c = CATS[p.cat], o = p.out;
    if (!o) { B.innerHTML = '<div class="note">还没有第一版。</div><div class="dock"><button class="main" id="ck-back">去做出第一版</button></div>'; $("ck-back").onclick = function () { go("draft"); }; return; }
    var chk = autoChecks(p), outline = p.cat === "novel" && o.logline !== undefined, left = outline ? o.sections.filter(function (s) { return !s.text; }).length : 0;
    var fixOpts = o.html !== undefined ? (o.next_tweaks || []) : c.fix, textMode = !!sentModel(p);
    var h = '<div class="brk">' + bk() + resultHtml(p) + "</div>" + editBar(p, fixOpts) +
      '<details class="more" id="ck-more"><summary>更多</summary>' +
      (textMode ? '<details id="ck-look"><summary>看排版好的样子</summary>' + previewTag("ck-prev") + "</details>" : "") +
      '<div class="qt">页面先帮你查了一遍</div><ul class="hint" style="display:block;padding-left:1.2em">' + chk.map(function (x) { return "<li>" + (x[1] ? "没问题：" : "留意：") + esc(x[0]) + (x[2] ? "：" + esc(x[2]) : "") + "</li>"; }).join("") + "</ul>" +
      (p.cat === "exp" ? '<div class="qt">这段经历，还可以补点什么？</div><div class="next">' + tierHints(p).map(function (x) { return "<div>" + esc(x) + "</div>"; }).join("") + "</div>" : "") +
      '<div class="qt">你自己看一眼（勾上看过的）</div><div class="choices">' + c.self.map(function (s, i) { return '<label class="choice"><input type="checkbox" data-self="' + i + '"' + (p.selfOk.indexOf(i) >= 0 ? " checked" : "") + " /><span>" + esc(s) + "</span></label>"; }).join("") + "</div>" +
      '<details id="ck-fix"' + (p.fix ? " open" : "") + '><summary>整篇改一处</summary>' +
      (p.cat === "novel" ? '<label class="field"><span class="h">改哪里</span><select id="ck-part"><option value="-1">整篇</option>' + o.sections.map(function (s, i) { return s.text ? '<option value="' + i + '"' + (p.fixPart === i ? " selected" : "") + ">第 " + (i + 1) + " 段：" + esc(s.heading) + "</option>" : ""; }).join("") + "</select></label>" : "") +
      qHtml("fix", "哪里不对？", fixOpts, p.fix) + '<div class="err" id="fix-err"></div><div class="row"><button class="small" id="fix-go">按这个改</button></div><div id="fix-slot"></div></details>' +
      (left ? '<div class="row"><button class="sec2 small" id="ck-exp">继续展开下一段（还有 ' + left + ' 段）</button></div><div id="ck-exp-slot"></div>' : "") +
      (p.cat === "exp" || p.cat === "resume" ? '<div class="row"><button class="ghost small" id="ck-match">能力对照（可选）</button></div>' : "") +
      qHtml("degree", "做到什么程度了？（可选）", DEGREE, p.degree, false) +
      '<div class="slider"><div class="lab"><span>你自己对这份成果满意几成（可选）</span><b id="sat-v">' + (p.sat === null ? "还没拖" : p.sat + "%") + '</b></div><input type="range" id="sat" min="0" max="100" step="20" value="' + (p.sat === null ? 0 : p.sat) + '" class="' + (p.sat === null ? "unset" : "") + '" aria-label="满意度" /><div class="ticks"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div></div>' +
      '<div class="row"><button class="ghost small" id="ck-mat">回去补材料</button><button class="ghost small" id="ck-dl">下载 .html</button></div></details>' +
      '<div class="err" id="ck-err"></div><div class="dock"><button class="main" id="ck-next">就它了</button></div>';
    B.innerHTML = h;
    var pv = $("ck-prev"); if (pv) { if (!textMode) setPreview("ck-prev", renderOut(p, false)); else $("ck-look").ontoggle = function () { if (this.open && !pv.srcdoc) setPreview("ck-prev", renderOut(p, false)); }; }
    /* 收着时：点卡片任何地方（或「展开」）先展开，不会误选句子；展开后点句子照常改这一句，点「收起」收回去 */
    (function () {
      var R = $("ck-result"), fb = $("ck-fold"); if (!R || !fb) return;
      ui.ckOpen = ui.ckOpen || {};
      var setF = function (open) { ui.ckOpen[p.id] = open; R.classList.toggle("fold", !open); fb.setAttribute("aria-expanded", String(open)); fb.textContent = open ? "收起" : "展开"; };
      setF(!!ui.ckOpen[p.id] || (ui.sn[p.id] && ui.sn[p.id].sel >= 0));
      fb.onclick = function (ev) { ev.stopPropagation(); setF(!ui.ckOpen[p.id]); if (!ui.ckOpen[p.id]) try { R.scrollIntoView({ behavior: smooth(), block: "nearest" }); } catch (e) {} };
      R.addEventListener("click", function (ev) { if (R.classList.contains("fold") && ev.target !== fb) { ev.stopPropagation(); ev.preventDefault(); setF(true); } }, true);
      var ptr = false; R.addEventListener("pointerdown", function () { ptr = true; setTimeout(function () { ptr = false; }, 600); }, true);
      /* 只有键盘（Tab）把焦点移进收着的卡片时才自动展开；鼠标 / 手指按下时交给上面的 click，免得一按就既展开又选中 */
      R.addEventListener("focusin", function (ev) { if (R.classList.contains("fold") && ev.target !== fb && !ptr) setF(true); });
    })();
    var selAt = function (i) { var st = ui.sn[p.id]; st.sel = st.sel === i ? -1 : i; renderCheck(); appendAsk("check"); if (st.sel >= 0) { var r = $("sn-req"); if (r) try { r.focus({ preventScroll: true }); $("sn-bar").scrollIntoView({ behavior: smooth(), block: "nearest" }); } catch (e) {} } };
    B.querySelectorAll("[data-sn]").forEach(function (x) { x.onclick = function () { selAt(+x.getAttribute("data-sn")); }; x.onkeydown = function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selAt(+x.getAttribute("data-sn")); } }; });
    if ($("sn-x")) $("sn-x").onclick = function () { ui.sn[p.id].sel = -1; renderCheck(); appendAsk("check"); };
    B.querySelectorAll("[data-snq]").forEach(function (b) { b.onclick = function () { $("sn-req").value = b.getAttribute("data-snq"); try { $("sn-req").focus(); } catch (e) {} }; });
    if ($("sn-go")) $("sn-go").onclick = function () {
      var wish = $("sn-req").value.trim(), st = ui.sn[p.id], one = st && st.sel >= 0 ? st.list[st.sel] : null;
      if (!wish) { $("sn-err").textContent = "写一句想怎么改（也可以点上面的一个）。"; return; }
      $("sn-err").textContent = "";
      var warn = p.warn && p.warn.length ? "（这些数字我没提供过：" + p.warn.join("、") + "）" : "";
      var req = one ? "只改这一句：「" + one.t + "」。想改成：" + wish + "。其他句子一字不动。" + warn : wish + warn;
      var part = p.cat === "novel" && one ? one.part : -1;
      runTask(p, taskRevise(p, req, part), $("sn-slot"), function (o2) { afterRevise(p, part, o2); });
    };
    B.querySelectorAll("[data-self]").forEach(function (x) { x.onchange = function () { var i = +x.getAttribute("data-self"); p.selfOk = p.selfOk.filter(function (y) { return y !== i; }); if (x.checked) p.selfOk.push(i); save(); }; });
    bindQ(B, "fix", false, function (v) { p.fix = v; save(); });
    bindQ(B, "degree", false, function (v) { p.degree = v; save(); renderSummaries(); });
    if ($("ck-part")) $("ck-part").onchange = function () { p.fixPart = +this.value; save(); };
    $("sat").oninput = function () { p.sat = +this.value; this.classList.remove("unset"); $("sat-v").textContent = p.sat + "%"; save(); };
    $("fix-go").onclick = function () {
      var v = p.fix; if (!qAnswered(v)) { $("fix-err").textContent = "先选一个（选了「其他」就写一句）。"; return; }
      if (v.skip) { $("fix-err").textContent = ""; toast("好，先不改"); return; }
      var req = qText(fixOpts, v) + (p.warn && p.warn.length ? "（这些数字我没提供过：" + p.warn.join("、") + "）" : "");
      $("fix-err").textContent = "";
      var part = p.cat === "novel" ? p.fixPart : -1;
      runTask(p, taskRevise(p, req, part), $("fix-slot"), function (o2) { afterRevise(p, part, o2); });
    };
    if ($("ck-exp")) $("ck-exp").onclick = function () { expandNext(p, $("ck-exp-slot"), function () { if (S.stage === "check") { renderCheck(); appendAsk("check"); } }); };
    if ($("ck-match")) $("ck-match").onclick = function () { openMatch(); };
    $("ck-mat").onclick = function () { go("material"); };
    $("ck-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
    /* 做成程度是可选的：没选就记成「先跳过」，不替用户下判断 */
    $("ck-next").onclick = function () { if (!qAnswered(p.degree)) { p.degree = { skip: true }; save(); } go("save"); };
  }

  /* ---------- ⑤ 确认登月（#19：登月前一次轻量确认，不确认就不登月；#21：登月 + 分享卡 + star 入口；不替用户下结论） ---------- */
  var LANDING = ((/[?&]landing=(a|b)\b/i.exec(location.search) || [0, "a"])[1]).toLowerCase();
  var PLANETS = [
    { n: "月球", e: "", c: "#ece8ff", c2: "#7c6bd6" }, { n: "火星", e: "", c: "#fecaca", c2: "#b4412f" }, { n: "木星", e: "", c: "#fde3c0", c2: "#b7773a" },
    { n: "土星", e: "", c: "#fef0b0", c2: "#a7852e" }, { n: "金星", e: "", c: "#fff7d6", c2: "#c9a227" }, { n: "海王星", e: "", c: "#bfdbfe", c2: "#2a4fb5" },
    { n: "天王星", e: "", c: "#c7f9e3", c2: "#2f8f78" }, { n: "水星", e: "", c: "#f1f2f5", c2: "#7b8190" }];
  function planetOf(i) { i = i > 0 ? i : 0; if (i < PLANETS.length) return PLANETS[i]; var b = PLANETS[1 + (i - 1) % (PLANETS.length - 1)]; return { n: "第 " + (i + 1) + " 颗星球", e: b.e, c: b.c, c2: b.c2 }; }
  function nextPlanet() { var mx = -1; S.projects.forEach(function (q) { if (q.landed && q.planet > mx) mx = q.planet; }); return mx + 1; }
  function confirmKind(p) { if (p.cat === "create") return "step"; if (p.out && p.out.html !== undefined) return "tool"; if (p.cat === "resume" || p.cat === "exp" || (p.cat === "generic" && p.theme === "rewrite")) return "facts"; if (p.cat === "photo") return "photo"; return "text"; }
  var CONFIRM = {
    text: { q: "读过了吗？", items: ["我从头到尾读过这一版了", "我愿意留下这一版"] },
    photo: { q: "看过了吗？", items: ["我看过了，每张照片和说明都对得上", "我愿意留下这一版"] },
    facts: { q: "核对过事实吗？", items: ["每一条事实我都核对过：没有编出来的经历、数字和头衔", "它准确地表达了我自己"] },
    tool: { q: "亲手试过了吗？", items: ["我在上面的预览里亲手试过一次", "它做到了说好的那件事"] },
    step: { q: "看过了吗？", items: ["我看过这一步和框架了", "这是我想走的方向"] }
  };
  var CHANGE_SUG = { text: ["我把一直想写的东西写出来了", "我第一次把一件事从头到尾写完"], photo: ["我把这些照片好好排成了一页"], facts: ["我把做过的事讲清楚了", "我知道自己的经历可以怎么讲了"], tool: ["生活里有件事变得顺手了", "我第一次做出了一个能用的小工具"], step: ["我把一个想法想清楚了", "我知道第一步做什么了"] };
  function coreFn(p) { var v = fieldById(p, "t_action") ? vText(p, "t_action") : ""; if (v === PEND) v = ""; return v || (p.out && p.out.summary) || "你要的那个功能"; }
  function confirmItems(p) { var k = confirmKind(p), L = CONFIRM[k].items.slice(); if (k === "tool") L[1] = "它做到了说好的那件事：" + coreFn(p); return L; }
  function writtenCount(p) { return p.out && p.out.sections ? p.out.sections.filter(function (x) { return x.text; }).length : 0; }
  function canLand(p) {
    if (!p.out) return "还没有第一版。";
    if (p.cat === "novel" && p.out.logline !== undefined && !writtenCount(p)) return "这一局说好带走「结构＋第一段」：先展开第一段，再来登月。";
    var n = confirmItems(p).length; for (var i = 0; i < n; i++) if (!p.confirm[i]) return "按住确认，等外圈走满。";
    return "";
  }
  function triedHtml(p) { return p.tried ? "你已经在预览里亲手试过了。" : "最好先在上一屏的预览里亲手试一次。"; }
  window.addEventListener("message", function (ev) {
    var d = ev.data; if (!d || d.lingcunTried !== 1) return; var p = curP(); if (!p) return;
    var mine = ["lc-prev", "ck-prev", "dr-prev"].some(function (id) { var f = $(id); return f && f.contentWindow === ev.source; }); if (!mine) return;
    if (!p.tried) { p.tried = true; save(); } var el = $("lc-tried"); if (el) el.textContent = triedHtml(p);
  });
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; }
  function excerptOf(p) {
    var o = p.out, s = ""; if (!o) return "";
    if (o.html !== undefined) s = o.summary || "";
    else if (o.first_step) s = o.first_step;
    else if (o.experiences) s = (o.summary || "") + " " + (o.experiences[0] ? o.experiences[0].bullets.join("；") : "");
    else if (o.one_line !== undefined) s = o.one_line + " " + (o.what_i_did || []).join("；");
    else if (o.groups) s = o.intro || "";
    else if (o.sections) s = (o.summary ? o.summary + " " : "") + o.sections.map(function (x) { return x.text || (x.points || []).join("；") || x.summary || ""; }).join(" ");
    return clip(s.replace(/待补/g, "…"), 110);
  }
  function fmtDay(t) { var d = new Date(t || Date.now()); return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日"; }
  function changeLine(p) { return p.change && p.change.trim() ? "“" + p.change.trim() + "”" : p.cat === "create" ? "" : "我做出了一件属于自己的东西。"; }
  /* v0.0.12（#33 #35）第 7 屏：浅夜色，定稿的庆祝小人站上月面；轻点进第 8 屏星图。不再有旧宇航员和 emoji */
  var STAR_SVG = '<svg class="gh" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z" fill="none" stroke="#231C45" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  function fmtDot(t) { var d = new Date(t || Date.now()), z = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "." + z(d.getMonth() + 1) + "." + z(d.getDate()); }
  function landScene(p, pl, play) {
    var t = p.title || CATS[p.cat].name;
    return '<div class="land va' + (play ? " play" : "") + '" id="land" data-variant="' + (LANDING === "b" ? "b" : "a") + '" role="button" tabindex="0" aria-label="小人登上了' + esc(pl.n) + '。轻点继续，看星图">' +
      '<h2 class="msg" id="land-msg">这一步虽小，<br>对我来说<br>确实是大突破</h2><div class="fact sr" id="land-fact">登上' + esc(pl.n) + " · 「" + esc(t) + "」</div>" +
      '<div class="lbrk brk">' + bk() + '</div><div class="moon" aria-hidden="true"><i class="crater cr1"></i><i class="crater cr2"></i></div>' +
      '<div class="astro" aria-hidden="true">' + MASCOT.celebrate + '</div><div class="tap" id="land-tap">轻点继续</div></div>';
  }
  /* 第 8 屏：星图。点亮的是这一件；以前登陆过的是小星点。只给 GitHub 和分享，不替用户安排下一站 */
  var MAPPOS = [[206, 299], [74, 330], [318, 236], [130, 252], [292, 338], [52, 268], [252, 214], [164, 352], [338, 296], [100, 296]];
  function mapHtml(p, zoom) {
    var landed = S.projects.filter(function (x) { return x.landed; }), seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }, st = "";
    for (var i = 0; i < 42; i++) st += '<circle cx="' + (10 + rnd() * 370).toFixed(1) + '" cy="' + (17 + rnd() * 510).toFixed(1) + '" r="' + [0.8, 1, 1, 1.3, 1.6][Math.floor(rnd() * 5)] + '" fill="#231C45" opacity="' + (0.18 + rnd() * 0.27).toFixed(2) + '"/>';
    var L = MAPPOS.length, me = MAPPOS[p.planet % L], X = me[0], Y = me[1], others = "", used = {};
    used[p.planet % L] = 1;
    landed.forEach(function (q) { var k = q.planet % L; if (q === p || used[k]) return; used[k] = 1; var xy = MAPPOS[k]; others += '<g class="ost"><circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="5" fill="none" stroke="#231C45" stroke-width="1.2"/><circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="1.8" fill="#231C45"/><text x="' + (xy[0] + 9) + '" y="' + (xy[1] + 4) + '" font-size="10" fill="#231C45" fill-opacity=".7">' + esc(short(q.title || CATS[q.cat].name, 8)) + "</text></g>"; });
    var sky = '<svg class="sky" viewBox="0 0 390 520" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' + st +
      '<ellipse cx="195" cy="307" rx="170" ry="70" transform="rotate(-14 195 307)" fill="none" stroke="#231C45" stroke-opacity=".22" stroke-width="1"/>' +
      '<ellipse cx="195" cy="307" rx="120" ry="46" transform="rotate(-14 195 307)" fill="none" stroke="#231C45" stroke-opacity=".14" stroke-width="1" stroke-dasharray="2 4"/>' +
      '<ellipse cx="195" cy="307" rx="64" ry="24" transform="rotate(-14 195 307)" fill="none" stroke="#231C45" stroke-opacity=".12" stroke-width="1"/>' + others +
      '<g class="ring-new"><circle cx="' + X + '" cy="' + Y + '" r="14" fill="none" stroke="#231C45" stroke-width="1.5"/><circle cx="' + X + '" cy="' + Y + '" r="4.2" fill="#231C45"/>' +
      '<path d="M' + X + " " + (Y - 26) + "v6M" + X + " " + (Y + 20) + "v6M" + (X - 26) + " " + Y + "h6M" + (X + 20) + " " + Y + 'h6" stroke="#231C45" stroke-width="1.2"/></g>' +
      '<path d="M' + (X + 10) + " " + (Y - 10) + "L" + (X + 34) + " " + (Y - 34) + "H" + (X + 58) + '" fill="none" stroke="#231C45" stroke-width="1"/></svg>';
    var lx = Math.min(X + 62, 300), head = p.planet === 0 ? "你的第一颗星" : "你的第" + cnth(p.planet + 1) + "颗星";
    return '<div class="smap' + (zoom ? " zoom" : "") + '" id="land-map"><h2 class="h1" id="map-h">' + head + '</h2><div class="sbrk brk" aria-hidden="true">' + bk() + "</div>" + sky +
      '<div class="lbl" style="left:' + lx + "px;top:" + (Y - 50) + 'px"><div class="t" id="map-t">' + esc(short(p.title || CATS[p.cat].name, 9)) + '</div><div class="d">' + fmtDot(p.landedAt) + "</div></div></div>";
  }
  function armLanding(play) {
    var el = $("land"); if (!el) return;
    if (play && !RM) { el.classList.remove("play"); void el.offsetWidth; el.classList.add("play"); }
  }
  function shareCardHtml(p, pl) {
    return '<div class="sharecard" id="share-card"><div class="sc-brand"><b>另存人生</b><span>第 ' + (p.planet + 1) + " 次登陆 · " + esc(pl.n) + '</span></div><div class="sc-title" id="sc-title">「' + esc(p.title || CATS[p.cat].name) + '」</div>' +
      '<div class="sc-prev" id="sc-prev">' + esc(excerptOf(p)) + '</div><div class="sc-change" id="sc-change">' + esc(changeLine(p)) + '</div><div class="sc-foot"><span>' + esc(fmtDay(p.landedAt)) + "</span><span>github.com/huangchenyun25-web/lingcun</span></div></div>";
  }
  /* 分享卡存成图片：用 canvas 画（不引外部库） */
  function wrapLines(ctx, text, maxW, maxLines) {
    var NOHEAD = "，。、；：！？）」』”’》〉…,.;:!?)";
    var out = [], line = ""; String(text).split("").forEach(function (ch) { if (ch === "\n") { out.push(line); line = ""; return; } if (ctx.measureText(line + ch).width > maxW && line) { if (NOHEAD.indexOf(ch) >= 0) { out.push(line + ch); line = ""; } else if (line.length > 1 && "（「『“‘《〈(".indexOf(line.slice(-1)) >= 0) { out.push(line.slice(0, -1)); line = line.slice(-1) + ch; } else { out.push(line); line = ch; } } else line += ch; }); if (line) out.push(line);
    if (out.length > maxLines) { out = out.slice(0, maxLines); out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + "…"; } return out;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cardCanvas(p) {
    var pl = planetOf(p.planet), W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
    var F = 'LCSans,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif', HF = 'LCHead,LCHeadX,' + F, INK = "#231C45";
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#B9A6EE"); g.addColorStop(.24, "#D3C6F6"); g.addColorStop(.48, "#EAE4F8"); g.addColorStop(.62, "#F2EFF8"); g.addColorStop(1, "#E7E0F6"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 70; i++) { x.fillStyle = "rgba(35,28,69," + (.15 + rnd() * .3).toFixed(2) + ")"; x.beginPath(); x.arc(rnd() * W, rnd() * H * .55, rnd() * 2.4 + .8, 0, 7); x.fill(); }
    x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(W - 190, 210, 40, 0, 7); x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(W - 190, 210, 12, 0, 7); x.fill();
    x.fillStyle = INK; x.font = "64px " + HF; x.fillText("另存人生", 80, 150);
    x.globalAlpha = .7; x.font = "400 32px " + F; x.fillText("第 " + (p.planet + 1) + " 次登陆 · " + pl.n, 80, 205); x.globalAlpha = 1;
    x.font = "76px " + HF; var ty = 420; wrapLines(x, "「" + (p.title || CATS[p.cat].name) + "」", W - 160, 3).forEach(function (l) { x.fillText(l, 80, ty); ty += 96; });
    x.font = "300 36px " + F; var ex = wrapLines(x, excerptOf(p) || "（这一件的预览）", W - 220, 6), bh = ex.length * 54 + 70;
    x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(80, ty, W - 160, bh); x.strokeStyle = INK; x.lineWidth = 3;
    [[80, ty, 1, 1], [W - 80, ty, -1, 1], [80, ty + bh, 1, -1], [W - 80, ty + bh, -1, -1]].forEach(function (k) { x.beginPath(); x.moveTo(k[0], k[1] + 28 * k[3]); x.lineTo(k[0], k[1]); x.lineTo(k[0] + 28 * k[2], k[1]); x.stroke(); });
    x.fillStyle = INK; var ey = ty + 64; ex.forEach(function (l) { x.fillText(l, 110, ey); ey += 54; });
    x.font = "44px " + HF; var cy = ty + bh + 100; wrapLines(x, changeLine(p), W - 160, 3).forEach(function (l) { x.fillText(l, 80, cy); cy += 62; });
    x.font = "40px " + HF; x.fillText("这一步虽小，对我来说确实是大突破", 80, H - 170);
    x.globalAlpha = .7; x.font = "400 28px " + F; x.fillText(fmtDay(p.landedAt), 80, H - 90); var rp = "github.com/huangchenyun25-web/lingcun"; x.fillText(rp, W - 80 - x.measureText(rp).width, H - 90); x.globalAlpha = 1;
    return c;
  }
  function downloadBlob(name, blob) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast("已保存：" + name); }
  function shareText(p) { var pl = planetOf(p.planet); return "我在另存人生完成了第 " + (p.planet + 1) + " 次登陆（" + pl.n + "）" + (p.cat === "create" ? "：「" : "，做出了「") + (p.title || CATS[p.cat].name) + "」。" + (p.change && p.change.trim() ? p.change.trim() + "。" : "") + " " + REPO_URL; }
  function land(p) {
    var why = canLand(p); if (why) { var er = $("lc-err"); if (er) er.textContent = why; return false; }
    var first = !p.landed; p.saved = true; p.savedAt = Date.now();
    if (first) { p.landed = true; p.landedAt = Date.now(); p.planet = nextPlanet(); bump("completed"); }
    ui.justLanded = p.id; save(); renderSave(); appendAsk("save"); renderSummaries();
    try { window.scrollTo(0, 0); } catch (e) {}
    return true;
  }
  ui.seen = {};
  /* 第 6 屏「是你认可的这一版？」：按住确认，刻度环走满就登月；松手可反悔。确认的话就写在环下面，不再让人一项一项勾 */
  function ringSvg() {
    var N = 72, R1 = 104, R2 = 114, c = 125, t = "";
    for (var k = 0; k < N; k++) { var a = 2 * Math.PI * k / N, r2 = k % 6 === 0 ? R2 : R2 - 4; t += '<line x1="' + (c + R1 * Math.sin(a)).toFixed(2) + '" y1="' + (c - R1 * Math.cos(a)).toFixed(2) + '" x2="' + (c + r2 * Math.sin(a)).toFixed(2) + '" y2="' + (c - r2 * Math.cos(a)).toFixed(2) + '"/>'; }
    return '<svg class="ring" id="lc-ring" viewBox="0 0 250 250" aria-hidden="true"><circle class="base" cx="125" cy="125" r="96"/><circle class="arc" id="lc-arc" cx="125" cy="125" r="96" transform="rotate(-90 125 125)" style="stroke-dasharray:603.2;stroke-dashoffset:603.2"/>' + t + "</svg>";
  }
  function renderSave() {
    var p = curP(), B = $("b-save"), c = CATS[p.cat], h = "";
    if (!p.saved) {
      var k = confirmKind(p), items = confirmItems(p), wc = writtenCount(p), outline = p.cat === "novel" && p.out && p.out.logline !== undefined, block = !p.out || (outline && !wc);
      h = '<div class="confirm" id="lc-box"><div class="ringwrap"><div class="brk brkbox" aria-hidden="true">' + bk() + "</div>" + ringSvg() + '<button id="lc-go"' + (block ? " disabled" : "") + ">按住确认</button></div>" +
        '<div class="holdhint" id="lc-holdhint">' + (RM ? "点一下就确认" : "松手可反悔") + '</div><div class="holdsay" id="lc-say">' + (RM ? "确认" : "按住") + "就表示：" + esc(items.join("；")) + "。</div>" +
        (k === "tool" ? '<div class="holdsay" id="lc-tried">' + esc(triedHtml(p)) + "</div>" : "") +
        (outline ? '<div class="holdsay">' + (wc ? "这一局带走：故事结构＋写好的 " + wc + " 段。" : "先展开第一段，再来确认。") + "</div>" : "") +
        '<div class="err" id="lc-err"></div>' +
        '<div class="choices cfs" aria-hidden="true">' + items.map(function (t, i) { return '<label class="choice cf"><input type="checkbox" tabindex="-1" data-cf="' + i + '"' + (p.confirm[i] ? " checked" : "") + " /><span>" + esc(t) + "</span></label>"; }).join("") + "</div>" +
        '<details class="more" id="lc-more"><summary>更多</summary>' +
        '<label class="field"><span class="t">一句话：这一局给你带来的变化（可选，会写在完成卡上）</span><input type="text" id="lc-change" maxlength="60" placeholder="用你自己的话写一句；不写也行" value="' + esc(p.change || "") + '" /></label>' +
        '<div class="chips">' + (CHANGE_SUG[k] || []).map(function (x) { return '<button data-sug="' + esc(x) + '">' + esc(x) + "</button>"; }).join("") + "</div>" +
        (p.out ? '<details id="lc-look"><summary>再看一眼这一版</summary>' + previewTag("lc-prev") + "</details>" : "") +
        '<div class="row"><button class="ghost small" id="sv-dl">下载 .html</button></div></details>' +
        '<button class="ghost small back" id="lc-back">回去再改</button></div>';
      B.innerHTML = h;
      if ($("lc-look")) $("lc-look").ontoggle = function () { if (this.open && !$("lc-prev").srcdoc) setPreview("lc-prev", renderOut(p, false)); };
      B.querySelectorAll("[data-cf]").forEach(function (x) { x.onchange = function () { p.confirm[+x.getAttribute("data-cf")] = x.checked; save(); $("lc-err").textContent = ""; }; });
      $("lc-change").oninput = function () { p.change = this.value.slice(0, 60); save(); };
      B.querySelectorAll("[data-sug]").forEach(function (b) { b.onclick = function () { $("lc-change").value = b.getAttribute("data-sug"); p.change = $("lc-change").value; save(); }; });
      /* 按住（或键盘确认）这一下，就是对上面那句话的确认 */
      $("lc-go").onclick = function () { if (!block) items.forEach(function (x, i) { p.confirm[i] = true; }); land(p); };
      $("lc-back").onclick = function () { go("check"); };
      $("sv-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
      if (block) $("lc-err").textContent = canLand(p);
      return;
    }
    var pl = planetOf(p.planet), just = ui.justLanded === p.id; ui.justLanded = 0;
    if (just) ui.view[p.id] = "land";
    var view = ui.view[p.id] || "map", zoom = ui.zoom === p.id && !RM; ui.zoom = 0;
    if (view === "land") {
      h = landScene(p, pl, just && !RM);
      B.innerHTML = h;
      var toMap = function () { ui.view[p.id] = "map"; ui.zoom = p.id; renderSave(); appendAsk("save"); try { window.scrollTo(0, 0); } catch (e) {} };
      $("land").onclick = toMap; $("land").onkeydown = function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toMap(); } };
      if (!ui.seen[p.id]) { ui.seen[p.id] = 1; bump("card_seen"); bump("star_seen"); }
      return;
    }
    h = mapHtml(p, zoom) +
      '<div class="okbox sr" id="lc-done">' + (p.cat === "create" ? "「" + esc(p.title || c.name) + "」。" : "你做出了「" + esc(p.title || c.name) + "」，这是你亲手完成、自己确认过的一件东西。") + (p.planet === 0 ? "这是你登上的第一颗星球：月球。" : "星图上点亮了一颗新星球：" + esc(pl.n) + "。") + "</div>" +
      '<div class="hidden" id="share-box">' + shareCardHtml(p, pl) +
      '<div class="row" style="justify-content:center"><button class="small" id="sc-png">保存成图片</button><button class="sec2 small" id="sc-share">分享文字</button></div><div id="sc-out"></div>' +
      '<details id="sc-edit"><summary>改一下卡片上的那句话</summary><input type="text" id="sc-change-in" maxlength="60" value="' + esc(p.change || "") + '" placeholder="不写就显示「我做出了一件属于自己的东西。」" /></details></div>' +
      '<details class="more mapmore" id="map-more"><summary>更多</summary><div class="big" id="sv-next">' +
      '<button class="bigbtn" id="nx-edit"><strong>回去再改</strong><small>改完再确认一次。</small></button>' +
      '<button class="bigbtn" id="nx-dl"><strong>下载作品</strong><small>' + esc(fileName(p)) + "，双击就能打开。</small></button>" +
      '<button class="bigbtn" id="nx-more"><strong>换材料再做 / 做一件新的</strong><small>你来定。</small></button>' +
      '<button class="bigbtn" id="nx-pause"><strong>今天先到这儿</strong><small>同一个浏览器再打开这一页，就能接上。</small></button>' +
      '<button class="bigbtn" id="nx-home"><strong>回到首页</strong></button></div><div id="sv-out"></div>' +
      '<div class="row"><button class="ghost small" id="land-replay">再看一次登月</button></div>' + publishHtml(p) +
      '<p class="hint" id="star-note">GitHub 按钮会在新标签页打开项目主页，要在那里点一下「Star」才算数。</p></details>' +
      '<div class="dock"><a class="out starlink" id="star-go" href="' + REPO_URL + '" target="_blank" rel="noopener noreferrer">' + STAR_SVG + 'GitHub</a><button class="main" id="sc-open">分享</button></div>';
    B.innerHTML = h;
    if (!ui.seen[p.id]) { ui.seen[p.id] = 1; bump("card_seen"); bump("star_seen"); }
    $("land-replay").onclick = function () { ui.view[p.id] = "land"; ui.justLanded = p.id; renderSave(); appendAsk("save"); try { window.scrollTo(0, 0); } catch (e) {} if (RM) toast("你开了「减少动画」，这里只显示落好的样子"); };
    $("sc-open").onclick = function () { var sb = $("share-box"); sb.classList.toggle("hidden"); if (!sb.classList.contains("hidden")) try { sb.scrollIntoView({ behavior: smooth(), block: "start" }); } catch (e) {} };
    $("sc-png").onclick = function () { var cv = cardCanvas(p), nm = "另存人生_登陆卡_" + String(p.title || "作品").replace(/[\\\/:*?"<>|\s「」]+/g, "_").slice(0, 20) + ".png"; bump("shared"); if (cv.toBlob) cv.toBlob(function (b) { downloadBlob(nm, b); }, "image/png"); };
    $("sc-share").onclick = function () {
      var t = shareText(p); bump("shared");
      var fall = function () { $("sc-out").innerHTML = '<label class="field" style="margin-top:8px"><span class="h">复制下面这段话，发给朋友或贴到社交平台：</span><textarea id="sc-text" rows="3" readonly>' + esc(t) + "</textarea></label>"; var ta = $("sc-text"); try { ta.focus(); ta.select(); } catch (e) {} };
      if (navigator.share) { navigator.share({ title: "另存人生", text: t }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("分享文字已复制"); fall(); }, fall); else fall();
    };
    $("sc-change-in").oninput = function () { p.change = this.value.slice(0, 60); save(); $("sc-change").textContent = changeLine(p); };
    $("star-go").onclick = function () { bump("star_clicked"); };
    $("nx-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
    $("nx-edit").onclick = function () { go("check"); };
    $("nx-more").onclick = function () { go("again"); };
    $("nx-home").onclick = function () { S.cur = -1; ui.pickStep = "home"; go("pick"); };
    $("nx-pause").onclick = function () { p.paused = true; save(); $("sv-out").innerHTML = '<div class="okbox">好，今天就到这儿。下次用这台设备的这个浏览器打开这一页，会看到「上次做到这里」。换电脑的话，先在菜单「换设备带走进度」里下载进度文件。</div>'; toast("进度已留好"); };
    if ($("gh-dl")) bindPublish(p);
  }

  /* ---------- ⑥ 换材料再做 / 继续完善 ---------- */
  function renderAgain() {
    var p = curP(), B = $("b-again"), c = CATS[p.cat];
    var keepNames = c.keep.map(function (id) { var f = fieldById(p, id); return f && answered(p, f) ? f.t.replace(/[（(].*$/, "").replace(/[？?]$/, "") + "＝" + vText(p, id) : ""; }).filter(Boolean);
    var gaps = matchGaps();
    var h = '<div class="big">' +
      '<button class="bigbtn" id="ag-swap"><strong>换一份材料再做一份（' + esc(c.name) + "）</strong><small>" + (keepNames.length ? "保留你的设置：" + esc(keepNames.join("；")) + "。只问换了的材料。" : "同一类，从材料开始，只问还缺的。") + "登陆后点亮一颗新星球。</small></button>" +
      '<button class="bigbtn" id="ag-polish"><strong>继续完善这一件</strong><small>回到「检查与修改」。</small></button>' +
      '<button class="bigbtn" id="ag-other"><strong>做一件新的</strong><small>换个主题。</small></button>' +
      (p.cat === "exp" || p.cat === "resume" ? '<button class="bigbtn" id="ag-match"><strong>可选：能力对照</strong><small>看看这段经历和哪个方向较贴合。不是必经的一步。</small></button>' : "") + "</div>";
    if (gaps.length) h += '<div class="qt">能力对照里还没看到相关经历的几项，点一下就开始补</div><div class="big">' + gaps.map(function (g, i) { return '<button class="bigbtn" data-gap="' + i + '"><strong>补上「' + esc(g.ax.name) + "」</strong><small>" + esc(CATS[g.cat].name) + "：" + esc(g.idea) + "</small></button>"; }).join("") + "</div>";
    h += '<div class="row"><button class="ghost small" id="ag-bag">打开星图：看登陆过的星球和航行中的</button></div>';
    B.innerHTML = h;
    $("ag-swap").onclick = function () {
      newFromSettings(p);
    };
    $("ag-polish").onclick = function () { go("check"); };
    $("ag-other").onclick = function () { S.cur = -1; go("pick"); };
    $("ag-bag").onclick = function () { openBag(); };
    if ($("ag-match")) $("ag-match").onclick = function () { openMatch(); };
    B.querySelectorAll("[data-gap]").forEach(function (b) { b.onclick = function () { var g = gaps[+b.getAttribute("data-gap")]; S.entry.small = false; startProject(g.cat, g.idea, g.pre); }; });
  }

  /* 沿用设置做一件新的：原作原样保留，新的一件只带「换材料再做」时保留的那些设置 */
  function newFromSettings(p) {
    var c = CATS[p.cat], np = newProject(p.cat, p.idea); c.keep.forEach(function (id) { if (p.a[id]) np.a[id] = clone(p.a[id]); }); np.theme = p.theme;
    np.runs = (p.runs || 1) + 1; np.small = p.small; np.from = p.id; np.title = (p.title || c.name).replace(/（第 \d+ 份）$/, "") + "（第 " + np.runs + " 份）";
    S.projects.push(np); S.cur = S.projects.length - 1; bump("started"); go("material");
  }
