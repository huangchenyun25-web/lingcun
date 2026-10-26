  /* #33：定稿小人（第一轮方向 A，SVG 原样嵌入，只缩放；文件在 page/icons/） */
  var MASCOT = {"stand": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><ellipse cx=\"60\" cy=\"60\" rx=\"46\" ry=\"20\" transform=\"rotate(-16 60 60)\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\" opacity=\"0.8\"/><rect x=\"38\" y=\"74\" width=\"7\" height=\"13\" rx=\"3.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"75\" y=\"74\" width=\"7\" height=\"13\" rx=\"3.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"44\" y=\"69\" width=\"32\" height=\"25\" rx=\"12.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"60\" cy=\"48\" r=\"23\" fill=\"#F3F0F9\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><path d=\"M51 47 Q54 50.6 57 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M63 47 Q66 50.6 69 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><circle cx=\"103\" cy=\"46\" r=\"5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"1.5\"/></svg>", "idle": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><rect x=\"44\" y=\"69\" width=\"32\" height=\"25\" rx=\"12.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"60\" cy=\"48\" r=\"23\" fill=\"#F3F0F9\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><path d=\"M51 47 Q54 50.6 57 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M63 47 Q66 50.6 69 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/></svg>", "celebrate": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><ellipse cx=\"60\" cy=\"60\" rx=\"46\" ry=\"20\" transform=\"rotate(-16 60 60)\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\" opacity=\"0.8\"/><rect x=\"38\" y=\"14\" width=\"7\" height=\"15\" rx=\"3.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"75\" y=\"14\" width=\"7\" height=\"15\" rx=\"3.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"44\" y=\"69\" width=\"32\" height=\"25\" rx=\"12.5\" fill=\"#C9B8F5\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"60\" cy=\"48\" r=\"23\" fill=\"#F3F0F9\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><path d=\"M51 47 Q54 50.6 57 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M63 47 Q66 50.6 69 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M28 22.6 L31.4 26 L28 29.4 L24.6 26 Z\" fill=\"#A78FE0\"/><path d=\"M94 27.4 L96.6 30 L94 32.6 L91.4 30 Z\" fill=\"#A78FE0\"/><path d=\"M48 97 Q60 101 72 97\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\" stroke-linecap=\"round\"/></svg>", "mono": "<svg aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 120 120\" width=\"120\" height=\"120\"><ellipse cx=\"60\" cy=\"60\" rx=\"46\" ry=\"20\" transform=\"rotate(-16 60 60)\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\" opacity=\"1\"/><rect x=\"38\" y=\"74\" width=\"7\" height=\"13\" rx=\"3.5\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"75\" y=\"74\" width=\"7\" height=\"13\" rx=\"3.5\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.75\"/><rect x=\"44\" y=\"69\" width=\"32\" height=\"25\" rx=\"12.5\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"60\" cy=\"48\" r=\"23\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><path d=\"M51 47 Q54 50.6 57 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><path d=\"M63 47 Q66 50.6 69 47\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><circle cx=\"103\" cy=\"46\" r=\"5\" fill=\"none\" stroke=\"#231C45\" stroke-width=\"1.5\"/></svg>"};
  /* ================= v0.0.12 屏幕层（#32–#35）：一屏只做一件事、只留一句话。逻辑、数据、AI 任务、中转都沿用 v0.0.11 ================= */
  (function () { var g = (/[?&]grain=(all|off)\b/.exec(location.search) || [])[1]; if (g) document.body.classList.add("grain-" + g); })();
  var CN = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九", "十"];
  function cnum(n) { return n >= 0 && n <= 10 ? CN[n] : String(n); }
  function cnth(n) { return n === 2 ? "二" : cnum(n); }
  function curScreen() {
    var p = curP(), st = p ? S.stage : "pick";
    if (st === "pick") return ui.pickStep === "idea" ? "idea" : "pick";
    if (st === "draft") return p.out ? "outline" : "wait";
    if (st === "save") return p.saved ? ((ui.view && ui.view[p.id]) || "map") : "save";
    return st;
  }
  ui.view = {};
  /* 刻度尺航线：16 格，01–08 屏依次在 0 / 4 / 8 / 10 / 12 / 14 / 16 / 16 */
  function rulerBuild() {
    var R = $("ruler"); if (!R || R.firstChild) return;
    var h = '<div class="base"></div><div class="done" id="ruler-done"></div>';
    for (var k = 0; k <= 16; k++) h += '<i class="' + (k % 4 === 0 ? "maj" : "min") + '" style="left:' + (k * 148 / 16 - 0.5).toFixed(1) + 'px"></i>';
    R.innerHTML = h + '<div class="cur" id="ruler-cur"></div>';
  }
  function rulerPos(scr) {
    var p = curP();
    if (scr === "material" && p) { var fs = fieldsOf(p), n = fs.filter(function (f) { return answered(p, f); }).length; return 8 + (fs.length ? Math.min(1.75, 2 * n / fs.length) : 0); }
    return { pick: 0, idea: 4, wait: 10, outline: 11, check: 12, save: 14, land: 16, map: 16, again: 16 }[scr] || 0;
  }
  function headText(scr) {
    var p = curP();
    if (scr === "pick") return "今天，做一件小事";
    if (scr === "idea") return "想做什么？";
    if (scr === "material") { var n = deckCards().filter(function (c) { return !cardDone(p, c); }).length; return n ? "还差" + cnum(n) + "样" : "材料齐了"; }
    if (scr === "wait") { var sl = $("dr-slot"), q = function (s) { return sl && sl.querySelector(s); }; return q("[data-quota]") ? "今天的额度用完了" : q("[data-cancelled]") ? "先停一下" : q(".keyhelp") ? "要请 AI 帮忙" : q(".aibox") && !q("[data-busy]") && !q("[data-done]") ? "这一步没成" : "正在成形…"; }
    if (scr === "outline") return "故事结构出来了";
    if (scr === "check") return p && p.revs ? "这是改过的一版" : "这是第一版";
    if (scr === "save") return "是你认可的<br>这一版？";
    if (scr === "again") return "之后，你来定";
    return "";
  }
  function screenUpdate() {
    rulerBuild();
    var scr = curScreen(), B = document.body;
    B.className.split(/\s+/).forEach(function (c) { if (/^scr-/.test(c)) B.classList.remove(c); });
    B.classList.add("scr-" + scr);
    B.classList.toggle("night", scr === "land" || scr === "map");
    var p = curP(), st = p ? S.stage : "pick";
    STAGES.forEach(function (x) { var el = $("s-" + x.id); if (el) el.classList.toggle("now", x.id === st); });
    var hh = $("h-" + st), t = headText(scr); if (hh && t) { if (hh.getAttribute("data-t") !== t || hh.innerHTML !== t) { hh.innerHTML = t; hh.setAttribute("data-t", t); } hh.classList.add("h1"); }
    var pos = rulerPos(scr), d = $("ruler-done"), c = $("ruler-cur");
    if (d) d.style.width = (pos * 148 / 16).toFixed(1) + "px"; if (c) c.style.left = (pos * 148 / 16).toFixed(1) + "px";
    var mf = $("menu-btn"); if (mf) mf.classList.toggle("hidden", scr === "land");
  }
  render = (function (orig) { return function () { if (!curP() && S.stage !== "pick") S.stage = "pick"; if (S.stage !== "pick") ui.pickStep = "home"; orig.apply(this, arguments); screenUpdate(); }; })(render);
  routeUpdate = (function (orig) { return function () { orig.apply(this, arguments); screenUpdate(); }; })(routeUpdate);

  /* 第 3 屏：底部只有「跳过」和「下一张」；最后一张换成「做出第一版」；其余收进「更多」 */
  function matDock() {
    var p = curP(), B = $("b-material"); if (!p || !B || !$("deck")) return;
    var more = document.createElement("details"); more.className = "more mat-more"; more.id = "mat-more"; more.innerHTML = "<summary>更多</summary>";
    ["mat-take", "mat-idea"].forEach(function (id) { var el = $(id); if (el) more.appendChild(el); });
    [].slice.call(B.querySelectorAll(":scope > .known, :scope > p.hint, :scope > .okbox, :scope > .next, :scope > #search-box")).forEach(function (el) { more.appendChild(el); });
    var back = $("mat-back"), go0 = $("mat-go"), row = go0 && go0.parentNode;
    if (back) { var r2 = document.createElement("div"); r2.className = "row"; r2.appendChild(back); more.appendChild(r2); back.textContent = "换一类做"; }
    var err = $("err-mat");
    var D = $("deck"); if (D && !D.classList.contains("brk")) { D.classList.add("brk"); D.insertAdjacentHTML("afterbegin", bk()); }
    B.appendChild(more);
    var dock = document.createElement("div"); dock.className = "dock"; dock.id = "mat-dock";
    dock.innerHTML = '<button class="txt" id="mat-skip">跳过</button>';
    var nx = $("deck-next"); if (nx) { nx.className = "main w150"; nx.textContent = "下一张"; dock.appendChild(nx); }
    if (go0) { go0.className = "main"; go0.textContent = "做出第一版"; dock.appendChild(go0); }
    if (row && row.parentNode) row.parentNode.removeChild(row);
    B.appendChild(dock); if (err) B.insertBefore(err, more);
    $("mat-skip").onclick = function () {
      var cs = deckCards(), i = curIdx(p), card = cs[i]; if (!card) return;
      var f = fieldById(p, card.getAttribute("data-q")); if (!f) return goCard(p, 1);
      if (f.must && !answered(p, f)) { toast("这一张要写一句，才能做出第一版"); return; }
      var sk = card.querySelector('input[value="skip"]') || card.querySelector('input[id^="k_"]');
      if (sk && !sk.checked) { sk.checked = true; sk.dispatchEvent(new Event("change", { bubbles: true })); if (sk.type === "checkbox" && sk.name) setTimeout(function () { goCard(p, 1); }, RM ? 0 : 200); }
      else goCard(p, 1);
    };
    matSync();
  }
  function matSync() {
    var p = curP(); if (!p || S.stage !== "material") return;
    var cs = deckCards(), i = curIdx(p), atEnd = i >= cs.length, nx = $("deck-next"), go0 = $("mat-go"), sk = $("mat-skip");
    if (nx) nx.classList.toggle("hidden", atEnd); if (sk) sk.classList.toggle("hidden", atEnd); if (go0) go0.classList.toggle("hidden", !atEnd);
    screenUpdate();
  }
  renderMaterial = (function (orig) { return function () { orig.apply(this, arguments); matDock(); }; })(renderMaterial);
  showCard = (function (orig) { return function () { orig.apply(this, arguments); matSync(); }; })(showCard);

  /* 第 4 屏：等 AI；做好之后直接进第 5 屏（中长篇小说先看结构） */
  var drObs = null;
  renderDraft = (function (orig) { return function () {
    var p = curP();
    if (p && p.out) { var outline = p.cat === "novel" && p.out.logline !== undefined, wrote = outline ? p.out.sections.filter(function (s) { return s.text; }).length : 0; if (!outline || wrote) { go("check", true); return; } }
    orig.apply(this, arguments);
    var B = $("b-draft"), n = B && B.querySelector(":scope > .note"); if (n) n.className = "draft-note";
    if (n && B.firstChild === n) B.appendChild(n);
    var sl = $("dr-slot"); if (drObs) drObs.disconnect();
    if (sl && window.MutationObserver) { drObs = new MutationObserver(function () { if (S.stage === "draft") screenUpdate(); }); drObs.observe(sl, { childList: true, subtree: false }); }
  }; })(renderDraft);

  /* 菜单：星图 / AI 设置 / 换设备 / 小统计 / 说明 */
  function menuOpen(on) { $("menu").classList.toggle("hidden", !on); }
  (function () {
    $("menu-btn").onclick = function () { menuOpen($("menu").classList.contains("hidden")); };
    $("menu-brand").onclick = $("menu-btn").onclick;
    $("menu-close").onclick = function () { menuOpen(false); };
    $("menu").addEventListener("click", function (ev) { if (ev.target === this) menuOpen(false); });
    $("menu-home").onclick = function () { menuOpen(false); S.cur = -1; S.entry.act = S.entry.act || ""; ui.pickStep = "home"; go("pick"); };
    $("bag-btn").addEventListener("click", function () { menuOpen(false); });
    $("ai-chip").addEventListener("click", function () { menuOpen(false); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { menuOpen(false); var c = $("ai-cfg"); if (c) c.classList.add("hidden"); } });
  })();
  /* 改完一句后标题要跟着变成「这是改过的一版」 */
  renderCheck = (function (orig) { return function () { orig.apply(this, arguments); screenUpdate(); }; })(renderCheck);
