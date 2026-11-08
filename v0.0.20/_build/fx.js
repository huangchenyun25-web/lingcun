
  /* ================= 打磨轮（第 134–139 条）：只改呈现和交互，逻辑、数据、AI 任务都不动 ================= */

  /* ---------- (a) 第 134 条：整局是一次飞行。顶部航线 + 小飞船 + 航点点亮 + 离月球还有多远 ---------- */
  var MOON_AT = 4; /* 「确认登月」是第 5 个航点 */
  ui.route = { si: -1, pid: null, prog: 0 };
  function lastLanded() { var b = null; S.projects.forEach(function (q) { if (q.landed && (!b || q.planet > b.planet)) b = q; }); return b; }
  function stageFrac(p, si) {
    if (!p) return 0;
    if (S.stage === "material") { var fs = fieldsOf(p); if (!fs.length) return 0; var n = fs.filter(function (f) { return answered(p, f); }).length; return Math.min(0.85, n / fs.length * 0.85); }
    if (S.stage === "draft") return p.out ? 0.8 : 0.35;
    if (S.stage === "check") return p.degree !== null && p.degree !== undefined ? 0.7 : 0.3;
    return 0;
  }
  function routeUpdate() {
    var p = curP(), si = p ? stageIdx(S.stage) : 0, R = ui.route, wrap = $("route");
    if (!wrap) return;
    var landedHere = p && p.landed && p.saved && si >= MOON_AT;
    var u = landedHere ? 5 : Math.min(5, si + stageFrac(p, si)); /* 登上了：飞船飞到终点那颗星 */
    var prog = u / 5;
    wrap.style.setProperty("--prog", prog.toFixed(4));
    var ship = $("route-ship");
    if (ship && prog > R.prog + 0.001 && R.pid === (p && p.id) && !RM) { ship.classList.remove("boost"); void ship.offsetWidth; ship.classList.add("boost"); }
    /* 刚完成一步：点亮上一个航点（带一个小动画） */
    if (p && R.pid === p.id && si > R.si && R.si >= 0) {
      var wp = document.querySelector('#stages [data-st="' + STAGES[si - 1].id + '"]');
      if (wp) { wp.classList.add("lit"); }
    }
    R.si = si; R.pid = p ? p.id : null; R.prog = prog;
    /* #34（第 140 条）：只说这一局走到哪了，不替用户安排下一站 */
    var d = $("route-dist"), txt;
    if (!p) txt = "离月球还有 " + MOON_AT + " 站";
    else if (landedHere) txt = "已登上" + planetOf(p.planet).n;
    else if (si < MOON_AT) txt = "离" + (p.landed ? planetOf(p.planet).n : "月球") + "还有 " + (MOON_AT - si) + " 站";
    else if (si === MOON_AT) txt = "就差最后一步：按住确认";
    else txt = "";
    if (d) d.textContent = txt;
  }
  render = (function (orig) { return function () { orig.apply(this, arguments); routeUpdate(); }; })(render);
  renderSummaries = (function (orig) { return function () { orig.apply(this, arguments); routeUpdate(); }; })(renderSummaries);

  /* ---------- (b) 第 135 条：问题变成卡片，一次一张；点选就飞走；手机上左右滑 ---------- */
  ui.deck = {};
  function deckCards() { var D = $("deck"); return D ? [].slice.call(D.querySelectorAll(":scope > .q:not(.deck-done)")) : []; }
  function cardDone(p, el) { var f = fieldById(p, el.getAttribute("data-q")); return !!(f && answered(p, f)); }
  function showCard(p, fid, dir) {
    var cards = deckCards(); if (!cards.length) return;
    var idx = -1; cards.forEach(function (c, i) { if (c.getAttribute("data-q") === fid) idx = i; });
    if (fid === "__done") idx = cards.length;
    if (idx < 0) idx = 0;
    ui.deck[p.id] = idx >= cards.length ? "__done" : cards[idx].getAttribute("data-q");
    cards.forEach(function (c, i) { c.classList.toggle("cur", i === idx); c.classList.remove("fly-l", "fly-r", "in-l", "in-r"); c.style.transform = ""; if (i === idx && dir && !RM) c.classList.add(dir > 0 ? "in-r" : "in-l"); c.setAttribute("aria-hidden", i === idx ? "false" : "true"); });
    var dn = $("deck-done"); if (dn) dn.classList.toggle("cur", idx >= cards.length);
    var dots = $("deck-dots");
    if (dots) dots.querySelectorAll("[data-dot]").forEach(function (b, i) { b.classList.toggle("on", i === idx); b.classList.toggle("ok", i < cards.length ? cardDone(p, cards[i]) : false); });
    var pv = $("deck-prev"), nx = $("deck-next");
    if (pv) pv.disabled = idx <= 0;
    if (nx) { nx.disabled = idx >= cards.length; nx.classList.toggle("ready", idx < cards.length && cardDone(p, cards[idx])); }
  }
  function curIdx(p) { var cards = deckCards(), f = ui.deck[p.id]; if (f === "__done") return cards.length; for (var i = 0; i < cards.length; i++) if (cards[i].getAttribute("data-q") === f) return i; return 0; }
  function goCard(p, step) {
    var cards = deckCards(), i = curIdx(p), j = Math.max(0, Math.min(cards.length, i + step));
    if (j === i) return;
    var el = cards[i];
    var next = j >= cards.length ? "__done" : cards[j].getAttribute("data-q");
    if (el && !RM) { el.classList.add(step > 0 ? "fly-l" : "fly-r"); ui.deck[p.id] = next; setTimeout(function () { if (curP() === p && S.stage === "material") showCard(p, ui.deck[p.id], step); }, 230); }
    else showCard(p, next, step);
  }
  function firstOpen(p, cards) { for (var i = 0; i < cards.length; i++) if (!cardDone(p, cards[i])) return cards[i].getAttribute("data-q"); return cards.length ? "__done" : null; }
  function deckify() {
    var p = curP(), B = $("b-material"); if (!p || !B) return;
    var qs = [].slice.call(B.querySelectorAll(":scope > .q")); if (!qs.length) return;
    var D = document.createElement("div"); D.className = "deck"; D.id = "deck"; D.setAttribute("role", "group"); D.setAttribute("aria-label", "一张一张回答，答完的卡片会飞走");
    qs[0].parentNode.insertBefore(D, qs[0]);
    qs.forEach(function (q) { q.classList.add("card-q"); D.appendChild(q); });
    var done = document.createElement("div"); done.className = "q deck-done"; done.id = "deck-done";
    done.innerHTML = '<div class="dd-i" aria-hidden="true"></div><div class="qt">都齐了</div><p class="hint" style="display:block">点「做出第一版」。想改哪张，点下面的刻度回去。</p>';
    D.appendChild(done);
    var nav = document.createElement("div"); nav.className = "deck-nav";
    nav.innerHTML = '<button class="sec2 small" id="deck-prev" aria-label="上一张">←</button><div class="dots" id="deck-dots">' + qs.map(function (q, i) { return '<button class="dot" data-dot="' + i + '" aria-label="回到第 ' + (i + 1) + ' 张"></button>'; }).join("") + '<button class="dot fin" data-dot="' + qs.length + '" aria-label="都齐了"></button></div><button class="small" id="deck-next" aria-label="下一张">下一张 →</button>';
    D.parentNode.insertBefore(nav, D.nextSibling);
    var want = ui.deck[p.id];
    if (!want || (want !== "__done" && !qs.some(function (q) { return q.getAttribute("data-q") === want; }))) want = firstOpen(p, qs);
    showCard(p, want, 0);
    $("deck-prev").onclick = function () { goCard(p, -1); };
    $("deck-next").onclick = function () { goCard(p, 1); };
    nav.querySelectorAll("[data-dot]").forEach(function (b) { b.onclick = function () { var j = +b.getAttribute("data-dot"); goCard(p, j - curIdx(p)); }; });
    /* 点选（单选）就自动飞走；「其他，我自己写」要先写，不自动走 */
    D.addEventListener("change", function (ev) {
      var t = ev.target; if (!t || !t.name) { if (t && /^k_/.test(t.id) && t.checked) setTimeout(function () { goCard(p, 1); }, RM ? 0 : 200); return; }
      if (t.type === "radio" && t.checked && t.value !== "other") { var card = t.closest(".q"); if (card) card.classList.add("picked"); setTimeout(function () { if (curP() === p) { var cs = deckCards(), i = curIdx(p); if (cs[i] && cs[i].getAttribute("data-q") === t.name.slice(2)) goCard(p, 1); else showCard(p, ui.deck[p.id], 0); } }, RM ? 0 : 260); }
      else setTimeout(function () { if (curP() === p) showCard(p, ui.deck[p.id], 0); }, 0);
    });
    D.addEventListener("input", function () { var nx = $("deck-next"), cs = deckCards(), i = curIdx(p); if (nx && cs[i]) nx.classList.toggle("ready", cardDone(p, cs[i])); });
    /* 手机上左右滑：左滑下一张，右滑上一张 */
    var sx = 0, sy = 0, drag = null;
    D.addEventListener("pointerdown", function (ev) { var c = ev.target.closest(".q.cur"); if (!c || ev.target.closest("textarea,input[type=text],input[type=file]") || ev.pointerType === "mouse") return; drag = c; sx = ev.clientX; sy = ev.clientY; });
    D.addEventListener("pointermove", function (ev) { if (!drag) return; var dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.abs(dy) > Math.abs(dx) * 1.2) { drag.style.transform = ""; drag = null; return; } if (!RM) drag.style.transform = "translateX(" + dx + "px) rotate(" + dx / 30 + "deg)"; });
    var end = function (ev) { if (!drag) return; var dx = ev.clientX - sx, c = drag; drag = null; c.style.transform = ""; if (dx < -70) goCard(p, 1); else if (dx > 70) goCard(p, -1); };
    D.addEventListener("pointerup", end); D.addEventListener("pointercancel", function () { if (drag) { drag.style.transform = ""; drag = null; } });
    B.querySelectorAll("[data-re]").forEach(function (b) { b.addEventListener("click", function () { var fid = b.getAttribute("data-re"); ui.deck[p.id] = fid; var cs = deckCards(); if (cs.length) showCard(p, fid, 0); }); });
  }
  renderMaterial = (function (orig) { return function () { orig.apply(this, arguments); deckify(); routeUpdate(); }; })(renderMaterial);

  /* ---------- (d) v0.0.12（#35）：按住确认。外圈刻度随按住时间走满就确认；没走满就松手 = 反悔，什么都不发生。
     键盘（回车 / 空格）、读屏软件和「减少动画」时是普通按钮，点一下就确认 ---------- */
  var HOLD_MS = 1200;
  function armHold() {
    var b = $("lc-go"); if (!b || b.getAttribute("data-hold")) return;
    var launch = b.onclick; if (!launch) return;
    b.setAttribute("data-hold", "1"); b.classList.add("holdbtn");
    b.innerHTML = '<span class="hb-t">' + (RM ? "确认" : "按住确认") + "</span>";
    b.setAttribute("aria-describedby", "lc-holdhint lc-say");
    var ticks = [].slice.call(document.querySelectorAll("#lc-ring line")), arc = $("lc-arc"), L = 2 * Math.PI * 96;
    var setProg = function (k) { var n = Math.round(k * ticks.length); ticks.forEach(function (t, i) { t.classList.toggle("on", i < n); }); if (arc) { arc.style.strokeDasharray = L.toFixed(1); arc.style.strokeDashoffset = (L * (1 - k)).toFixed(1); } };
    setProg(0);
    var raf = 0, t0 = 0, fired = false, swallow = 0, holding = false;
    var stop = function () { if (raf) cancelAnimationFrame(raf); raf = 0; holding = false; b.classList.remove("charging"); };
    var fire = function (ev) { fired = true; stop(); b.classList.add("full"); setProg(1); swallow = Date.now(); try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} setTimeout(function () { launch.call(b, ev); }, 260); };
    b.onclick = function (ev) {
      if (Date.now() - swallow < 700) return;
      if (RM || !ev || ev.detail === 0) return launch.call(b, ev);
      b.classList.remove("nudge"); void b.offsetWidth; b.classList.add("nudge");
      var er = $("lc-err"); if (er) er.textContent = "要按住不放，等外圈走满（用键盘的话按回车）。";
    };
    if (RM) return;
    b.addEventListener("pointerdown", function (ev) {
      if (b.disabled || (ev.button !== undefined && ev.button > 0)) return;
      try { b.setPointerCapture(ev.pointerId); } catch (e) {}
      stop(); fired = false; holding = true; t0 = now(); b.classList.add("charging"); var er = $("lc-err"); if (er) er.textContent = "";
      var loop = function () { if (!holding) return; var k = Math.min(1, (now() - t0) / HOLD_MS); setProg(k); if (k >= 1) fire(ev); else raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    var up = function () { if (!holding) return; stop(); if (!fired) { setProg(0); swallow = Date.now() - 400; var er = $("lc-err"); if (er) er.textContent = "松手了，这次不算。想确认就按住，等外圈走满。"; } };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
  }
  renderSave = (function (orig) { return function () { orig.apply(this, arguments); armHold(); routeUpdate(); }; })(renderSave);
