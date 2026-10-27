  /* ================= v0.0.13（#37 #38 #39）：【创造】单独一条线：四张卡片 → 材料齐了（目标 / 路线 / 帮你做什么）→ 第一步。
     不写代码；三个 AI 小任务都只回一小段 JSON。视觉沿用 v0.0.12 ================= */
  var CONCEPT_WAIT = 6000, PLAN_WAIT = 20000;
  /* 后台跑一个小任务：等不到（太慢、失败、没开通）就用本地的默认，不让人卡在这里 */
  function bgRun(task, ms, cb) {
    var done = false, slot = document.createElement("div");
    if (!AI.mode()) { cb(null); return; }
    var t = setTimeout(function () { if (!done) { done = true; cb(null); } }, ms);
    AI.run(task, slot).then(function (o) { if (done) return; done = true; clearTimeout(t); cb(o); });
  }
  function onMat(p) { return curP() === p && S.stage === "material"; }
  function reMat() { renderMaterial(); appendAsk("material"); }
  function createConcepts(p) {
    var idea = createIdea(p);
    if (idea === PEND || p.coptsFor === idea || qAnswered(p.a.c_concept)) return;
    p.coptsFor = idea; p.copts = null; ui.cwait = ui.cwait || {}; ui.cwait[p.id] = 1;
    bgRun(taskConcepts(p), CONCEPT_WAIT, function (o) {
      delete ui.cwait[p.id];
      if (!qAnswered(p.a.c_concept)) p.copts = o && o.options ? o.options.slice(0, 4) : C_CONCEPT_FALLBACK[isGame(p) ? "game" : "any"].slice();
      save(); if (onMat(p)) reMat();
    });
  }
  /* 路线没等到时的本地默认（粗估） */
  var SHOW_TOOL = ["纸和笔", "备忘录", "Figma", "Figma"];
  function localPlan(p) {
    var c = vText(p, "c_concept"), si = idx(p, "c_show"), g = isGame(p);
    return { goal: c !== PEND ? c : createIdea(p), route: [{ step: g ? "写策划" : "写下想法", tool: "纸笔", time: "约 1 周" }, { step: g ? "纸面小原型" : "做个小样", tool: SHOW_TOOL[si] || "纸和笔", time: "约 1 周" }, { step: "做第一版", tool: g ? "Godot" : SHOW_TOOL[si] || "纸和笔", time: "约 3 周" }, { step: g ? "找人试玩" : "给人看看", tool: "2–3 位朋友", time: "约 1 周" }], total: "约 6 周", help: "帮我把第一步想清楚", src: "local" };
  }
  function planSig(p) { return JSON.stringify(createSet(p)); }
  function needPlan(p) { return p.cat === "create" && (!p.plan || p.plan.sig !== planSig(p)) && !(ui.pwait && ui.pwait[p.id]); }
  function createPlan(p, req) {
    var sig = planSig(p); ui.pwait = ui.pwait || {}; ui.pwait[p.id] = 1;
    bgRun(taskPlan(p, req), PLAN_WAIT, function (o) {
      delete ui.pwait[p.id];
      var old = p.plan || {};
      if (o) p.plan = { goal: req && old.goal ? old.goal : o.goal, route: o.route, total: o.total, help: req && old.help ? old.help : o.help, src: "ai" };
      else if (!req || !p.plan) p.plan = localPlan(p);
      p.plan.sig = sig; save();
      if (onMat(p)) reMat();
    });
  }
  function routeOf(p) { var r = p.plan && p.plan.route && p.plan.route.length ? p.plan : p.out && p.out.route && p.out.route.length ? p.out : null; return r ? { route: r.route, total: r.total || "" } : { route: [], total: "" }; }
  function axisHtml(r) {
    return '<ol class="craxis">' + r.route.map(function (x, i) { return '<li class="' + (i ? "" : "now") + '"><span class="pt" aria-hidden="true"></span><span class="st">' + esc(x.step) + '</span><span class="tl">' + esc(x.tool) + '</span><span class="tm">' + esc(x.time) + "</span></li>"; }).join("") + "</ol>" +
      (r.total ? '<div class="sum"><span class="lbl">合计</span><span>' + esc(r.total) + "</span></div>" : "");
  }
  /* 第 6 屏「材料齐了」：目标 / 路线 / 希望它帮你做什么，各带「改」 */
  function panelHtml(p) {
    var pl = p.plan, wait = !pl || (ui.pwait && ui.pwait[p.id] && pl.sig !== planSig(p)), ed = ui.cedit && ui.cedit[p.id];
    var row = function (k, lbl, body) { return '<div class="crow" data-row="' + k + '"><div class="k"><span class="lbl">' + lbl + '</span><button class="gai" data-cre="' + k + '" aria-label="改' + lbl + '">改</button></div>' + body + "</div>"; };
    var v = function (k, t) { return ed === k ? '<input type="text" class="crin" id="cr-in-' + k + '" maxlength="60" value="' + esc(t) + '" />' : '<div class="v" id="cr-' + k + '">' + (wait ? '<span class="crwait" aria-label="正在排">…</span>' : esc(t)) + "</div>"; };
    var rt = routeOf(p);
    return '<div class="crp" id="cr-panel">' + row("goal", "目标", v("goal", pl ? pl.goal : "")) +
      row("route", "路线", (ed === "route" ? '<input type="text" class="crin" id="cr-in-route" maxlength="80" placeholder="想怎么改？一句就好" />' : "") + (wait || !rt.route.length ? '<div class="v" id="cr-route"><span class="crwait">…</span></div>' : '<div id="cr-route">' + axisHtml(rt) + "</div>")) +
      row("help", "希望它帮你做什么", v("help", pl ? pl.help : "")) + "</div>";
  }
  function bindPanel(p) {
    var P = $("cr-panel"); if (!P) return;
    P.querySelectorAll("[data-cre]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-cre"); if (!p.plan) return; ui.cedit = ui.cedit || {}; ui.cedit[p.id] = ui.cedit[p.id] === k ? "" : k; drawDone(p); var i = $("cr-in-" + k); if (i) try { i.focus(); i.select(); } catch (e) {} }; });
    ["goal", "help"].forEach(function (k) { var i = $("cr-in-" + k); if (!i) return; var commit = function () { var v = i.value.trim(); if (v) p.plan[k] = v; ui.cedit[p.id] = ""; save(); drawDone(p); }; i.onkeydown = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); commit(); } }; i.onblur = commit; });
    var ri = $("cr-in-route"); if (ri) ri.onkeydown = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); var v = ri.value.trim(); ui.cedit[p.id] = ""; if (v) { p.plan.sig = ""; createPlan(p, v); } drawDone(p); } };
  }
  function drawDone(p) { var d = $("deck-done"); if (!d || p.cat !== "create") return; d.innerHTML = panelHtml(p); bindPanel(p); }
  function createMat() {
    var p = curP(), B = $("b-material"); if (!p || p.cat !== "create" || !B) return;
    var mm = $("mat-more"); if (mm) mm.parentNode.removeChild(mm); /* 这条线不要「更多」：没有原话、带走、换一类做 */
    fieldsOf(p).forEach(function (f) {
      var q = B.querySelector('.q[data-q="' + f.id + '"]'); if (!q || !f.lbl) return;
      var qt = q.querySelector(".qt"); if (qt && !q.querySelector(".clbl")) qt.insertAdjacentHTML("beforebegin", '<div class="lbl clbl">' + esc(f.lbl) + "</div>");
      if (f.refs) [].slice.call(q.querySelectorAll("label.choice")).forEach(function (l) { var i = l.querySelector("input"); if (i && /^\d+$/.test(i.value) && f.refs[+i.value]) l.insertAdjacentHTML("beforeend", '<span class="ref">' + esc(f.refs[+i.value]) + "</span>"); });
      if (f.id === "c_concept" && ui.cwait && ui.cwait[p.id]) { q.classList.add("cwait"); q.querySelectorAll('input[value]:not([value="other"])').forEach(function (i) { i.disabled = true; }); }
    });
    var go0 = $("mat-go"); if (go0) go0.textContent = "出第一步";
    drawDone(p);
  }
  function createSync() {
    var p = curP(); if (!p || p.cat !== "create" || S.stage !== "material") return;
    var cs = deckCards(), i = curIdx(p), atEnd = i >= cs.length, card = cs[i];
    if (card && card.getAttribute("data-q") === "c_concept") createConcepts(p);
    if (atEnd && needPlan(p)) { createPlan(p); drawDone(p); }
    document.body.classList.toggle("cr-done", atEnd);
  }
  renderMaterial = (function (orig) { return function () { orig.apply(this, arguments); createMat(); createSync(); }; })(renderMaterial);
  showCard = (function (orig) { return function () { orig.apply(this, arguments); createSync(); }; })(showCard);
  /* 刻度：01 说想法 4，四张卡 5–8，材料齐了 10，第一步 12（同设计稿） */
  rulerPos = (function (orig) { return function (scr) { var p = curP(); if (scr === "material" && p && p.cat === "create") { var cs = deckCards(), i = curIdx(p); return i >= cs.length ? 10 : 5 + Math.min(3, i); } return orig.apply(this, arguments); }; })(rulerPos);
  screenUpdate = (function (orig) { return function () { orig.apply(this, arguments); var p = curP(), c = !!(p && p.cat === "create"); document.body.classList.toggle("cr", c); if (!c || S.stage !== "material") document.body.classList.remove("cr-done"); }; })(screenUpdate);

  /* 第 7 屏「第一步」：第一步做主角，下面是框架，长期路线收起来 */
  var CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#231C45" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  function renderCreateCheck(p) {
    var B = $("b-check"), o = p.out, rt = routeOf(p);
    var h = '<div class="lbl crk">第一步</div><div class="brk">' + bk() + '<div class="gl crstep" id="cr-step"><div class="hd" id="cr-first">' + esc(o.first_step) + '</div><div class="tags">' + [o.time].concat(o.tags || []).filter(Boolean).map(function (t) { return '<span class="gai">' + esc(t) + "</span>"; }).join("") + "</div></div></div>" +
      '<div class="gl crfw" id="cr-fw"><div class="lbl">框架</div>' + ["c_concept", "c_feel", "c_type", "c_show"].map(function (id) { var f = fieldById(p, id); return '<div class="fr"><span class="lbl">' + esc(f.lbl) + "</span><span>" + pt(vText(p, id)) + "</span></div>"; }).join("") + "</div>" +
      (rt.route.length ? '<details class="gl crlater" id="cr-later"><summary><span><span class="lbl">之后</span>' + rt.route.length + " 段路线" + (rt.total ? " · " + esc(rt.total) : "") + "</span>" + CHEV + "</summary>" + axisHtml(rt) + "</details>" : "") +
      '<details class="more" id="ck-more"><summary>更多</summary>' + editBar(p, []) + '<div class="row"><button class="ghost small" id="ck-mat">回去补材料</button><button class="ghost small" id="ck-dl">下载 .html</button></div></details>' +
      '<div class="err" id="ck-err"></div><div class="dock"><button class="main" id="ck-next">就它了</button></div>';
    B.innerHTML = h;
    $("sn-req").placeholder = "想怎么改？一句就好";
    $("sn-go").onclick = function () { var w = $("sn-req").value.trim(); if (!w) { $("sn-err").textContent = "写一句想怎么改。"; return; } $("sn-err").textContent = ""; runTask(p, taskRevise(p, w, -1), $("sn-slot"), function (o2) { afterRevise(p, -1, o2); }); };
    $("ck-mat").onclick = function () { go("material"); };
    $("ck-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
    $("ck-next").onclick = function () { if (!qAnswered(p.degree)) { p.degree = { skip: true }; save(); } go("save"); };
  }
  renderCheck = (function (orig) { return function () { var p = curP(); if (p && p.cat === "create" && p.out && p.out.first_step) { renderCreateCheck(p); screenUpdate(); return; } orig.apply(this, arguments); }; })(renderCheck);
