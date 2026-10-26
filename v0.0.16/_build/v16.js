  /* ================= v0.0.16（#49–#54，refs #23）：入口 2A/2B、结果三行、分享卡个人表达、庆祝三档、
     Rive ST01/L01 + CSS 降级、默认静音、1A 现实默认、四 bug、分享计数 click/image/text（3A）；1C 本版无开图署名 ================= */
  (function () { if (/[?&]reduce(=1|&|$)/.test(location.search)) RM = true; })();

  /* ---------- 声音钩子（默认静音；Suno 成片后替换实现） ---------- */
  var LC_MUTE_KEY = "lingcun_v016_muted";
  var LC_AUDIO = window.__lingcunAudio = {
    muted: true,
    setMuted: function (m) {
      this.muted = !!m;
      try { localStorage.setItem(LC_MUTE_KEY, this.muted ? "1" : "0"); } catch (e) {}
      var b = $("menu-mute"); if (b) b.textContent = "声音：" + (this.muted ? "关" : "开");
    },
    play: function (cue) { if (this.muted) return; /* 占位：无成片音频 */ },
    startAmbience: function () {},
    stopAmbience: function () {}
  };
  (function () { try { var v = localStorage.getItem(LC_MUTE_KEY); if (v === "0") LC_AUDIO.muted = false; } catch (e) {} })();
  function ensureMuteMenu() {
    var list = document.querySelector("#menu .menu-list") || document.querySelector(".menu-list");
    if (!list || $("menu-mute")) return;
    var b = document.createElement("button"); b.className = "sec2 mutechip"; b.id = "menu-mute";
    b.textContent = "声音：" + (LC_AUDIO.muted ? "关" : "开");
    b.onclick = function () { LC_AUDIO.setMuted(!LC_AUDIO.muted); toast(LC_AUDIO.muted ? "已静音" : "声音已开（成片到位后会有氛围音）"); };
    var home = $("menu-home"); if (home && home.parentNode === list) list.insertBefore(b, home); else list.appendChild(b);
  }
  setTimeout(ensureMuteMenu, 0);

  /* ---------- 分享计数 3A ---------- */
  ["share_click", "share_image", "share_text"].forEach(function (k) { if (typeof METRICS[k] !== "number") METRICS[k] = 0; });
  renderMetrics = (function (orig) {
    return function () {
      orig.apply(this, arguments);
      var el = $("metrics-body"); if (!el) return;
      var m = METRICS, rate = function (a, b) { return b ? Math.round(a / b * 100) + "%" : "—"; };
      el.innerHTML = '<table><tr><td>开局</td><td>' + m.started + '</td><td></td></tr><tr><td>登月（完成）</td><td>' + m.completed + "</td><td>完成率 " + rate(m.completed, m.started) + "</td></tr>" +
        "<tr><td>看到完成卡</td><td>" + m.card_seen + "</td><td></td></tr>" +
        "<tr><td>点过分享按钮</td><td>" + (m.share_click || 0) + "</td><td>不是发出去的次数</td></tr>" +
        "<tr><td>点过保存图片</td><td>" + (m.share_image || 0) + "</td><td></td></tr>" +
        "<tr><td>点过分享文字</td><td>" + (m.share_text || 0) + "</td><td></td></tr>" +
        "<tr><td>看到 star 入口</td><td>" + m.star_seen + "</td><td></td></tr><tr><td>点 star 入口（点击次数）</td><td>" + m.star_clicked + "</td><td>点击率 " + rate(m.star_clicked, m.star_seen) + "</td></tr></table>" +
        '<p class="hint">这些只是这台设备上的点击次数，不上传、不联网。「点过」不等于真的发出去或保存成功。点了 star 入口不等于 GitHub 上真的多了一颗 star。</p>';
    };
  })(renderMetrics);

  /* ---------- Rive 加载（失败 / 减少动画 → CSS 降级，不挡主流程） ---------- */
  var RIVE = { ok: false, loading: false, api: null, buf: {} };
  function riveBase() {
    try {
      var s = document.querySelector("script[src]") || { src: location.href };
      var u = new URL(".", location.href);
      return u.href.replace(/\/?$/, "/");
    } catch (e) { return ""; }
  }
  function loadRive(cb) {
    /* file:// 下 wasm 会被 CORS 拦住；线上 https 正常。失败走 CSS 降级。 */
    if (RM || location.protocol === "file:" || /[?&]rive=off\b/.test(location.search)) { cb(false); return; }
    if (RIVE.ok) { cb(true); return; }
    if (RIVE.loading) { var t = setInterval(function () { if (!RIVE.loading) { clearInterval(t); cb(RIVE.ok); } }, 80); return; }
    RIVE.loading = true;
    var base = riveBase();
    var scr = document.createElement("script");
    scr.src = base + "vendor/rive.js";
    scr.onload = function () {
      try {
        if (window.rive && window.rive.RuntimeLoader) window.rive.RuntimeLoader.setWasmUrl(base + "vendor/rive.wasm");
        RIVE.api = window.rive; RIVE.ok = !!window.rive;
      } catch (e) { RIVE.ok = false; }
      RIVE.loading = false; cb(RIVE.ok);
    };
    scr.onerror = function () { RIVE.loading = false; RIVE.ok = false; cb(false); };
    document.head.appendChild(scr);
  }
  var RIV_B64 = {
    "lc_st01_star.riv": "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",
    "lc_l01_hold.riv": "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"
  };
  function b64buf(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function fetchRiv(name, cb) {
    if (RIVE.buf[name]) { cb(RIVE.buf[name]); return; }
    if (RIV_B64[name]) { RIVE.buf[name] = b64buf(RIV_B64[name]); cb(RIVE.buf[name]); return; }
    fetch(riveBase() + "rive/" + name).then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(); })
      .then(function (b) { RIVE.buf[name] = b; cb(b); })
      .catch(function () { cb(null); });
  }
  function mkRive(canvas, buf, sm, onLoad, onEvent) {
    if (!RIVE.api || !buf) return null;
    try {
      var r = new RIVE.api.Rive({
        buffer: buf, canvas: canvas, stateMachines: sm, autoplay: true,
        layout: new RIVE.api.Layout({ fit: RIVE.api.Fit.Contain, alignment: RIVE.api.Alignment.Center }),
        onLoad: function () {
          try { r.resizeDrawingSurfaceToCanvas(); } catch (e) {}
          var ins = {}; try { r.stateMachineInputs(sm).forEach(function (i) { ins[i.name] = i; }); } catch (e) {}
          onLoad && onLoad(r, ins);
        }
      });
      if (onEvent) try { r.on(RIVE.api.EventType.RiveEvent, function (e) { onEvent(e.data && e.data.name); }); } catch (e) {}
      return r;
    } catch (e) { return null; }
  }
  function playStar(el, small) {
    if (!el || RM) { el && el.classList.add("pop"); return; }
    loadRive(function (ok) {
      if (!ok) { el.classList.add("pop"); return; }
      fetchRiv("lc_st01_star.riv", function (buf) {
        if (!buf) { el.classList.add("pop"); return; }
        el.innerHTML = ""; el.classList.add("rivebox"); if (small) el.classList.add("small");
        var cv = document.createElement("canvas"); cv.width = small ? 192 : 320; cv.height = cv.width; el.appendChild(cv);
        mkRive(cv, buf, "star_sm", function (r, ins) {
          try {
            if (small && ins.isSmall) ins.isSmall.value = true;
            if (ins.onLight) ins.onLight.fire(); else if (ins.isLit) ins.isLit.value = true;
          } catch (e) {}
          LC_AUDIO.play("star");
        });
      });
    });
  }

  /* ---------- localStep：star_by_q4 + 自定义默认自己做完（bug2） ---------- */
  localStep = (function (orig) {
    return function (p) {
      var o = orig.apply(this, arguments), e = entryOf(p), s = srcOf(p);
      if (s && s.star_by_q4) {
        var a = p.a.l_q4;
        if (a && typeof a.i === "number" && !a.skip) {
          var t0 = (optList(p, skQ(p, 3))[a.i] || {}).text;
          if (t0 && s.star_by_q4[t0]) o.star = s.star_by_q4[t0];
        }
      }
      var a4 = p.a.l_q4;
      if (a4 && a4.otherOn && String(a4.other || "").trim()) {
        var custom = String(a4.other).trim();
        o.first_step = custom;
        if (!/发给|约人|拿给|请人|找人|发给别人/.test(custom)) o.star = "你写下的那一步，自己做完就行";
      }
      return o;
    };
  })(localStep);

  /* ---------- taskStep：协议加 star；改验收失败要明说（bug3） ---------- */
  L_STEP = { type: "object", required: ["title", "first_step"], properties: { title: STR(24), first_step: STR(70), star: STR(40) } };
  taskStep = function (p, req) {
    var st = p.out && p.out.first_step ? { first_step: p.out.first_step, title: p.out.title, star: p.out.star } : localStep(p);
    return T(p, "lib_step", "把第一步写得更贴你的话", ROLE, [
      "library_step 是第一步库给的第一步：一次坐下来能做完（约 15–60 分钟）的具体动作。把它改写得更贴 settings 和 user_idea。",
      "动作本身、分量和里面的具体内容（字母、假名、数字、书名）都不变，不加量；动词开头，一句话，40 字以内。",
      "settings 里如果有「今天能拿出多久」，第一步要在这段时间里做得完：只许缩小，不许加量；不写之后几周的安排。",
      "title：给这件事起一个 2–10 个字的暂定名。",
      "star：今天做到哪儿就够了（摘星 / 验收句）。用户提到验收、摘星、「做到哪儿算完」时必须改 star；不得擅自加「发给别人 / 拿给人看 / 约人」。",
      req ? "request 是用户想怎么改这一步或验收句，在不加量、不加找人的前提下照它改。" : "不写价格数字，不承诺做成。"],
      { settings: createSet(p), plan: createPlanIn(p), library_step: { first_step: st.first_step, star: st.star || (p.out && p.out.star) || localStep(p).star }, request: req || undefined }, L_STEP, { key: "lib_step:" + p.id });
  };
  MOCK.lib_step = function (inp) {
    var req = inp.request || "", star = inp.library_step.star;
    if (/验收|摘星|做到哪儿|不要.*海报|不要.*发给|不要.*别人/.test(req)) star = /发给|别人|海报/.test(req) ? "一页方案写完了" : (star || "自己做完就行");
    return { title: "第一步", first_step: inp.library_step.first_step + (req ? "（按你说的改了）" : ""), star: star };
  };

  /* ---------- 入口 2A：去三大胶囊；文案；找到我的第一步 ---------- */
  var IDEA_EX = [
    "想把《繁花》画展这件事从脑子里拿出来",
    "想开始跑步，但总迈不出第一步",
    "想转去做产品，又不知道从哪证明自己",
    "想学吉他，琴还没挑",
    "想写一个小故事，开头写了又删"
  ];
  var CAT_CYCLE = ["创造", "学习技能", "转行"];
  var CAT_ACT = { "创造": "create", "学习技能": "learn", "转行": "career" };
  headText = (function (orig) {
    return function (scr) {
      if (scr === "pick") return "不想一直这样过";
      if (scr === "idea") return "哪件事想有点不一样？";
      if (scr === "check") {
        var p = curP();
        if (p && p.cat === "create" && p.out && p.out.first_step) return p.revs ? "这是改过的一版" : "今天的三件事";
      }
      return orig.apply(this, arguments);
    };
  })(headText);

  renderPick = (function (orig) {
    return function () {
      var e = S.entry, B = $("b-pick"), anx = anxious(), lo = lastOpen(), h = "", home = ui.pickStep !== "idea";
      $("s-pick").classList.toggle("idea", !home);
      if (home) {
        e.act = ""; /* 2A：不再选大类 */
        h += '<div class="homefig" aria-hidden="true">' + MASCOT.stand + "</div>";
        h += '<div class="homelead"><p class="hl">不想一直这样过。<br>先让一件小事不一样。</p><p class="hs">不必现在想清楚整个人生。从你想改变的一件事开始。</p></div>';
        h += '<div class="homelinks">' + (lo >= 0 ? '<button id="pk-last">继续上次「' + esc(S.projects[lo].title || CATS[S.projects[lo].cat].name) + "」</button>" : "") + '<button id="pk-ex">看看例子</button>' + (S.projects.length ? '<button id="pk-map">星图</button>' : "") + "</div>";
        h += '<div class="dock"><button class="main" id="pk-start">找到我的第一步</button></div>';
        B.innerHTML = h;
        $("pk-start").onclick = function () { ui.pickStep = "idea"; render(); try { $("pk-idea").focus({ preventScroll: true }); } catch (er) {} };
        $("pk-ex").onclick = function () { e.mode = "none"; save(); ui.pickStep = "idea"; render(); var m = $("pk-more"); if (m) m.open = true; };
        if ($("pk-last")) $("pk-last").onclick = function () { S.cur = lo; go(S.projects[lo].stage || "material"); };
        if ($("pk-map")) $("pk-map").onclick = function () { openBag(); };
        return;
      }
      /* idea 屏：沿用原结构，但换问句、加例子、去掉大类标签 */
      e.act = e.act || "";
      var vo = voiceOn();
      h += '<div class="pk-hint" id="pk-desc">你最想让生活里的哪件事有点不一样？</div>';
      h += '<div class="brk' + (vo ? " hidden" : "") + '" id="pk-typebox">' + bk() + '<div class="gl ideabox"><input type="text" id="pk-idea" placeholder="一句就够" aria-label="你最想让生活里的哪件事有点不一样？" autocomplete="off" value="' + esc(e.idea) + '" /><button class="send" id="pk-go">' + ARROW + '<span class="sr" id="pk-go-t">开始</span></button>' + (vo || !voiceCan() ? "" : '<button class="vz-back" id="pk-tovoice">说话</button>') + "</div></div>" + (ui.vnote ? '<div class="pk-hint" id="vz-note">' + esc(ui.vnote) + "</div>" : "");
      if (vo) h += voiceHtml();
      h += '<div class="exchips" id="pk-exchips">' + IDEA_EX.map(function (t, i) { return '<button type="button" data-exi="' + i + '">' + esc(t) + "</button>"; }).join("") + "</div>";
      h += '<p class="netline">' + (voiceCan() ? "说的话由浏览器自带的语音识别转成文字（可能经过浏览器厂商的服务）。" : "") + "写下的内容会发给 AI 润色（默认经过另存人生的中转，中转不保存）；连不上也能走完。</p>";
      h += '<details class="more" id="pk-more"' + (e.mode === "none" || e.goal ? " open" : "") + "><summary>更多</summary>";
      h += '<div class="big" style="margin-top:12px"><button class="bigbtn' + (e.mode === "none" ? " on" : "") + '" id="pk-none"><strong>还没想好，看看例子</strong><small>点一下就预填好，之后都能改。</small></button></div>';
      if (e.mode === "none") {
        var ex = EXAMPLES.filter(function (x) { return !anx || x.small; });
        if (anx) h += '<div class="note" id="anx-reply">听起来最近不太轻松。先不用想清楚以后，把今天的事缩小一点：下面只留几个最小的例子。</div>';
        h += '<div class="qt">' + (anx ? "今天可以先试的一小步" : "挑一个例子") + '</div><div class="big">' + ex.map(function (x, i) {
          return '<button class="bigbtn" data-ex="' + i + '"><strong>' + esc(x.t) + "</strong></button>";
        }).join("") + "</div>";
        ui.ex = ex;
      }
      h += "</details>";
      h += '<button class="ghost small back" id="pk-back">回去</button>';
      B.innerHTML = h;
      var idea = $("pk-idea");
      idea.oninput = function () { e.idea = this.value; save(); };
      idea.onkeydown = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); $("pk-go").click(); } };
      B.querySelectorAll("[data-exi]").forEach(function (b) {
        b.onclick = function () { e.idea = IDEA_EX[+b.getAttribute("data-exi")]; save(); idea.value = e.idea; try { idea.focus(); } catch (er) {} };
      });
      $("pk-go").onclick = function () {
        e.idea = idea.value.trim(); save();
        if (!e.idea) { toast("写一句想法就好"); try { idea.focus(); } catch (er) {} return; }
        var rt0 = routeIdea(e.idea), tl0 = rt0.cat === "tool" && STRONG.tool.test(e.idea) && !CAREER_RE.test(e.idea);
        if (tl0) { startProject("tool", e.idea, rt0.pre, "create"); return; }
        /* 2A：系统分流；不传 act，让 libMatch 用 catOf */
        startProject("create", e.idea, null, "");
      };
      $("pk-back").onclick = function () { ui.pickStep = "home"; render(); };
      $("pk-none").onclick = function () { e.mode = "none"; save(); renderPick(); var m = $("pk-more"); if (m) m.open = true; };
      B.querySelectorAll("[data-ex]").forEach(function (b) {
        b.onclick = function () { var x = ui.ex[+b.getAttribute("data-ex")]; S.entry.small = anxious() || !!x.small; startProject(x.cat, x.idea, x.pre, x.cat === "create" || x.cat === "tool" ? "create" : ""); };
      });
      if ($("pk-tovoice")) $("pk-tovoice").onclick = function () { ui.vmode = ""; ui.vnote = ""; renderPick(); };
      voiceBind();
    };
  })(renderPick);

  /* ---------- 2B：兜底时底部「换一类」 ---------- */
  function isFallbackEntry(p) { var e = entryOf(p); return !!(e && e.fallback); }
  function swapCat(p) {
    var i = CAT_CYCLE.indexOf(p.lc || "创造"); i = (i + 1) % CAT_CYCLE.length;
    var next = CAT_CYCLE[i], act = CAT_ACT[next];
    p.lact = act; p.theme = act;
    var m = libMatch(p.idea || createIdea(p), act);
    p.lc = m.lc; p.lib = m.id; p.borrow = m.borrow; p.libFor = String(p.idea || "").trim(); p.lopts = null; p.loptsFor = "";
    LQ.forEach(function (id) { delete p.a[id]; });
    p.plan = null; p.out = null; save();
    createConcepts(p); go("material"); toast("换成「" + (LIB_SHORT[next] || next) + "」了");
  }
  renderMaterial = (function (orig) {
    return function () {
      orig.apply(this, arguments);
      var p = curP(); if (!p || p.cat !== "create" || !isFallbackEntry(p)) return;
      if ($("swap-cat")) return;
      var dock = $("mat-dock") || $("b-material");
      var bar = document.createElement("div"); bar.className = "swapbar"; bar.id = "swap-cat";
      bar.innerHTML = '<p class="hint">我先按「' + esc(libName(p)) + '」来问。不对？</p><button class="ghost small" id="btn-swap">换一类</button>';
      if ($("mat-dock")) $("b-material").insertBefore(bar, $("mat-dock"));
      else dock.appendChild(bar);
      $("btn-swap").onclick = function () { swapCat(p); };
    };
  })(renderMaterial);

  /* ---------- 结果三行 + 形态 + 改验收本地（bug3） ---------- */
  function formOf(p) {
    var e = entryOf(p), o = p.out || {};
    if (o.real || (e && e.mode === "real")) return "行动卡";
    var q4 = ans(p, "l_q4") || "";
    if (/草图|说明|流程|方案|展签|清单|规则/.test(q4) || (e && /exhibition|event|community|project_plan|campaign/.test(e.id))) return "方案框架";
    if (/原型|截图|第一版|房间|草样/.test(q4) || (e && /game|novel|comic|writing|program|website/.test(e.id))) return "作品";
    return "方案框架";
  }
  function formNote(f) {
    return f === "行动卡" ? "今天这一下就够了" : f === "作品" ? "这是第一版" : "这是一页方案，不是办成的活动";
  }
  function friendAsk(f) {
    return f === "行动卡" ? "你最近想做成的一件小事是什么？" : f === "作品" ? "你愿意看我的第一版，并告诉我哪一句最真吗？" : "如果只改一件小事，你会从哪里开始？";
  }
  function celeTier(p, kind) {
    /* kind: land | star | return */
    if (kind === "return") return { k: "C", t: "我试过了，并发现了一个问题" };
    if (kind === "star" && p.out && p.out.real) return { k: "A", t: "我决定从这里开始" };
    var f = formOf(p);
    if (f === "作品" || f === "方案框架") return { k: "B", t: "我做出了第一版" };
    return { k: "A", t: "我决定从这里开始" };
  }
  renderCreateCheck = function (p) {
    var B = $("b-check"), o = p.out, rt = routeOf(p), tp = totalParts(p, rt.total), f = formOf(p);
    var idea = createIdea(p), starShow = o.real ? o.real.done : o.star;
    var h = '<div class="threelines" id="cr-3">' +
      '<div class="tl" id="tl-idea"><span class="lbl">我想改变什么</span><span class="v">' + esc(idea) + '</span><button type="button" class="ed" id="tl-idea-ed">改</button></div>' +
      '<div class="tl main" id="tl-step"><span class="lbl">我先做什么</span><span class="v" id="cr-first">' + esc(o.first_step) + "</span></div>" +
      '<div class="tl" id="tl-star"><span class="lbl">今天做到哪儿就够了</span><span class="v" id="cr-star-v">' + esc(starShow || "") + '</span><button type="button" class="ed" id="tl-star-ed">改</button></div></div>' +
      '<p class="formnote" id="cr-form">' + esc(formNote(f)) + " · " + esc(f) + "</p>" +
      '<div class="tags" style="margin:0 0 10px">' + [o.time].concat(o.tags || []).filter(Boolean).map(function (t) { return '<span class="gai">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="ck-edit" id="ck-edit"><input type="text" id="sn-req" maxlength="120" placeholder="想怎么改第一步或验收？一句就好" /><div class="row" style="margin-top:8px"><button class="sec2 small" id="sn-go">按这个改</button></div><div class="err" id="sn-err"></div><div id="sn-slot"></div></div>' +
      '<div class="gl crfw" id="cr-fw"><div class="lbl">框架</div>' + LQ.map(function (id) { var f0 = fieldById(p, id); return '<div class="fr"><span class="lbl">' + esc(f0.short || f0.lbl) + "</span><span>" + pt(vText(p, id)) + "</span></div>"; }).join("") + "</div>" +
      (rt.route.length && oneLine(p) ? '<div class="gl crlater crl1" id="cr-later"><span class="lbl">之后</span><span>' + rt.route.map(function (x) { return esc(x.step); }).join(" → ") + "</span></div>" : "") +
      (rt.route.length && !oneLine(p) ? '<details class="gl crlater" id="cr-later"><summary><span><span class="lbl">之后</span> ' + rt.route.length + " 段路线" + (tp.val ? " · " + esc(tp.lbl === "合计" ? tp.val : tp.lbl + " " + tp.val) : "") + "</span>" + CHEV + "</summary>" + axisHtml(rt) + "</details>" : "") +
      '<details class="more" id="ck-more"><summary>更多</summary><div class="row"><button class="ghost small" id="ck-mat">回去补材料</button><button class="ghost small" id="ck-dl">下载 .html</button></div></details>' +
      '<div class="err" id="ck-err"></div><div class="dock"><button class="main" id="ck-next">就它了</button></div>';
    B.innerHTML = h;
    $("tl-idea-ed").onclick = function () { S.cur = -1; ui.pickStep = "idea"; S.entry.idea = idea; go("pick"); toast("改那一句，再重新开始这一局"); };
    $("tl-star-ed").onclick = function () {
      var cur = $("cr-star-v").textContent, nv = prompt("今天做到哪儿就够了？", cur);
      if (nv == null) return; nv = String(nv).trim().slice(0, 40); if (!nv) { toast("写一句就好"); return; }
      if (p.out.real) p.out.real.done = nv; p.out.star = nv; save(); $("cr-star-v").textContent = nv; toast("验收句已改（本地，不耗次数）");
    };
    $("sn-go").onclick = function () {
      var w = $("sn-req").value.trim(); if (!w) { $("sn-err").textContent = "写一句想怎么改。"; return; } $("sn-err").textContent = "";
      var wantStar = /验收|摘星|做到哪儿|不要.*海报|不要.*发给|不要.*别人|星/.test(w);
      var oldStar = p.out.star || (p.out.real && p.out.real.done) || "";
      if (!AI.mode()) {
        if (wantStar) { $("sn-err").textContent = "现在连不上 AI。点验收旁的「改」可直接改一行。"; return; }
        $("sn-err").textContent = "现在连不上 AI。可以照库里这一步先做，或者回去换一个选项。"; return;
      }
      runTask(p, taskStep(p, w), $("sn-slot"), function (o2) {
        var changed = false;
        if (o2 && o2.first_step && !NO_PRICE.test(o2.first_step)) { p.out.first_step = o2.first_step; if (o2.title) p.out.title = o2.title; changed = true; }
        if (o2 && o2.star && !NO_PRICE.test(o2.star)) {
          p.out.star = o2.star; if (p.out.real) p.out.real.done = o2.star; changed = true;
        }
        if (wantStar && (!o2 || !o2.star || o2.star === oldStar)) {
          $("sn-err").textContent = "验收句没改成，请再试一次或自己点「改」写一行";
          /* 不空刷：保留输入 */
          if (changed) { p.revs = (p.revs || 0) + 1; save(); $("cr-first").textContent = p.out.first_step; }
          return;
        }
        if (changed) { p.revs = (p.revs || 0) + 1; save(); }
        if (curP() === p && S.stage === "check") { renderCheck(); appendAsk("check"); }
      });
    };
    $("ck-mat").onclick = function () { go("material"); };
    $("ck-dl").onclick = function () { download(fileName(p), renderOut(p, true)); };
    $("ck-next").onclick = function () { if (!qAnswered(p.degree)) { p.degree = { skip: true }; save(); } go("save"); };
  };

  /* ---------- showResume：已登月不再说「确认登月」（bug4） ---------- */
  showResume = function () {
    var p = curP(); if (!p) return;
    if (p.landed) {
      var pl = planetOf(p.planet);
      $("resume").innerHTML = '<div><b>欢迎回来。你已经登上了' + esc(pl.n) + '。</b>要看星图、分享，还是再改一版？</div><div class="hint" style="margin-top:4px">位置：已登月 · ' + esc(CATS[p.cat].name) + (p.title ? "「" + esc(p.title) + "」" : "") + "</div>" +
        '<div class="row"><button class="small" id="rs-map">看星图</button><button class="sec2 small" id="rs-share">分享</button><button class="ghost small" id="rs-edit">再改</button></div>';
      $("resume").classList.remove("hidden"); try { window.scrollTo(0, 0); } catch (e) {}
      $("rs-map").onclick = function () { $("resume").classList.add("hidden"); ui.view[p.id] = "map"; S.stage = "save"; go("save"); };
      $("rs-share").onclick = function () { $("resume").classList.add("hidden"); ui.view[p.id] = "map"; S.stage = "save"; go("save"); setTimeout(function () { var b = $("sc-share") || $("nx-share"); if (b) b.click(); }, 200); };
      $("rs-edit").onclick = function () { $("resume").classList.add("hidden"); go("material"); toast("改一改材料；改完再确认一版"); };
      return;
    }
    var st = STAGES[stageIdx(S.stage)], q = S.ask.q && !S.ask.resolved ? "「" + S.ask.q + "」（还没解决）" : "「" + st.todo + "」";
    $("resume").innerHTML = '<div><b>欢迎回来。上次做到这里，留下了这个问题：</b>' + esc(q) + '</div><div class="hint" style="margin-top:4px">位置：' + esc(st.name) + " · " + esc(CATS[p.cat].name) + (p.title ? "「" + esc(p.title) + "」" : "") + "</div>" +
      '<div class="row"><button class="small" id="rs-go">继续</button><button class="sec2 small" id="rs-edit">修改</button><button class="ghost small" id="rs-later">先放下</button></div>';
    $("resume").classList.remove("hidden"); try { window.scrollTo(0, 0); } catch (e) {}
    $("rs-go").onclick = function () { $("resume").classList.add("hidden"); if (S.ask.q && !S.ask.resolved) S.ask.stage = S.stage; go(S.stage); };
    $("rs-edit").onclick = function () { $("resume").classList.add("hidden"); go("material"); toast("改一改材料；改完再做一次第一版"); };
    $("rs-later").onclick = function () { $("resume").classList.add("hidden"); p.paused = true; S.cur = -1; go("pick"); toast("先放下了，东西都还在星图里"); };
  };

  /* land 后 stage → again 语义：航线文案；S.stage 仍可为 save 以显示星图，但 STAGES 展示名在 landed 时换 */
  var _stageNameSave = STAGES[4].name, _stageTodoSave = STAGES[4].todo;
  routeUpdate = (function (orig) {
    return function () {
      var p = curP();
      if (p && p.landed) { STAGES[4].name = "已登月"; STAGES[4].todo = "看看星图或分享"; }
      else { STAGES[4].name = _stageNameSave; STAGES[4].todo = _stageTodoSave; }
      return orig.apply(this, arguments);
    };
  })(routeUpdate);

  /* ---------- L01 接确认登月：有 Rive 时增强视觉，仍走现有 armHold 计时 ---------- */
  renderSave = (function (orig) {
    return function () {
      orig.apply(this, arguments);
      var p = curP(); if (!p || p.saved || needCommit(p)) return;
      var box = $("lc-box"); if (!box || RM) return;
      loadRive(function (ok) {
        if (!ok || !$("lc-go")) return;
        fetchRiv("lc_l01_hold.riv", function (buf) {
          if (!buf || !$("lc-go")) return;
          if ($("lc-rive")) return;
          var wrap = document.createElement("div"); wrap.className = "hold-rive"; wrap.id = "lc-rive";
          var cv = document.createElement("canvas"); cv.width = 440; cv.height = 440; wrap.appendChild(cv);
          var ring = box.querySelector(".ringwrap"); if (ring) ring.parentNode.insertBefore(wrap, ring);
          var hd = { ready: false };
          mkRive(cv, buf, "hold_sm", function (r, ins) {
            hd.ready = true; hd.ins = ins;
            if (ins.isReduced) try { ins.isReduced.value = !!RM; } catch (e) {}
          });
          var btn = $("lc-go");
          btn.addEventListener("pointerdown", function () {
            if (!hd.ready || !hd.ins) return;
            try { hd.ins.isHolding.value = true; if (hd.ins.progress) hd.ins.progress.value = 0; } catch (e) {}
            var t0 = now(), raf = 0;
            var loop = function () {
              if (!btn.classList.contains("charging")) return;
              var k = Math.min(1, (now() - t0) / 1200);
              try { if (hd.ins.progress) hd.ins.progress.value = Math.round(k * 1000) / 10; } catch (e) {}
              if (k < 1) raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
          });
          btn.addEventListener("pointerup", function () {
            if (!hd.ready || !hd.ins) return;
            try {
              if (btn.classList.contains("full")) { hd.ins.onComplete && hd.ins.onComplete.fire(); LC_AUDIO.play("launch"); }
              else { hd.ins.isHolding.value = false; hd.ins.onCancel && hd.ins.onCancel.fire(); }
            } catch (e) {}
          });
        });
      });
    };
  })(renderSave);

  /* ---------- 庆祝档 + ST01：回来时 / 摘星 ---------- */
  showReturn = (function (orig) {
    return function (p, view) {
      orig.apply(this, arguments);
      view = view || (p.pin && p.pin.done ? "done" : "ask");
      if (view !== "done") return;
      var tier = celeTier(p, "return");
      var star = $("rt-star"); if (star) {
        playStar(star, false);
        var t = document.createElement("div"); t.className = "cele"; t.innerHTML = '<div class="ct">' + esc(tier.t) + "</div>";
        star.parentNode.insertBefore(t, star.nextSibling);
      }
    };
  })(showReturn);

  afterCommit = (function (orig) {
    return function (p, msg) {
      orig.apply(this, arguments);
      /* 挑好了等完成态：庆祝 A */
      if (p.pin && p.pin.done) {
        var tier = celeTier(p, "star");
        setTimeout(function () {
          var el = $("rt-star") || $("b-save");
          if ($("rt-star")) playStar($("rt-star"), false);
          toast(tier.t);
        }, 100);
      }
    };
  })(afterCommit);

  /* ---------- 分享卡：个人表达 + 问句；无 GitHub 主文案；无开图署名（1C） ---------- */
  shareText = function (p) {
    var pl = planetOf(p.planet), f = formOf(p);
    var line1 = "我想改变：" + (p.idea || p.title || "");
    var line2 = "我先做了：" + ((p.out && p.out.first_step) || "");
    var say = (p.change && p.change.trim()) ? p.change.trim() : "我不想再把想做的事一直往后放。这次，我选择先迈出自己的一步。";
    return "另存人生 · 第 " + (p.planet + 1) + " 次登陆（" + pl.n + "）\n「" + (p.title || CATS[p.cat].name) + "」\n" + line1 + "\n" + line2 + "\n\n" + say + "\n\n" + friendAsk(f);
  };
  shareCardHtml = function (p, pl) {
    var f = formOf(p), idea = p.idea || createIdea(p) || "", step = (p.out && p.out.first_step) || excerptOf(p);
    var say = changeLine(p) || "我不想再把想做的事一直往后放。这次，我选择先迈出自己的一步。";
    return '<div class="sharecard" id="share-card"><div class="sc-brand"><b>另存人生</b><span>第 ' + (p.planet + 1) + " 次登陆 · " + esc(pl.n) + '</span></div><div class="sc-title" id="sc-title">「' + esc(p.title || CATS[p.cat].name) + '」</div>' +
      '<div class="sc-lines"><div class="slbl">我想改变什么</div><div>' + esc(short(idea, 36)) + '</div><div class="slbl">我先做了</div><div>' + esc(short(step, 40)) + "</div></div>" +
      '<div class="sc-change" id="sc-change">' + esc(say) + '</div><div class="sc-ask">' + esc(friendAsk(f)) + "</div>" +
      '<div class="sc-foot"><span>' + esc(fmtDay(p.landedAt)) + "</span><span></span></div></div>";
  };
  cardCanvas = (function (orig) {
    return function (p) {
      /* 在原卡基础上改文案层：去掉 GitHub，加上问句；不画开图署名 */
      var pl = planetOf(p.planet), W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
      var F = 'LCSans,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif', HF = 'LCHead,LCHeadX,' + F, INK = "#231C45";
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#B9A6EE"); g.addColorStop(.24, "#D3C6F6"); g.addColorStop(.48, "#EAE4F8"); g.addColorStop(.62, "#F2EFF8"); g.addColorStop(1, "#E7E0F6"); x.fillStyle = g; x.fillRect(0, 0, W, H);
      var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 0; i < 70; i++) { x.fillStyle = "rgba(35,28,69," + (.15 + rnd() * .3).toFixed(2) + ")"; x.beginPath(); x.arc(rnd() * W, rnd() * H * .55, rnd() * 2.4 + .8, 0, 7); x.fill(); }
      x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(W - 190, 210, 40, 0, 7); x.stroke(); x.fillStyle = INK; x.beginPath(); x.arc(W - 190, 210, 12, 0, 7); x.fill();
      x.fillStyle = INK; x.font = "64px " + HF; x.fillText("另存人生", 80, 150);
      x.globalAlpha = .7; x.font = "400 32px " + F; x.fillText("第 " + (p.planet + 1) + " 次登陆 · " + pl.n, 80, 205); x.globalAlpha = 1;
      x.font = "68px " + HF; var ty = 340; wrapLines(x, "「" + (p.title || CATS[p.cat].name) + "」", W - 160, 2).forEach(function (l) { x.fillText(l, 80, ty); ty += 84; });
      var idea = p.idea || "", step = (p.out && p.out.first_step) || excerptOf(p) || "";
      x.font = "400 28px " + F; x.globalAlpha = .65; x.fillText("我想改变什么", 80, ty + 20); x.globalAlpha = 1;
      x.font = "400 34px " + F; ty += 70; wrapLines(x, idea || "（这一件）", W - 160, 2).forEach(function (l) { x.fillText(l, 80, ty); ty += 48; });
      x.font = "400 28px " + F; x.globalAlpha = .65; x.fillText("我先做了", 80, ty + 16); x.globalAlpha = 1;
      x.font = "400 34px " + F; ty += 66; wrapLines(x, step, W - 160, 3).forEach(function (l) { x.fillText(l, 80, ty); ty += 48; });
      var say = (p.change && p.change.trim()) ? p.change.trim() : "我不想再把想做的事一直往后放。这次，我选择先迈出自己的一步。";
      x.font = "44px " + HF; ty += 40; wrapLines(x, say, W - 160, 3).forEach(function (l) { x.fillText(l, 80, ty); ty += 58; });
      x.font = "400 32px " + F; x.globalAlpha = .85; ty += 20; wrapLines(x, friendAsk(formOf(p)), W - 160, 2).forEach(function (l) { x.fillText(l, 80, ty); ty += 46; }); x.globalAlpha = 1;
      x.globalAlpha = .7; x.font = "400 28px " + F; x.fillText(fmtDay(p.landedAt), 80, H - 90); x.globalAlpha = 1;
      return c;
    };
  })(cardCanvas);

  /* 分享按钮计数：点分享区 → share_click；图片 → share_image；文字 → share_text */
  renderSave = (function (orig) {
    return function () {
      orig.apply(this, arguments);
      var png = $("sc-png"), sh = $("sc-share");
      if (png && !png.getAttribute("data-v16")) {
        png.setAttribute("data-v16", "1");
        var old = png.onclick;
        png.onclick = function () {
          bump("share_click"); bump("share_image");
          var p = curP(), cv = cardCanvas(p), nm = "另存人生_登陆卡_" + String(p.title || "作品").replace(/[\\\/:*?"<>|\s「」]+/g, "_").slice(0, 20) + ".png";
          if (cv.toBlob) cv.toBlob(function (b) { downloadBlob(nm, b); }, "image/png");
        };
      }
      if (sh && !sh.getAttribute("data-v16")) {
        sh.setAttribute("data-v16", "1");
        sh.onclick = function () {
          bump("share_click"); bump("share_text");
          var p = curP(), t = shareText(p);
          var fall = function () { var out = $("sc-out"); if (out) { out.innerHTML = '<label class="field" style="margin-top:8px"><span class="h">复制下面这段话，发给朋友或贴到社交平台：</span><textarea id="sc-text" rows="5" readonly>' + esc(t) + "</textarea></label>"; var ta = $("sc-text"); try { ta.focus(); ta.select(); } catch (e) {} } };
          if (navigator.share) { navigator.share({ title: "另存人生", text: t }).catch(function () {}); return; }
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("分享文字已复制"); fall(); }, fall); else fall();
        };
      }
    };
  })(renderSave);

  /* 匹配：画展优先 exhibition（库 priority 已更高；再保险） */
  matchEntry = (function (orig) {
    return function (t, cat, strict, noBorrow) {
      if (cat === "创造" && /画展|展览|个展|策展/.test(String(t || "")) && !/线上|NFT|数字藏品|元宇宙/.test(String(t || ""))) {
        var ex = LIB_BY.exhibition; if (ex) return ex;
      }
      return orig.apply(this, arguments);
    };
  })(matchEntry);

  window.__lingcun16 = { formOf: formOf, celeTier: celeTier, playStar: playStar, mute: function () { return LC_AUDIO.muted; }, rive: function () { return RIVE; } };
