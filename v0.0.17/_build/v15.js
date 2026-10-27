  /* ================= v0.0.15（#45 #46 #47）：只管第一步、现实行动型第一步、定时间地点（本地 .ics）、回来时的完成态 =================
     库换成 library/first_step_lib_v2.json。现实类条目（mode = real）第一步是现实里的动作；「就它了」之后多一屏定时间地点，
     「加到日历」在页面里本地生成 .ics（提前 30 分钟提醒，断网也能用，不经过中转）；回来时按完成态按钮摘星。AI 调用次数不变 */
  function isReal(e) { return !!(e && e.mode === "real" && e.real && e.real.steps && e.real.steps.length); }
  function skQ(p, qi) {
    var lc = libCat(p), sk = LIB.skeletons[lc], q = sk.questions[qi], e = entryOf(p);
    if (isReal(e) && sk.questions_real && sk.questions_real[q.id]) return sk.questions_real[q.id];
    return q;
  }
  function oneLine(p) { var lc = libCat(p); return !!(LIB && LIB.skeletons[lc] && LIB.skeletons[lc].route_display === "one_line"); }
  /* ③ 选了多少分钟（「其他」里写了数字也认；认不出就不筛） */
  function todayMin(p) {
    var lc = libCat(p); if (lc !== "学习技能" && lc !== "转行") return 0;
    var a = p.a.l_q3, fx = LIB.skeletons[lc].questions[2].fixed_options || []; if (!a || a.skip) return 0;
    if (typeof a.i === "number" && fx[a.i]) return fx[a.i].min;
    var t = String(a.other || ""), m = /(\d+)\s*分/.exec(t), h = /(\d+(\.\d+)?)\s*(个)?小时|半小时|一小时|两小时/.exec(t);
    if (m) return +m[1]; if (/半小时/.test(t)) return 30; if (/一小时|1\s*小时/.test(t)) return 60; if (/两小时/.test(t)) return 120; if (h && h[1]) return Math.round(+h[1] * 60);
    return 0;
  }
  /* 一张卡的选项：③ 用骨架里固定的三个；现实类 ④ = 放得下今天时长的现实动作（最多 4 个）；创造兜底 ④ 按 q4_if 换掉对不上的那一个 */
  function optList(p, sk, all) {
    var e = entryOf(p);
    if (sk.fixed_options) return sk.fixed_options.map(function (x) { return { text: x.text }; });
    if (isReal(e) && sk.id === "q4") {
      var m = all ? 0 : todayMin(p), st = e.real.steps.filter(function (s) { return !m || s.min <= m; });
      if (!st.length) st = e.real.steps.slice(0, 1);
      return st.slice(0, 4).map(function (s) { return { text: s.text }; });
    }
    var lo = (e.options && e.options[sk.id]) || [];
    if (sk.id === "q4" && e.q4_if) {
      var a3 = p.a.l_q3, t3 = a3 && typeof a3.i === "number" ? ((e.options.q3 || [])[a3.i] || {}).text : "";
      lo = lo.map(function (x) { var c = e.q4_if[x.text]; return c && t3 !== c.requires_q3 ? { text: c["else"], swapped: true } : x; });
    }
    return lo;
  }
  function realStep(p) {
    var e = entryOf(p); if (!isReal(e)) return null;
    var a = p.a.l_q4, list = optList(p, skQ(p, 3)), t = a && typeof a.i === "number" && !a.skip ? (list[a.i] || {}).text : "";
    return e.real.steps.filter(function (s) { return s.text === t; })[0] || e.real.steps[0];
  }
  function timeAffects(p) { var e = entryOf(p); return isReal(e) || !!(e && (e.by_time || e.q4_if)); }
  function fixQ4(p) { if (isReal(entryOf(p)) && p.a.l_q4 && typeof p.a.l_q4.i === "number") delete p.a.l_q4; }

  /* ---------- 时间胶囊 ---------- */
  var WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  function hm(d) { return d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(); }
  function atDay(off, h, m) { var d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; }
  function dayWord(d, morning) {
    var t0 = atDay(0, 0, 0), diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t0) / 864e5);
    if (diff === 0) return d.getHours() >= 18 ? "今晚" : "今天";
    if (diff === 1) return morning && d.getHours() < 12 ? "明早" : d.getHours() >= 18 ? "明晚" : "明天";
    if (diff < 7) return WD[d.getDay()];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  function whenLabel(d) { return dayWord(d, true) + " " + hm(d); }
  function tonight(h, m) { var d = atDay(0, h, m); if (d.getTime() < Date.now() + 15 * 6e4) d = atDay(1, h, m); return d; }
  function nextSat(h, m) { var n = new Date(), off = (6 - n.getDay() + 7) % 7; var d = atDay(off, h, m); if (d.getTime() < Date.now() + 15 * 6e4) d = atDay(off + 7, h, m); return d; }
  function chipsFor(kind) {
    var L = kind === "prep" ? [atDay(1, 6, 30), atDay(1, 7, 0), atDay(1, 7, 30)]
      : kind === "book" || kind === "find" ? [tonight(20, 0), atDay(1, 12, 30), nextSat(10, 0)]
      : kind === "buy" ? [tonight(20, 0), atDay(1, 18, 30), nextSat(10, 0)]
      : [tonight(20, 0), atDay(1, 7, 0), nextSat(10, 0)];
    return L.map(function (d) { return { t: d.getTime(), label: whenLabel(d) }; });
  }
  function localInput(t) { var d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + "T" + z(d.getHours()) + ":" + z(d.getMinutes()); }

  /* ---------- .ics（RFC 5545：CRLF、转义、按 75 字节折行；提前 30 分钟提醒） ---------- */
  function icsEsc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function u8len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  function icsFold(line) {
    var out = [], cur = "", n = 0, lim = 75;
    Array.from(line).forEach(function (ch) { var b = u8len(ch); if (n + b > lim) { out.push(cur); cur = ch; n = 1 + b; lim = 75; } else { cur += ch; n += b; } });
    out.push(cur); return out.join("\r\n ");
  }
  function icsTime(t) { return new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  function backUrl(p) { var u = String(location.href).replace(/#.*$/, ""); return u + "#done=" + p.id; }
  function icsText(p, ev) {
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//lingcun//v" + VERSION + "//ZH", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
      "UID:" + p.id + "-" + ev.t + "@lingcun", "DTSTAMP:" + icsTime(Date.now()), "DTSTART:" + icsTime(ev.t), "DTEND:" + icsTime(ev.t + (ev.min || 30) * 6e4),
      "SUMMARY:" + icsEsc(ev.summary)];
    if (ev.place) L.push("LOCATION:" + icsEsc(ev.place));
    L.push("DESCRIPTION:" + icsEsc(ev.desc + "\n做完回来点一下：" + backUrl(p)), "URL:" + backUrl(p),
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(ev.summary), "TRIGGER:-PT30M", "END:VALARM", "END:VEVENT", "END:VCALENDAR");
    return L.map(icsFold).join("\r\n") + "\r\n";
  }
  function icsName(s) { return "另存人生_" + String(s || "第一步").replace(/[\\\/:*?"<>|\s「」·]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 24) + ".ics"; }
  function saveIcs(p, ev) { var t = icsText(p, ev); download(icsName(ev.summary), t, "text/calendar"); p.icsLast = t; return t; }
  function evSummary(p, extra) { var r = p.out.real, nm = p.title || (entryOf(p) || {}).title || ""; return (extra || r.text) + (nm ? " · " + nm : ""); }

  /* ---------- 「就它了」之后：定时间地点 / 挑一种（只有现实类） ---------- */
  function needCommit(p) { return !!(p && p.cat === "create" && p.out && p.out.real && !p.pin); }
  var STAR_BIG = '<svg width="96" height="96" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.8 6.2 20.2l1.5-6.5-5-4.4 6.6-.6z" fill="#C9B8F5" stroke="#231C45" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  function keyLine(c) { var w = c.custom || (c.chips[c.i] || {}).label || ""; return w + (c.place ? " · " + c.place : ""); }
  function commitHtml(c, ph, idp) {
    return '<div class="brk">' + bk() + '<div class="gl crstep" id="' + idp + '-card"><div class="hd" id="' + idp + '-line">' + esc(keyLine(c)) + "</div>" +
      '<div class="cm-chips" role="group" aria-label="选一个时间">' + c.chips.map(function (x, i) { return '<button data-cmi="' + i + '" class="' + (!c.custom && c.i === i ? "on" : "") + '" aria-pressed="' + (!c.custom && c.i === i) + '">' + esc(x.label) + "</button>"; }).join("") +
      '<button data-cmi="own" class="' + (c.custom ? "on" : "") + '">自己选</button></div>' +
      '<input type="datetime-local" id="' + idp + '-dt" class="' + (c.own ? "" : "hidden") + '" value="' + (c.ownT ? localInput(c.ownT) : "") + '" aria-label="自己选一个时间" />' +
      '<label class="cm-field"><span class="lbl">在哪儿</span><input type="text" id="' + idp + '-place" maxlength="24" placeholder="' + esc(ph || "例：家附近") + '" value="' + esc(c.place) + '" /></label></div></div>';
  }
  function bindCommit(c, idp, onChange) {
    var root = $(idp + "-card"); if (!root) return;
    root.querySelectorAll("[data-cmi]").forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute("data-cmi");
        if (v === "own") { c.own = true; var dt = $(idp + "-dt"); dt.classList.remove("hidden"); if (!c.ownT) c.ownT = c.chips[c.i].t; dt.value = localInput(c.ownT); c.custom = whenLabel(new Date(c.ownT)); try { dt.focus(); } catch (e) {} }
        else { c.own = false; c.custom = ""; c.i = +v; $(idp + "-dt").classList.add("hidden"); }
        root.querySelectorAll("[data-cmi]").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
        $(idp + "-line").textContent = keyLine(c); onChange && onChange();
      };
    });
    $(idp + "-dt").onchange = function () { var t = new Date(this.value).getTime(); if (!isNaN(t)) { c.ownT = t; c.custom = whenLabel(new Date(t)); $(idp + "-line").textContent = keyLine(c); } };
    $(idp + "-place").oninput = function () { c.place = this.value.trim().slice(0, 24); $(idp + "-line").textContent = keyLine(c); };
  }
  function cmTime(c) { return c.custom && c.ownT ? c.ownT : c.chips[c.i].t; }
  ui.cm = {};
  function renderCommit(p) {
    var B = $("b-save"), r = p.out.real, h;
    if (r.kind === "pick" && r.pick) {
      var c0 = ui.cm[p.id] = ui.cm[p.id] || { pi: 0 }, o = r.pick[c0.pi] || r.pick[0];
      h = '<div class="lbl crk">' + esc(r.text) + '</div><div class="brk">' + bk() + '<div class="gl crstep" id="pk2-card"><div class="hd" id="pk2-line">' + esc(o.text) + '</div><div class="cm-note" id="pk2-note">' + esc(o.note || "") + "</div>" +
        '<div class="cm-chips" role="group" aria-label="挑一种">' + r.pick.map(function (x, i) { return '<button data-pki="' + i + '" class="' + (i === c0.pi ? "on" : "") + '" aria-pressed="' + (i === c0.pi) + '">' + esc(x.text) + "</button>"; }).join("") + "</div></div></div>" +
        '<button class="ghost small back" id="cm-back">回去再改</button>' +
        '<div class="dock"><button class="main" id="cm-go">' + esc(r.done) + "</button></div>";
      B.innerHTML = h;
      B.querySelectorAll("[data-pki]").forEach(function (b) { b.onclick = function () { c0.pi = +b.getAttribute("data-pki"); var x = r.pick[c0.pi]; $("pk2-line").textContent = x.text; $("pk2-note").textContent = x.note || ""; B.querySelectorAll("[data-pki]").forEach(function (y) { var on = y === b; y.classList.toggle("on", on); y.setAttribute("aria-pressed", on); }); }; });
      $("cm-go").onclick = function () { var x = r.pick[c0.pi]; p.pin = { kind: "pick", choice: x.text, label: x.text, done: true, doneAt: Date.now(), setAt: Date.now() }; save(); afterCommit(p, r.done + "：" + x.text); };
    } else {
      var c = ui.cm[p.id] = ui.cm[p.id] || { chips: chipsFor(r.kind), i: r.kind === "prep" ? 1 : 0, place: "", custom: "" };
      h = '<div class="lbl crk">' + esc(r.text) + "</div>" + commitHtml(c, r.place_ph, "cm") +
        '<button class="ghost small back" id="cm-back">回去再改</button>' +
        '<div class="dock"><button class="sec2 cm-later" id="cm-skip">先不定</button><button class="main" id="cm-go">加到日历</button></div>';
      B.innerHTML = h; bindCommit(c, "cm");
      $("cm-go").onclick = function () {
        var t = cmTime(c), ev = { t: t, min: r.min || 30, summary: evSummary(p), place: c.place, desc: p.out.first_step };
        saveIcs(p, ev);
        p.pin = { kind: r.kind, t: t, label: keyLine(c).split(" · ")[0], place: c.place, done: false, ics: true, setAt: Date.now() }; save(); afterCommit(p, "日历文件存好了，打开就能加进日历");
      };
      $("cm-skip").onclick = function () { p.pin = { kind: r.kind, skip: true, setAt: Date.now() }; save(); afterCommit(p, ""); };
    }
    $("cm-back").onclick = function () { go("check"); };
  }
  function afterCommit(p, msg) { if (msg) toast(msg); renderSave(); appendAsk("save"); screenUpdate(); try { window.scrollTo(0, 0); } catch (e) {} }
  renderSave = (function (orig) { return function () { var p = curP(); if (p && !p.saved && needCommit(p)) { renderCommit(p); return; } orig.apply(this, arguments); }; })(renderSave);
  headText = (function (orig) { return function (scr) { var p = curP(); if (scr === "save" && p && !p.saved && needCommit(p)) return esc(p.out.real.commit_q || "什么时候去？"); return orig.apply(this, arguments); }; })(headText);
  /* 星图上的那颗星标出完成态 */
  mapHtml = (function (orig) { return function (p, zoom) { var h = orig.apply(this, arguments), s = '<div class="d">' + fmtDot(p.landedAt); if (p.pin && p.pin.done && p.out && p.out.real) h = h.replace(s, s + " · ✓ " + esc(p.out.real.done)); return h; }; })(mapHtml);

  /* ---------- 回来时：完成态按钮 → 摘星 ---------- */
  function pendingPin(p) { return !!(p && p.landed && p.pin && !p.pin.done && !p.pin.skip && p.out && p.out.real); }
  function dueProject() {
    var m = /#done=([\w-]+)/.exec(location.hash || ""), hit = null;
    if (m) hit = S.projects.filter(function (q) { return String(q.id) === m[1] && q.pin && q.out && q.out.real; })[0] || null;
    if (hit) return hit;
    return S.projects.filter(function (q) { return pendingPin(q) && Date.now() >= q.pin.t - 30 * 6e4 && Date.now() - q.pin.setAt > 10 * 6e4; })[0] || null;
  }
  function retShell(inner) {
    var R = $("v15-ret"); if (!R) { R = document.createElement("div"); R.id = "v15-ret"; R.className = "v15ret"; R.setAttribute("role", "dialog"); R.setAttribute("aria-modal", "true"); document.body.appendChild(R); }
    R.innerHTML = '<div class="rin"><div class="rtop">另存人生</div>' + inner + "</div>"; R.scrollTop = 0; return R;
  }
  function retClose() { var R = $("v15-ret"); if (R) R.remove(); try { if (/#done=/.test(location.hash)) history.replaceState(null, "", location.href.replace(/#.*$/, "")); } catch (e) {} }
  function pinLine(p) { return (p.pin.label || "") + (p.pin.place ? " · " + p.pin.place : ""); }
  function showReturn(p, view) {
    var r = p.out.real, tags = [p.out.time].concat(p.out.tags || []).filter(Boolean);
    view = view || (p.pin.done ? "done" : "ask");
    if (view === "ask") {
      retShell('<h2 class="h1" id="rt-h">' + esc(r.done) + '吗？</h2><div class="lbl crk">说好的</div><div class="brk">' + bk() + '<div class="gl crstep"><div class="hd" id="rt-line">' + esc(pinLine(p)) + '</div><div class="cm-note">' + esc(p.out.first_step) + "</div></div></div>" +
        '<div class="dock"><button class="sec2" id="rt-re">改个时间</button><button class="main" id="rt-done">' + esc(r.done) + "</button></div>");
      $("rt-done").onclick = function () { p.pin.done = true; p.pin.doneAt = Date.now(); save(); bump("real_done"); showReturn(p, "done"); };
      $("rt-re").onclick = function () { showReturn(p, "re"); };
    } else if (view === "re") {
      var c = { chips: chipsFor(r.kind), i: 0, place: p.pin.place || "", custom: "" };
      retShell('<h2 class="h1">' + esc(r.commit_q || "什么时候去？") + "</h2>" + commitHtml(c, r.place_ph, "rr") +
        '<div class="dock"><button class="sec2" id="rr-back">算了</button><button class="main" id="rr-go">加到日历</button></div>');
      bindCommit(c, "rr");
      $("rr-back").onclick = function () { showReturn(p, "ask"); };
      $("rr-go").onclick = function () { var t = cmTime(c); saveIcs(p, { t: t, min: r.min || 30, summary: evSummary(p), place: c.place, desc: p.out.first_step }); p.pin.t = t; p.pin.label = keyLine(c).split(" · ")[0]; p.pin.place = c.place; p.pin.setAt = Date.now(); save(); retClose(); toast("改好了，新的日历文件存好了"); };
    } else {
      var book = r.kind === "book", cc = { chips: chipsFor("go"), i: 0, place: p.pin.place || "", custom: "" };
      retShell('<h2 class="h1" id="rt-h">' + esc(r.done) + '</h2><div class="cm-star' + (RM ? "" : " pop") + '" id="rt-star">' + STAR_BIG + "</div>" +
        '<div class="brk">' + bk() + '<div class="gl crstep"><div class="lbl" style="color:var(--sub);font-size:12px">说好的</div><div class="hd" id="rt-line">' + esc(pinLine(p)) + "</div>" +
        (p.pin.ics ? '<div class="tags"><span class="gai">已在日历</span><span class="gai">提前 30 分钟提醒</span></div>' : "") +
        '<div class="cm-done" id="rt-ok">✓ ' + esc(r.done) + "</div></div></div>" +
        (book ? '<button class="ghost small" id="rt-cls-open">课也加进日历</button><div id="rt-cls" class="hidden"><div class="lbl crk" style="margin-top:22px">约在哪天？</div>' + commitHtml(cc, r.place_ph, "rc") + '<div class="row"><button class="sec2 small" id="rc-go">加到日历</button></div></div>' : "") +
        '<div class="dock"><button class="main" id="rt-map">看星图</button></div>');
      if (book) {
        bindCommit(cc, "rc");
        $("rt-cls-open").onclick = function () { $("rt-cls").classList.remove("hidden"); this.classList.add("hidden"); try { $("rt-cls").scrollIntoView({ block: "center" }); } catch (e) {} };
        $("rc-go").onclick = function () { var t = cmTime(cc); saveIcs(p, { t: t, min: 60, summary: evSummary(p, r.text.replace(/^约/, "")), place: cc.place, desc: p.out.first_step }); p.pin.cls = { t: t, place: cc.place }; save(); toast("这节课也进日历了"); };
      }
      $("rt-map").onclick = function () { var i = S.projects.indexOf(p); retClose(); if (i >= 0) { S.cur = i; ui.view[p.id] = "map"; go("save"); } };
    }
  }
  setTimeout(function () { try { var p = dueProject(); if (p) { var rs = $("resume"); if (rs) rs.classList.add("hidden"); showReturn(p); } } catch (e) {} }, 0);
  window.addEventListener("hashchange", function () { var p = dueProject(); if (p) showReturn(p); });
  window.__lingcun15 = { ics: function (p) { return (p || curP() || {}).icsLast || ""; }, icsText: function (ev) { return icsText(curP(), ev); }, showReturn: function (i, v) { showReturn(S.projects[i], v); }, todayMin: function () { return todayMin(curP()); }, chips: chipsFor };
