  /* ================= v0.0.14（#41 #42 #43）：库打底、API 润色。
     第一步库（library/first_step_lib_v1.json）整份嵌在页面里：三大类各一套固定四问、每个常见目标的选项 / 路线 / 第一步 / 摘星标准。
     页面只靠库就能走完一局；AI 可用时只把文字改得更贴原话（一局最多 3 次：选项、路线、第一步），等不到就原样用库 ================= */
  var LIB = (function () { try { return JSON.parse($("lc-lib").textContent); } catch (e) { return null; } })();
  var LIB_BY = {}; (LIB ? LIB.entries : []).forEach(function (e) { LIB_BY[e.id] = e; });
  var LIB_CAT = { create: "创造", learn: "学习技能", career: "转行" };
  var LIB_SHORT = { "创造": "创造", "学习技能": "学习", "转行": "转行" };
  var LQ = ["l_q1", "l_q2", "l_q3", "l_q4"];
  var IDEA_Q = { "创造": ["想做个什么？", "例：我想做一个游戏"], "学习技能": ["想学什么？", "例：零基础学日语"], "转行": ["想转去做什么？", "例：想转行做产品经理"] };
  var CAREER_RE = /转行|转去|转岗|跳槽|换工作|换行业|换个(行业|工作|岗位|方向)/;
  CATS.create.fields = [F("c_idea", "text", "想做个什么？", null, { must: true, ph: "例：我想做一个游戏" })].concat(LQ.map(function (id) { return F(id, "one", "", [], { dyn: true }); }));
  CATS.create.keep = [];
  CATS.create.kw = /游戏|桌游|玩法|关卡|点子|创意|发明/;
  CATS.create.one = "一个游戏、一场活动、一门要学的技能或一个想去的方向：四张卡片，拿到今天能做的第一步";
  CATS.create.factRule = "这是构思和第一步，不是成品：只在第一步库给的内容上，按用户原话把文字改得更贴切；不改问题、不增减维度、不换掉第一步的动作本身。不写价格数字，不写「保证做成」这类承诺。时间都是粗估，按一个新手、业余时间来估；身体类（跑步、健身、游泳等）按初学者强度，不加量。";
  CLAR_LABEL.create = "创造 / 学习 / 转行（四张卡，拿到第一步）";

  /* ---------- 本地匹配：先在所选大类内按原话匹配；单字关键词去掉常见误伤的词再判（「思考」不算「考」） ---------- */
  var KW_NEG = { "考": ["思考", "参考", "考虑", "考察", "考量", "考究"], "学": ["同学", "学校", "学生", "学院", "大学", "科学", "哲学", "放学", "上学"], "练": ["熟练", "老练", "干练", "简练"],
    "开": ["开心", "开始", "打开", "公开", "离开", "开会", "开玩笑", "开车", "开门", "开着", "开朗"], "建": ["建议"], "拍": ["节拍", "拍档"], "办": ["办法", "办公", "怎么办"], "做": ["做梦"],
    "搞": ["搞不懂", "搞不清", "搞砸"], "歌": ["歌德"], "课": ["功课"], "宏": ["宏大", "宏观", "宏伟"], "画": ["计画"] };
  function kwHit(t, k) {
    t = String(t || ""); if (!k) return false;
    if (/^[\x00-\x7f]+$/.test(k)) return new RegExp("(^|[^A-Za-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^A-Za-z0-9])", "i").test(t);
    if (k.length === 1) (KW_NEG[k] || []).forEach(function (w) { t = t.split(w).join("　"); });
    return t.indexOf(k) >= 0;
  }
  function catOf(t) {
    if (!LIB) return "创造";
    var H = LIB.matching.category_hints, order = ["转行", "学习技能", "创造"];
    for (var i = 0; i < order.length; i++) if (H[order[i]].some(function (k) { return kwHit(t, k); })) return order[i];
    return "创造";
  }
  function matchEntry(t, cat, strict, noBorrow) {
    var best = null, fb = null;
    (LIB ? LIB.entries : []).forEach(function (e) {
      if (e.category !== cat) return; if (e.fallback) { fb = e; return; } if (noBorrow && e.borrowable === false) return;
      var ks = e.keywords.filter(function (k) { return kwHit(t, k); }); if (!ks.length) return;
      var key = [e.priority, Math.max.apply(null, ks.map(function (k) { return k.length; }))];
      if (!best || key[0] > best.k[0] || (key[0] === best.k[0] && key[1] > best.k[1])) best = { k: key, e: e };
    });
    return best ? best.e : strict ? null : fb;
  }
  function libMatch(text, act) {
    var t = String(text || ""), lc = LIB_CAT[act] || (t.trim() ? catOf(t) : "创造");
    if (lc !== "转行" && CAREER_RE.test(t)) lc = "转行"; /* 「转去做X」算转行 */
    var e = matchEntry(t, lc), borrow = "";
    /* v0.0.15（#47）：所选大类里只落到兜底时，再去另外两类严格匹配；命中现实类条目，或那一类的提示词也在原话里，就改过去（不会改进创造）。「学编舞」选了创造也走学习 · 编舞 */
    if (e && e.fallback) {
      ["学习技能", "转行"].some(function (c) {
        if (c === lc) return false; var x = matchEntry(t, c, true);
        if (x && (x.mode === "real" || LIB.matching.category_hints[c].some(function (k) { return kwHit(t, k); }))) { lc = c; e = x; return true; }
        return false;
      });
    }
    /* 「学做X」留在学习，学习库里没有对应条目时，借创造库对应条目的第一步和路线；程序 / 自动化 / 网站不借（#47） */
    if (lc === "学习技能" && e && e.fallback) { var c = matchEntry(t, "创造", true, true); if (c) borrow = c.id; }
    return { lc: lc, id: e ? e.id : "", borrow: borrow };
  }
  function libAssign(p, idea, act) {
    if (act !== undefined) p.lact = act || "";
    var m = libMatch(idea, p.lact); p.lc = m.lc; p.lib = m.id; p.borrow = m.borrow; p.libFor = String(idea || "").trim(); p.lopts = null; p.loptsFor = "";
  }
  function libCat(p) { if (!p.lc || !LIB || !LIB.skeletons[p.lc]) libAssign(p, p.idea, p.theme === "learn" || p.theme === "career" ? p.theme : ""); return p.lc; }
  function libName(p) { return LIB_SHORT[libCat(p)] || "创造"; }
  function entryOf(p) { libCat(p); return LIB_BY[p.lib] || LIB.entries.filter(function (e) { return e.category === p.lc && e.fallback; })[0]; }
  function srcOf(p) { return p.borrow && LIB_BY[p.borrow] ? LIB_BY[p.borrow] : entryOf(p); }
  function anyQ(p) { return LQ.some(function (id) { return qAnswered(p.a[id]); }); }
  function totalParts(p, total) { var v = String(total || "").replace(/[（(][^）)]*[）)]/g, "").trim(), lc = p ? libCat(p) : ""; return { lbl: lc === "学习技能" ? "第一阶段" : lc === "转行" ? "准备期" : "合计", val: v }; }
  function totalLabel(p, total) { var t = totalParts(p, total); return t.lbl === "合计" ? t.val : t.lbl + " " + t.val; }

  /* ---------- 四张卡：问题、维度标签、选项都来自库；AI 润色过的选项只替换文字，个数和顺序不变 ---------- */
  function createField(p, f) {
    if (!f || p.cat !== "create" || !LIB) return f;
    var o = {}, k; for (k in f) o[k] = f[k];
    var lc = libCat(p);
    if (f.id === "c_idea") { o.t = IDEA_Q[lc][0]; o.ph = IDEA_Q[lc][1]; return o; }
    var qi = LQ.indexOf(f.id); if (qi < 0) return o;
    var sk = skQ(p, qi), e = entryOf(p), lo = optList(p, sk), pol = sk.fixed_options || isReal(e) && sk.id === "q4" ? null : p.lopts && p.lopts[sk.id];
    o.t = sk.question; o.lbl = sk.dimension; o.short = sk.short;
    o.o = lo.map(function (x, i) { return pol && pol[i] && !x.swapped ? pol[i] : x.text; });
    o.refs = lo.map(function (x) { return x.ref || ""; }); if (!o.refs.some(Boolean)) delete o.refs;
    o.vars = lo.map(function (x) { return x.variant || ""; });
    return o;
  }
  function createSet(p) { var o = { 想做的: createIdea(p), 大类: libName(p) }; LQ.forEach(function (id) { var f = fieldById(p, id); o[f.lbl] = vText(p, id); }); return o; }
  function ans(p, id) { var v = vText(p, id); return v && v !== PEND ? String(v) : ""; }
  function variantOf(p) {
    if (p.borrow) return null;
    var e = entryOf(p), a = p.a.l_q2; if (isReal(e)) return null; if (!e.variants || !a || a.skip || typeof a.i !== "number") return null;
    var vid = ((e.options.q2 || [])[a.i] || {}).variant; if (!vid) return null;
    return e.variants.filter(function (v) { return v.id === vid; })[0] || null;
  }
  function localStep(p) {
    var e = entryOf(p), s = srcOf(p), v = variantOf(p), fs = s.first_step, tags = s.first_step_tags || [], star = s.star;
    if (v) { fs = v.first_step || fs; tags = v.first_step_tags || tags; star = v.star || star; }
    if (s.first_step_by_q4) { var a = p.a.l_q4; if (a && typeof a.i === "number" && !a.skip) { var t0 = (optList(p, skQ(p, 3))[a.i] || {}).text; if (t0 && s.first_step_by_q4[t0]) fs = s.first_step_by_q4[t0]; } }
    /* v0.0.15（#45）：③ 今天能拿出多久 → 有 by_time 的按时长换一步 */
    var bt = s.by_time && s.by_time[String(todayMin(p))]; if (bt && !isReal(e)) { fs = bt.first_step || fs; tags = bt.first_step_tags || tags; star = bt.star || star; }
    var idea = createIdea(p), rs = isReal(e) ? realStep(p) : null, real = null;
    /* v0.0.15（#46）：现实类条目的第一步 = ④ 选中的现实动作（没答就用第一条） */
    if (rs) { fs = rs.first_step; tags = rs.first_step_tags || tags; star = rs.star || star; real = { text: rs.text, kind: rs.kind, min: rs.min, done: rs.done, commit_q: rs.commit_q, pick: rs.pick || null, place_ph: e.real.place_ph || "" }; }
    return { title: idea !== PEND ? short(idea, 16) : e.title, first_step: fs, time: tags[0] || "", tags: tags.slice(1), star: star, lib: s.id, variant: v ? v.id : "", src: "lib", real: real };
  }
  function libRoute(p) { return srcOf(p).route.map(function (r) { return { step: r.phase, tool: r.tool, time: r.duration }; }); }
  function libGoal(p) {
    var lc = libCat(p), e = entryOf(p), q1 = ans(p, "l_q1"), q2 = ans(p, "l_q2"), q3 = ans(p, "l_q3"), idea = createIdea(p), w = q2.split(/\s*·\s*/);
    var base = idea !== PEND ? short(idea, 22) : e.title;
    if (lc === "学习技能") return (e.fallback ? base : e.title) + (q1 ? "：" + q1 : "") + (q2 ? "（" + w[0] + "）" : "");
    if (lc === "转行") return (q1 ? "转去做" + q1.replace(/^(转去做|转做|去做)/, "").replace(/^(?=[A-Za-z0-9])/, " ") : base) + (q2 ? "，" + (/^完全|没想清楚|还没/.test(w[0]) ? "从零开始" : "带着" + w[0]) : "");
    return (q3 ? q3 + "：" : base + "：") + (q1 || e.title) + (q2 ? "，让" + w[0] + (w[1] || "") : "");
  }
  function libHelp(p) {
    var lc = libCat(p), q4 = ans(p, "l_q4");
    if (lc === "学习技能") return "帮我把「" + (q4 || "第一个小关卡") + "」拆成今天能做的一步";
    if (lc === "转行") return "帮我想清楚「" + (q4 || "第一份证明") + "」怎么做";
    return "帮我把「" + (q4 || "第一个草样") + "」想清楚";
  }
  function localPlan(p) { return { goal: libGoal(p), route: libRoute(p), total: srcOf(p).total, help: libHelp(p), src: "lib" }; }
  function planSig(p) { return JSON.stringify([createSet(p), p.lib, p.borrow]); }
  function needPlan(p) { return p.cat === "create" && (!p.plan || p.plan.sig !== planSig(p)); }

  /* ---------- AI 润色：一局最多 3 次（选项、路线、第一步）；等不到、失败、格式不对都原样用库 ---------- */
  var OPT_WAIT = 6000, PLAN_WAIT = 8000, STEP_WAIT = 9000, AI_MAX = 3;
  var NO_PRICE = /[¥￥$]|\d+(\.\d+)?\s*(元|块钱|块|美元|rmb)/i;
  function aiCan(p, kind) { p.aiDone = p.aiDone || {}; return !!AI.mode() && !p.aiDone[kind] && (p.aiN || 0) < AI_MAX; }
  function aiMark(p, kind) { p.aiDone = p.aiDone || {}; p.aiDone[kind] = 1; p.aiN = (p.aiN || 0) + 1; }
  function bgRun(task, ms, cb) {
    var done = false, slot = document.createElement("div");
    if (!AI.mode()) { cb(null); return; }
    task.plain = true; task.noRepair = true;
    task.onFail = function () { if (!done) { done = true; clearTimeout(t); cb(null); } }; /* 连不上、额度用完、格式不对：马上用库 */
    var t = setTimeout(function () { if (!done) { done = true; AI.drop(task.key); cb(null); } }, ms);
    AI.run(task, slot).then(function (o) { if (done) return; done = true; clearTimeout(t); cb(o); });
  }
  var L_ARR = { type: "array", minItems: 1, maxItems: 6, items: STR(30) };
  var L_OPTS = { type: "object", required: ["q1", "q2", "q3", "q4"], properties: { q1: L_ARR, q2: L_ARR, q3: L_ARR, q4: L_ARR } };
  var L_PLAN = { type: "object", required: ["goal", "tools", "help"], properties: { goal: STR(60), tools: { type: "array", minItems: 5, maxItems: 5, items: STR(24) }, help: STR(40) } };
  var L_STEP = { type: "object", required: ["title", "first_step"], properties: { title: STR(24), first_step: STR(70) } };
  var ROLE = "陪人把一件事想清楚的搭档";
  function taskLibOpts(p) {
    var lc = libCat(p), e = entryOf(p), cards = LIB.skeletons[lc].questions.map(function (q, i) { q = skQ(p, i); return { id: q.id, question: q.question, options: optList(p, q, true).map(function (x) { return x.text; }) }; });
    return T(p, "lib_options", "把选项改得更贴你的话", ROLE, [
      "cards 是四张固定的问题卡，每张有几个现成选项（options）。按 user_idea 把每个选项改写得更贴用户的原话和处境。",
      "只改文字，不改意思：每张卡的选项个数和顺序都不变，第 n 个改写后仍对应原来的第 n 个；不新增、不删除、不合并，不改问题。",
      "原选项里有「 · 」的，保留「前半 · 后半」的格式（例如「对象 · 得到什么」「起点 · 现在的状态」）。",
      "每个选项 4–20 个字。不写价格数字，不写「保证」「一定做成」这类承诺。",
      "输出 {\"q1\": [...], \"q2\": [...], \"q3\": [...], \"q4\": [...]}，每个数组的长度和 cards 里对应卡片的 options 一样。"],
      { category: lc, goal: e.title, cards: cards }, L_OPTS, { key: "lib_options:" + p.id });
  }
  function taskLibPlan(p, req) {
    var pl = localPlan(p);
    return T(p, "lib_plan", "把路线写得更贴你的话", ROLE, [
      "draft 是第一步库按用户的回答排好的目标、五段路线和「希望它帮你做什么」。只把文字改得更贴 settings 和 user_idea。",
      "goal：一句细化后的目标（30 字以内），讲清做的是什么、给谁、想让什么发生。",
      "tools：和 draft.route 一一对应的 5 项，每项写这一段用什么工具或材料（具体的名字，12 个字以内）。阶段名和时长不用写、也不会改。",
      "help：用户的口吻写一句「帮我……」（20 字以内）。",
      req ? "request 是用户想怎么改，按它改 goal / tools / help；阶段和时长仍不变。" : "不写价格数字，不承诺做成。"],
      { settings: createSet(p), draft: { goal: pl.goal, route: pl.route, help: pl.help }, request: req || undefined }, L_PLAN, { key: "lib_plan:" + p.id });
  }
  function taskStep(p, req) {
    var st = p.out && p.out.first_step ? { first_step: p.out.first_step, title: p.out.title } : localStep(p);
    return T(p, "lib_step", "把第一步写得更贴你的话", ROLE, [
      "library_step 是第一步库给的第一步：一次坐下来能做完（约 15–60 分钟）的具体动作。把它改写得更贴 settings 和 user_idea。",
      "动作本身、分量和里面的具体内容（字母、假名、数字、书名）都不变，不加量；动词开头，一句话，40 字以内。",
      "settings 里如果有「今天能拿出多久」，第一步要在这段时间里做得完：只许缩小，不许加量；不写之后几周的安排。",
      "title：给这件事起一个 2–10 个字的暂定名。",
      req ? "request 是用户想怎么改这一步，在不加量的前提下照它改。" : "不写价格数字，不承诺做成。"],
      { settings: createSet(p), plan: createPlanIn(p), library_step: { first_step: st.first_step, star: (p.out && p.out.star) || localStep(p).star }, request: req || undefined }, L_STEP, { key: "lib_step:" + p.id });
  }
  function sameLen(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length; }
  function cleanOpts(p, o) {
    var lc = libCat(p), e = entryOf(p), r = {};
    LIB.skeletons[lc].questions.forEach(function (q, i) {
      q = skQ(p, i); var lo = optList(p, q, true).map(function (x) { return x.text; }), po = o && o[q.id], id = LQ[i];
      if (q.fixed_options || (isReal(e) && q.id === "q4")) { r[q.id] = lo; return; } /* v0.0.15：③ 时长和现实动作不润色 */
      if (qAnswered(p.a[id]) || !sameLen(lo, po)) { r[q.id] = (p.lopts && p.lopts[q.id]) || lo; return; }
      r[q.id] = po.map(function (x, j) { x = String(x || "").trim(); var dot = / · /.test(lo[j]); return !x || x.length > 24 || NO_PRICE.test(x) || (dot && !/·/.test(x)) ? lo[j] : x.replace(/\s*·\s*/, " · "); });
    });
    return r;
  }
  function keepsSpecial(a, b) { var re = /[\u3040-\u30ff\u3130-\u318f\uac00-\ud7af]+|\d+/g, m = String(a).match(re) || []; return m.every(function (x) { return String(b).indexOf(x) >= 0; }); }
  /* ① 选项：一开局就用库里的；润色到了再换掉还没答的卡 */
  function createConcepts(p) {
    if (p.cat !== "create" || !LIB) return;
    var idea = createIdea(p); if (idea === PEND) return;
    if (p.libFor !== idea && !anyQ(p)) { libAssign(p, idea); save(); }
    if (p.loptsFor === idea || !aiCan(p, "opts")) return;
    p.loptsFor = idea; aiMark(p, "opts");
    bgRun(taskLibOpts(p), OPT_WAIT, function (o) { if (!o) return; p.lopts = cleanOpts(p, o); save(); var dd = $("deck-done"); if (onMat(p) && !(dd && dd.classList.contains("cur"))) reMat(); });
  }
  /* ② 路线：材料齐了就先摆出库里的；润色到了只换目标、工具和「帮你做什么」，阶段和时长不动 */
  function createPlan(p, req) {
    var sig = planSig(p);
    if (!req) { p.plan = localPlan(p); p.plan.sig = sig; save(); }
    if (req ? !AI.mode() : !aiCan(p, "plan")) { if (req) toast("现在连不上 AI，可以直接改目标和「帮你做什么」"); if (req && p.plan) { p.plan.sig = sig; save(); } return; }
    if (!req) aiMark(p, "plan");
    ui.pwait = ui.pwait || {}; ui.pwait[p.id] = 1;
    bgRun(taskLibPlan(p, req), PLAN_WAIT, function (o) {
      delete ui.pwait[p.id];
      if (o && p.plan) {
        var pl = p.plan;
        if (o.goal && !NO_PRICE.test(o.goal)) pl.goal = o.goal;
        if (o.help && !NO_PRICE.test(o.help)) pl.help = o.help;
        if (sameLen(o.tools, pl.route)) pl.route.forEach(function (r, i) { var t = String(o.tools[i] || "").trim(); if (t && t.length <= 20 && !NO_PRICE.test(t)) r.tool = t; });
        pl.src = "ai";
      }
      if (p.plan) p.plan.sig = sig; save();
      if (onMat(p)) drawDone(p);
    });
  }
  /* ③ 第一步：先拿库里的版本，等润色最多 9 秒 */
  function libDraft(p) {
    var B = $("b-draft"); ui.swait = ui.swait || {};
    B.innerHTML = '<div id="dr-slot"><div class="aibox" data-busy><div class="nebula" aria-hidden="true"><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i><i class="streaks"></i><span class="nship"><span class="nflame"></span></span></div><div class="busyt"><span class="dotpulse" aria-hidden="true"></span>正在成形…</div></div></div>';
    if (ui.swait[p.id]) return; ui.swait[p.id] = 1;
    if (needPlan(p)) createPlan(p);
    var loc = localStep(p), pl = p.plan || localPlan(p), t0 = now();
    var fin = function (o) {
      delete ui.swait[p.id]; if (p.out) return;
      var out = clone(loc); out.route = clone(pl.route); out.total = pl.total;
      if (o && o.first_step && o.first_step.length <= 70 && !NO_PRICE.test(o.first_step) && keepsSpecial(loc.first_step, o.first_step)) { out.first_step = o.first_step; out.src = "ai"; }
      if (o && o.title && !NO_PRICE.test(o.title)) out.title = o.title;
      setOut(p, out); save();
      if (S.stage === "draft" && curP() === p) { renderDraft(); appendAsk("draft"); }
    };
    if (aiCan(p, "step")) { aiMark(p, "step"); bgRun(taskStep(p), STEP_WAIT, fin); }
    else setTimeout(function () { fin(null); }, RM ? 0 : Math.max(0, 700 - (now() - t0)));
  }
  renderDraft = (function (orig) { return function () { var p = curP(); if (p && p.cat === "create" && !p.out && LIB) { libDraft(p); screenUpdate(); return; } orig.apply(this, arguments); }; })(renderDraft);
  createSync = (function (orig) { return function () { var p = curP(); if (p && p.cat === "create" && S.stage === "material" && p.libFor !== createIdea(p) && createIdea(p) !== PEND) createConcepts(p); orig.apply(this, arguments); }; })(createSync);

  /* 路线时间轴：合计的说法跟着大类走（学习 = 第一阶段，转行 = 准备期） */
  function axisHtml(r) {
    var cp = curP(), lc0 = cp && cp.cat === "create" ? libCat(cp) : "";
    if (lc0 === "学习技能" || lc0 === "转行") return '<div class="crline" id="cr-line">' + r.route.map(function (x) { return esc(x.step); }).join(" → ") + "</div>"; /* v0.0.15（#45）：路线只占一行 */
    var tp = totalParts(curP(), r.total);
    return '<ol class="craxis">' + r.route.map(function (x, i) { return '<li class="' + (i ? "" : "now") + '"><span class="pt" aria-hidden="true"></span><span class="st">' + esc(x.step) + '</span><span class="tl">' + esc(x.tool) + '</span><span class="tm">' + esc(x.time) + "</span></li>"; }).join("") + "</ol>" +
      (tp.val ? '<div class="sum"><span class="lbl">' + esc(tp.lbl) + "</span><span>" + esc(tp.val) + "</span></div>" : "");
  }
  /* 第一步页：第一步做主角（带摘星标准），下面是框架（发生 / 给谁 / 形式 / 草样，学习、转行用各自的短标签），路线收起 */
  function renderCreateCheck(p) {
    var B = $("b-check"), o = p.out, rt = routeOf(p), tp = totalParts(p, rt.total);
    var h = '<div class="lbl crk">第一步</div><div class="brk">' + bk() + '<div class="gl crstep" id="cr-step"><div class="hd" id="cr-first">' + esc(o.first_step) + '</div><div class="tags">' + [o.time].concat(o.tags || []).filter(Boolean).map(function (t) { return '<span class="gai">' + esc(t) + "</span>"; }).join("") + "</div>" +
      (o.star ? '<div class="crstar" id="cr-star"><span class="lbl">摘星</span><span>' + esc(o.real ? o.real.done : o.star) + "</span></div>" : "") + "</div></div>" +
      '<div class="gl crfw" id="cr-fw"><div class="lbl">框架</div>' + LQ.map(function (id) { var f = fieldById(p, id); return '<div class="fr"><span class="lbl">' + esc(f.short || f.lbl) + "</span><span>" + pt(vText(p, id)) + "</span></div>"; }).join("") + "</div>" +
      (rt.route.length && oneLine(p) ? '<div class="gl crlater crl1" id="cr-later"><span class="lbl">之后</span><span>' + rt.route.map(function (x) { return esc(x.step); }).join(" → ") + "</span></div>" : "") +
      (rt.route.length && !oneLine(p) ? '<details class="gl crlater" id="cr-later"><summary><span><span class="lbl">之后</span> ' + rt.route.length + " 段路线" + (tp.val ? " · " + esc(tp.lbl === "合计" ? tp.val : tp.lbl + " " + tp.val) : "") + "</span>" + CHEV + "</summary>" + axisHtml(rt) + "</details>" : "") +
      '<details class="more" id="ck-more"><summary>更多</summary>' + editBar(p, []) + '<div class="row"><button class="ghost small" id="ck-mat">回去补材料</button><button class="ghost small" id="ck-dl">下载 .html</button></div></details>' +
      '<div class="err" id="ck-err"></div><div class="dock"><button class="main" id="ck-next">就它了</button></div>';
    B.innerHTML = h;
    $("sn-req").placeholder = "想怎么改这一步？一句就好";
    $("sn-go").onclick = function () {
      var w = $("sn-req").value.trim(); if (!w) { $("sn-err").textContent = "写一句想怎么改。"; return; } $("sn-err").textContent = "";
      if (!AI.mode()) { $("sn-err").textContent = "现在连不上 AI。可以照库里这一步先做，或者回去换一个选项。"; return; }
      runTask(p, taskStep(p, w), $("sn-slot"), function (o2) { if (o2 && o2.first_step && !NO_PRICE.test(o2.first_step)) { p.out.first_step = o2.first_step; if (o2.title) p.out.title = o2.title; p.revs = (p.revs || 0) + 1; save(); } if (curP() === p && S.stage === "check") { renderCheck(); appendAsk("check"); } });
    };
    $("ck-mat").onclick = function () { go("material"); };
    $("ck-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
    $("ck-next").onclick = function () { if (!qAnswered(p.degree)) { p.degree = { skip: true }; save(); } go("save"); };
  }
  /* 测试用模拟（?ai=mock）：润色只在原文前后加一点，不改结构 */
  MOCK.lib_options = function (inp) { var o = {}; inp.cards.forEach(function (c) { o[c.id] = c.options.map(function (x) { return x; }); }); o.q1 = o.q1.map(function (x, i) { return i === 0 ? x + "（按你的话）" : x; }); return o; };
  MOCK.lib_plan = function (inp) { return { goal: inp.draft.goal, tools: inp.draft.route.map(function (r) { return r.tool; }), help: inp.draft.help }; };
  MOCK.lib_step = function (inp) { return { title: "第一步", first_step: inp.library_step.first_step + (inp.request ? "（按你说的改了）" : "") }; };

  /* ================= 语音入口（#42）：按住说话，最多约 30 秒，松手结束；转成文字后可改，可重听、重来 =================
     识别用浏览器自带的 Web Speech API（zh-CN），重听用 MediaRecorder 录下来的那一段；不支持识别时提示一句，换成打字 */
  var SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
  var VMAX = 30000, VNEAR = 5000, VMIN = 450, ORB = 2 * Math.PI * 98;
  var VZ = { st: "idle", text: "", url: "", t0: 0 };
  function voiceCan() { return !!SRC && !/[?&]voice=off\b/.test(location.search); }
  function voiceOn() { if (!voiceCan() && !ui.vnoted) { ui.vnoted = 1; ui.vnote = "这个浏览器还不能语音输入，先打字吧。"; } return voiceCan() && ui.vmode !== "type"; }
  var VZ_SVG = '<svg viewBox="0 0 220 220" width="220" height="220" aria-hidden="true" focusable="false"><defs><radialGradient id="vzg" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#F3F0F9" stop-opacity=".5"/><stop offset="1" stop-color="#F3F0F9" stop-opacity="0"/></radialGradient></defs>' +
    '<g class="vz-halo"><circle cx="110" cy="110" r="82" stroke-opacity=".3"/><circle cx="110" cy="110" r="93" stroke-opacity=".18"/></g>' +
    '<circle cx="110" cy="110" r="98" fill="none" stroke="#231C45" stroke-opacity=".26" stroke-width="1.2"/>' +
    '<circle id="vz-trail" cx="110" cy="110" r="98" fill="none" stroke="#C9B8F5" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round" transform="rotate(-90 110 110)" stroke-dasharray="' + ORB.toFixed(1) + '" stroke-dashoffset="' + ORB.toFixed(1) + '"/>' +
    '<g class="vz-planet"><circle class="vz-core" cx="110" cy="110" r="64" fill="#C9B8F5" fill-opacity=".3"/><circle cx="110" cy="110" r="64" fill="url(#vzg)"/><circle cx="110" cy="110" r="64" fill="none" stroke="#F3F0F9" stroke-opacity=".6" stroke-width="1.2"/>' +
    '<path d="M99 112q3.5-3 7 0" fill="none" stroke="#231C45" stroke-opacity=".42" stroke-width="1.6" stroke-linecap="round"/><path d="M114 112q3.5-3 7 0" fill="none" stroke="#231C45" stroke-opacity=".42" stroke-width="1.6" stroke-linecap="round"/></g>' +
    '<text class="vz-time" id="vz-time" x="110" y="134" text-anchor="middle">0:30</text>' +
    '<g id="vz-ball" transform="rotate(0 110 110)"><circle cx="110" cy="12" r="6" fill="#C9B8F5"/><circle cx="110" cy="12" r="6" fill="none" stroke="#231C45" stroke-opacity=".35" stroke-width="1"/></g></svg>';
  var VSAY = { idle: "按住，说说最近的事", rec: "在听了…", near: "快说完了", done: "" };
  function voiceHtml() {
    return '<div class="vz" id="vz" data-st="' + VZ.st + '">' +
      '<div class="vz-say" id="vz-say" aria-live="polite">' + esc(VSAY[VZ.st] || "") + "</div>" +
      '<div class="vz-card gl" id="vz-card"><textarea id="vz-text" rows="3" aria-label="转出来的文字，可以修改">' + esc(VZ.text) + '</textarea><span class="vz-ed">可修改</span></div>' +
      '<div class="vz-acts" id="vz-acts"><button class="sec2" id="vz-play">重听</button><button class="sec2" id="vz-redo">重来</button><button id="vz-ok">就这样</button></div>' +
      '<button class="vz-btn" id="vz-btn" aria-label="按住说话，松开结束，最多 30 秒">' + VZ_SVG + "</button>" +
      '<div class="vz-hint" id="vz-hint">松开结束</div>' +
      '<button class="vz-type" id="vz-type">打字</button></div>';
  }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function vPaint() {
    var z = $("vz"); if (!z) return;
    var el = VZ.st === "rec" || VZ.st === "near" ? now() - VZ.t0 : 0, k = VZ.st === "done" ? 1 : Math.min(1, el / VMAX);
    z.setAttribute("data-st", VZ.st);
    var sy = $("vz-say"); if (sy && sy.textContent !== VSAY[VZ.st]) sy.textContent = VSAY[VZ.st] || "";
    var tr = $("vz-trail"); if (tr) tr.setAttribute("stroke-dashoffset", (ORB * (1 - k)).toFixed(1));
    var bl = $("vz-ball"); if (bl) bl.setAttribute("transform", "rotate(" + (VZ.st === "done" ? 0 : 360 * k).toFixed(1) + " 110 110)");
    var tm = $("vz-time"); if (tm) tm.textContent = mmss(VMAX - el);
    var b = $("vz-btn"); if (b) b.setAttribute("aria-label", VZ.st === "done" ? "已经录好" : VZ.st === "idle" ? "按住说话，松开结束，最多 30 秒" : "正在听，松开结束，还剩 " + Math.ceil((VMAX - el) / 1000) + " 秒");
    if (VZ.st === "done") { var ta = $("vz-text"); if (ta && document.activeElement !== ta) ta.value = VZ.text; }
  }
  function vTranscript() { return ((VZ.acc || "") + (VZ.fin || "") + (VZ.itm || "")).replace(/\s+/g, " ").trim(); }
  function vRelease() {
    if (VZ.raf) cancelAnimationFrame(VZ.raf); VZ.raf = 0; if (VZ.lvRaf) cancelAnimationFrame(VZ.lvRaf); VZ.lvRaf = 0; clearTimeout(VZ.safe);
    try { if (VZ.mr && VZ.mr.state !== "inactive") VZ.mr.stop(); } catch (e) {}
    try { if (VZ.stream) VZ.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} VZ.stream = null;
    try { if (VZ.ac) VZ.ac.close(); } catch (e) {} VZ.ac = null;
  }
  function vReset() { var r = VZ.rec; VZ.rec = null; if (r) { r.onend = r.onresult = r.onerror = null; try { r.abort(); } catch (e) {} } vRelease(); VZ.st = "idle"; VZ.text = ""; VZ.acc = VZ.fin = VZ.itm = ""; VZ.err = ""; vPaint(); }
  function vFail(msg) { var t = vTranscript() || VZ.text; vReset(); ui.vmode = "type"; ui.vnote = msg; if (t) { S.entry.idea = t; save(); } renderPick(); try { $("pk-idea").focus({ preventScroll: true }); } catch (e) {} }
  function vTick() {
    if (VZ.st !== "rec" && VZ.st !== "near") return;
    var el = now() - VZ.t0;
    if (VZ.st === "rec" && VMAX - el <= VNEAR) { VZ.st = "near"; try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
    vPaint();
    if (el >= VMAX) { vStop(); return; }
    VZ.raf = requestAnimationFrame(vTick);
  }
  function vLevel(st) {
    var z = $("vz"), AC = window.AudioContext || window.webkitAudioContext; if (!z || !AC) return;
    try { var ac = new AC(), src = ac.createMediaStreamSource(st), an = ac.createAnalyser(); an.fftSize = 256; src.connect(an); VZ.ac = ac; var buf = new Uint8Array(an.fftSize); z.classList.remove("nolv");
      var loop = function () { if (VZ.st !== "rec" && VZ.st !== "near") return; an.getByteTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) { var d = (buf[i] - 128) / 128; s += d * d; } var lv = Math.min(1, Math.sqrt(s / buf.length) * 4); var zz = $("vz"); if (zz) zz.style.setProperty("--lv", (1 + lv * 0.12).toFixed(3)); VZ.lvRaf = requestAnimationFrame(loop); }; loop();
    } catch (e) {}
  }
  function vStart() {
    if (VZ.st !== "idle") return;
    if (!voiceCan()) { vFail("这个浏览器还不能语音输入，先打字吧。"); return; }
    if (VZ.url) { try { URL.revokeObjectURL(VZ.url); } catch (e) {} VZ.url = ""; }
    VZ.acc = VZ.fin = VZ.itm = ""; VZ.text = ""; VZ.err = ""; VZ.chunks = []; VZ.t0 = now(); VZ.st = "rec";
    var z = $("vz"); if (z) { z.classList.add("nolv"); z.style.setProperty("--lv", "1"); }
    var r; try { r = new SRC(); r.lang = "zh-CN"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1; } catch (e) { vFail("这个浏览器还不能语音输入，先打字吧。"); return; }
    r.onresult = function (ev) { var f = "", m = ""; for (var i = 0; i < ev.results.length; i++) { var x = ev.results[i]; if (x.isFinal) f += x[0].transcript; else m += x[0].transcript; } VZ.fin = f; VZ.itm = m; };
    r.onerror = function (ev) { VZ.err = (ev && ev.error) || "error"; };
    r.onend = function () {
      if (VZ.rec !== r) return;
      /* 有的浏览器一停顿就自己结束：还在按着就接着听，已经听到的字留着 */
      if ((VZ.st === "rec" || VZ.st === "near") && !VZ.stopping && !VZ.err && now() - VZ.t0 < VMAX - 600) { VZ.acc = (VZ.acc || "") + (VZ.fin || ""); VZ.fin = VZ.itm = ""; try { r.start(); return; } catch (e) {} }
      vFinish();
    };
    VZ.rec = r; VZ.stopping = false;
    try { r.start(); } catch (e) { vFail("语音输入没能打开，先打字吧。"); return; }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      if (VZ.st !== "rec" && VZ.st !== "near") { st.getTracks().forEach(function (t) { t.stop(); }); return; }
      VZ.stream = st; vLevel(st);
      try { var mr = new MediaRecorder(st), ch = []; mr.ondataavailable = function (e) { if (e.data && e.data.size) ch.push(e.data); }; mr.onstop = function () { if (ch.length) { VZ.url = URL.createObjectURL(new Blob(ch, { type: mr.mimeType || "audio/webm" })); } }; mr.start(); VZ.mr = mr; } catch (e) {}
    }, function () {});
    vPaint(); VZ.raf = requestAnimationFrame(vTick);
  }
  function vStop() {
    if (VZ.st !== "rec" && VZ.st !== "near") return;
    if (VZ.stopping) return;
    if (now() - VZ.t0 < VMIN && !vTranscript()) { vReset(); toast("要按住说话，说完再松开"); return; }
    VZ.stopping = true; var r = VZ.rec;
    try { if (r) r.stop(); } catch (e) { vFinish(); return; }
    try { if (VZ.mr && VZ.mr.state !== "inactive") VZ.mr.stop(); } catch (e) {}
    clearTimeout(VZ.safe); VZ.safe = setTimeout(vFinish, 1800); /* onend 迟迟不来也不卡住 */
    if (VZ.raf) cancelAnimationFrame(VZ.raf); VZ.raf = 0;
  }
  function vFinish() {
    if (VZ.st !== "rec" && VZ.st !== "near") return;
    var t = vTranscript(), er = VZ.err; VZ.rec = null; vRelease();
    if (/not-allowed|service-not-allowed|audio-capture/.test(er)) { VZ.st = "idle"; vFail("没拿到麦克风权限，先打字吧。"); return; }
    if (!t && /network/.test(er)) { VZ.st = "idle"; vFail("语音识别现在连不上，先打字吧。"); return; }
    if (!t) { VZ.st = "idle"; vPaint(); toast("没听清，再按住说一次"); return; }
    VZ.text = t; VZ.st = "done"; vPaint();
  }
  function vPlay() { if (!VZ.url) { toast("这一段没录下声音，听不了"); return; } try { if (VZ.au) VZ.au.pause(); VZ.au = new Audio(VZ.url); VZ.au.play(); } catch (e) { toast("这一段放不出来"); } }
  function voiceBind() {
    var hd = $("s-pick").querySelector(".head"); [].slice.call(hd.querySelectorAll(".pk-cap")).forEach(function (x) { x.parentNode.removeChild(x); });
    var cap = $("pk-cap"); if (cap) hd.insertBefore(cap, hd.firstChild);
    var tv = $("pk-tovoice"); if (tv) tv.onclick = function () { ui.vmode = ""; ui.vnote = ""; renderPick(); };
    var b = $("vz-btn"); if (!b) return;
    b.addEventListener("pointerdown", function (ev) { if (ev.button > 0) return; ev.preventDefault(); try { b.setPointerCapture(ev.pointerId); } catch (e) {} vStart(); });
    b.addEventListener("pointerup", vStop); b.addEventListener("pointercancel", vStop); b.addEventListener("lostpointercapture", vStop);
    b.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    b.onkeydown = function (ev) { if ((ev.key === " " || ev.key === "Enter") && !ev.repeat) { ev.preventDefault(); vStart(); } };
    b.onkeyup = function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); vStop(); } };
    b.onclick = function (ev) { ev.preventDefault(); };
    $("vz-type").onclick = function () { vReset(); ui.vmode = "type"; ui.vnote = ""; renderPick(); try { $("pk-idea").focus({ preventScroll: true }); } catch (e) {} };
    $("vz-redo").onclick = function () { vReset(); };
    $("vz-play").onclick = vPlay;
    $("vz-text").oninput = function () { VZ.text = this.value; };
    $("vz-ok").onclick = function () { var t = $("vz-text").value.trim(); if (!t) { toast("还没有文字，可以重来一次"); return; } S.entry.idea = t; save(); $("pk-idea").value = t; if (VZ.au) try { VZ.au.pause(); } catch (e) {} vReset(); $("pk-go").click(); };
    vPaint();
  }
  window.__lingcunLib = { match: function (t, act) { return libMatch(t, act); }, kwHit: kwHit, size: LIB ? LIB.entries.length : 0, voice: function () { return { st: VZ.st, text: VZ.text, url: !!VZ.url }; } };
