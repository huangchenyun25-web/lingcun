  /* ================= v0.0.18（#58，refs #23）：人生试玩。
     首页 A1 → 带上过去（做过 / 想改）→ 点选带走与放下 → 好奇方向六项 → 一条尝试 → 一点另存成功 → 分享卡。
     四问不再走上屏。不开开图。另存成功不按住。 ================= */
  (function () {
    var DIRS = [
      { id: "express", label: "表达" },
      { id: "tech", label: "科技" },
      { id: "body", label: "身体" },
      { id: "craft", label: "手作与现场" },
      { id: "work", label: "工作方式" },
      { id: "other", label: "其他" }
    ];
    var EX_DID = ["办过线下活动策划，负责现场和讲故事", "带过团队做内容，但烦反复汇报", "学过一段时间吉他，后来搁下了", "写过公众号，更新断了"];
    var EX_WANT = ["总把想做的事往后放", "想碰科技又不知从哪下手", "想开始跑步迈不出第一步"];
    var SAMPLE = ["现场观察", "讲故事", "反复汇报", "想开始的那件事"];
    var DICT = [
      [/现场/, "现场观察"], [/讲故事|会讲|讲述/, "讲故事"], [/活动策划|线下活动|办过活动|策划/, "活动策划"],
      [/汇报/, "反复汇报"], [/供应商/, "协调供应商"], [/带团队|带过团队|带人/, "带团队"],
      [/做内容|内容/, "做内容"], [/公众号/, "写公众号"], [/吉他/, "练过吉他"],
      [/搁下|断更|更新断|停了/, "后来搁下了"], [/跑步/, "想跑步"], [/迈不出/, "迈不出第一步"],
      [/往后放|拖延/, "老是往后放"], [/科技|新技术|AI|人工智能|编程/, "对科技好奇"]
    ];
    var ENOUGH = {
      express: ["写下题目和三句你真想说的话。", "写完一页，自己读得下去就行。"],
      tech: ["写下题目和三个观察点。", "发出三条笔记到备忘录即可。"],
      body: ["做完这一次，自己记一句感受。", "今天只完成这一小段，不必加量。"],
      craft: ["做出一个能摆出来的小样。", "留一件今天能收好的小东西。"],
      work: ["用三十分钟做完这一件，不必汇报。", "做完就停，不补第二件。"],
      other: ["做完这一件小事，自己觉得做完了就行。", "今天只做这一件。"]
    };

    blank = (function (orig) {
      return function () { var b = orig(); if (!b.entry.kind) b.entry.kind = "did"; return b; };
    })(blank);
    STAGES[0].name = "开始这一版"; STAGES[0].todo = "从你做过或想改的一件事开始";
    STAGES[1].name = "留下与放下"; STAGES[1].todo = "点选带走和放下";
    STAGES[2].name = "好奇方向"; STAGES[2].todo = "选一个想试试的方向";
    STAGES[3].name = "这一版尝试"; STAGES[3].todo = "看这一条愿不愿意试";
    STAGES[4].name = "另存成功"; STAGES[4].todo = "留下这一版，或去分享";
    STAGES[5].name = "之后"; STAGES[5].todo = "你来定";
    try { VSAY.idle = "按住，说说那件事"; } catch (e) {}

    function ideaOk(t) { return String(t || "").replace(/\s+/g, "").length >= 6; }
    function uniq(a) { var o = [], s = {}; a.forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } }); return o; }
    function splitFrags(text) {
      var t = String(text || ""), hit = [];
      DICT.forEach(function (pair) { if (pair[0].test(t)) hit.push(pair[1]); });
      hit = uniq(hit);
      if (hit.length < 2) {
        String(t).split(/[，。！？、；,\n]/).forEach(function (raw) {
          var s = raw.replace(/^(我|你)?(以前|曾经|后来|但是|但|又|总是|总|想要|想|负责|办过|学过|写过|带过|做过)/, "").trim();
          if (s.length >= 2 && s.length <= 8) hit.push(s);
        });
        hit = uniq(hit);
      }
      hit = hit.slice(0, 6);
      if (hit.length >= 2) return { list: hit, weak: false };
      if (hit.length === 1) return { list: uniq(hit.concat(SAMPLE)).slice(0, 4), weak: true };
      return { list: SAMPLE.slice(), weak: true };
    }
    function v18of(p) {
      if (!p || !p.v18) return null;
      var v = p.v18;
      v.fragments = v.fragments || []; v.pick = v.pick || {}; v.hide = v.hide || {};
      v.take = v.take || []; v.leave = v.leave || []; v.pool = v.pool || [];
      if (typeof v.ix !== "number") v.ix = 0;
      if (typeof v.unlike !== "number") v.unlike = 0;
      return v;
    }
    function syncPick(v) {
      v.take = []; v.leave = [];
      v.fragments.forEach(function (f) { if (v.pick[f] === "take") v.take.push(f); else if (v.pick[f] === "leave") v.leave.push(f); });
    }
    function dirById(id) { for (var i = 0; i < DIRS.length; i++) if (DIRS[i].id === id) return DIRS[i]; return null; }
    function dirLabel(v) {
      if (!v || !v.direction) return "";
      if (v.direction.id === "other") return v.direction.custom || "其他";
      return v.direction.label || "";
    }
    function join(a) { return (a || []).join("、"); }
    function shortTake(s) { s = String(s || ""); var x = s.replace(/^现场/, "").replace(/^反复/, ""); return (x || s).slice(0, 4); }
    function defaultTitle(v) { return shortTake(v.take[0] || "这一版") + " × " + (dirLabel(v) || "新方向"); }
    function enoughAt(v, i) { var a = ENOUGH[v.direction && v.direction.id] || ENOUGH.other; return "今天做到这儿就够了：" + a[i % a.length]; }
    function compose(v, i) {
      var t0 = v.take[0] || "这件事", t1 = v.take[1] || t0, d = dirLabel(v), id = (v.direction && v.direction.id) || "other", leave = v.leave[0] || "";
      var lines = {
        express: [
          "用你擅长的" + t0 + "，写一段今天能读完的短内容。",
          "把「" + t0 + "」写成三句话，只给自己看。",
          "用" + t1 + "讲一件真经历过的小事，控制在一页里。"
        ],
        tech: [
          "用你擅长的" + t0 + "，做一期「普通人怎样使用新技术」的内容。",
          "把一次身边见到的新东西，写成三条「普通人怎么用」的短笔记。",
          "挑一个你好奇的小工具，用" + t0 + "记三条它帮得上什么。"
        ],
        body: [
          "用你已经会的" + t0 + "，安排一次二十分钟、一个人能完成的活动。",
          "今天只做一件小事：出门走十五分钟，回来用" + t0 + "记一句感受。",
          "把「" + t0 + "」用在一次很轻的活动上，做完就停。"
        ],
        craft: [
          "用" + t0 + "，做一件今天能摆出来的小样。",
          "把" + t1 + "用在一件不必给人看的小作品上。",
          "留一个十分钟能做完的现场小尝试，只用你带走的" + t0 + "。"
        ],
        work: [
          "用" + t0 + "换一种做事节奏：今天只做一件不必反复汇报的小事。",
          (leave ? "先放下「" + leave + "」，" : "") + "用" + t0 + "完成一件三十分钟内的小样。",
          "把" + t0 + "用在今天的一件工作上，做完就停，不补第二件。"
        ],
        other: [
          "用你带走的「" + t0 + "」，在「" + d + "」里做一件今天能完成的小事。",
          "围绕「" + d + "」，用" + t0 + "写下今天能做完的一步。",
          "只用「" + t0 + "」试一次「" + d + "」，一个人做完就行。"
        ]
      };
      var pool = lines[id] || lines.other;
      return pool[i % pool.length];
    }
    function libLine(v) {
      try {
        var blob = (curP() && curP().idea || "") + " " + dirLabel(v) + " " + (v.take || []).join(" ");
        var m = libMatch(blob, "");
        var e = m && LIB_BY[m.id];
        if (!e || e.fallback || !e.first_step) return "";
        if (/约人|找朋友|发给|发布|群里|同伴|搭档/.test(e.first_step)) return "";
        v.libId = e.id;
        return String(e.first_step).replace(/[。．]$/, "") + "。";
      } catch (err) { return ""; }
    }
    function buildPool(v) {
      var pool = [compose(v, 0), compose(v, 1), compose(v, 2)];
      var lib = libLine(v);
      if (lib && pool.indexOf(lib) < 0) pool.push(lib);
      v.pool = uniq(pool);
      if (v.ix >= v.pool.length) v.ix = 0;
    }
    function applyIx(p) {
      var v = v18of(p);
      v.attempt = v.pool[v.ix] || compose(v, v.ix);
      v.enough = enoughAt(v, v.ix);
      if (!v.titleEdited) v.title = defaultTitle(v);
      p.title = v.title;
      p.out = { title: v.title, first_step: v.attempt, star: v.enough, summary: v.attempt };
      p.updatedAt = Date.now();
    }
    function touchV(p) { p.updatedAt = Date.now(); save(); }

    function beginV18(idea) {
      idea = String(idea || "").trim();
      if (!ideaOk(idea)) return false;
      var sp = splitFrags(idea);
      var p = newProject("generic", idea);
      p.theme = "";
      p.small = true;
      p.v18 = { kind: S.entry.kind === "want" ? "want" : "did", fragments: sp.list, weak: sp.weak, pick: {}, take: [], leave: [], direction: null, attempt: "", enough: "", title: "", titleEdited: false, hide: {}, pool: [], ix: 0, unlike: 0, libId: "", edited: false };
      p.title = short(idea, 16);
      S.projects.push(p); S.cur = S.projects.length - 1; bump("started"); bump("v18_start");
      go("material");
      return true;
    }
    function lastV18() {
      var best = -1, t = -1;
      S.projects.forEach(function (p, i) { if (p.v18 && (p.updatedAt || 0) >= t) { t = p.updatedAt || 0; best = i; } });
      return best;
    }
    function legacy(elId) {
      var B = $(elId); if (!B) return;
      B.innerHTML = '<p class="v18sub">这是更早的一版记录。这一版不再沿用以前的提问。</p><div class="dock"><button class="main" id="leg-home">回到首页</button></div><p style="text-align:center"><button class="sec2" id="leg-map" style="min-width:12em">看星图</button></p>';
      $("leg-home").onclick = function () { S.cur = -1; ui.pickStep = "home"; go("pick"); };
      $("leg-map").onclick = function () { openBag(); };
    }

    curScreen = (function (orig) {
      return function () {
        var p = curP();
        if (p && p.v18 && S.stage === "draft") return "draft";
        if (p && p.v18 && S.stage === "save") return (ui.view && ui.view[p.id]) || "ok";
        return orig.apply(this, arguments);
      };
    })(curScreen);

    headText = (function (orig) {
      return function (scr) {
        if (scr === "pick") return "如果保留过去的经验，<br>换一种接下来的生活，<br>你想试试什么？";
        if (scr === "idea") return "先带上一件<br>和你有关的事。";
        if (scr === "material") return "哪些想带走，<br>哪些想放下？";
        if (scr === "draft" || scr === "wait" || scr === "outline") return "接下来，你更好奇<br>往哪边试试？";
        return orig.apply(this, arguments);
      };
    })(headText);

    renderPick = function () {
      var e = S.entry, B = $("b-pick"), home = ui.pickStep !== "idea", lo = lastV18();
      $("s-pick").classList.toggle("idea", !home);
      if (!e.kind) e.kind = "did";
      if (home) {
        var h = '<p class="v18sub">花几分钟，给自己留一个新方向。</p>';
        h += '<div class="homelinks">' + (lo >= 0 ? '<button id="pk-last">继续上次「' + esc(S.projects[lo].title || "这一版") + "」</button>" : "") + (S.projects.length ? '<button id="pk-map">星图</button>' : "") + "</div>";
        h += '<div class="dock"><button class="main" id="pk-start">开始这一版</button></div>';
        B.innerHTML = h;
        $("pk-start").onclick = function () { ui.pickStep = "idea"; ui.vnote = ""; render(); };
        if ($("pk-last")) $("pk-last").onclick = function () { S.cur = lo; var p = S.projects[lo]; ui.pickStep = "home"; go(p.stage && p.stage !== "pick" ? p.stage : "material"); };
        if ($("pk-map")) $("pk-map").onclick = function () { openBag(); };
        return;
      }
      var vo = voiceOn(), ex = e.kind === "want" ? EX_WANT : EX_DID;
      var h2 = '<div class="pk-l pk-voice">' + (vo ? voiceHtml() : "") + "</div>";
      h2 += '<div class="pk-r pk-side">';
      h2 += '<div class="pk-seg" role="tablist" id="pk-seg"><button type="button" data-kind="did"' + (e.kind !== "want" ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + '>做过的事</button><button type="button" data-kind="want"' + (e.kind === "want" ? ' class="on" aria-selected="true"' : ' aria-selected="false"') + ">想改的事</button></div>";
      h2 += '<div class="exchips" id="pk-exchips">' + ex.map(function (t, i) { return '<button type="button" data-exi="' + i + '">' + esc(t) + "</button>"; }).join("") + "</div>";
      h2 += '<button type="button" id="pk-type" class="' + (vo ? "" : "hidden") + '"><span class="ph">打字</span><span class="dk">打字输入</span></button>';
      h2 += '<div class="brk' + (vo ? " hidden" : "") + '" id="pk-typebox">' + bk() + '<div class="gl ideabox"><input type="text" id="pk-idea" placeholder="一句具体的事" aria-label="先带上一件和你有关的事" autocomplete="off" value="' + esc(e.idea || "") + '" /><button class="send" id="pk-go" aria-label="用这句">' + ARROW + '<span class="sr">用这句</span></button>' + (vo ? "" : (voiceCan() ? '<button class="vz-back" id="pk-tovoice">说话</button>' : "")) + "</div></div>";
      h2 += '<div id="pk-err" role="status">' + esc(ui.vnote || "") + "</div>";
      h2 += '<p class="netline">说的话由浏览器转成文字。能连上时才会把字发给 AI 润色；连不上也能走完。</p>';
      h2 += '<button class="ghost small back" id="pk-back">回去</button></div>';
      B.innerHTML = h2;
      B.querySelectorAll("[data-kind]").forEach(function (b) {
        b.onclick = function () { e.kind = b.getAttribute("data-kind"); save(); renderPick(); };
      });
      var idea = $("pk-idea");
      function submit() {
        e.idea = idea.value.trim(); save();
        if (!ideaOk(e.idea)) { $("pk-err").textContent = "多说一点具体的事，后面才能拆开带走和放下"; try { idea.focus(); } catch (err) {} return; }
        $("pk-err").textContent = "";
        beginV18(e.idea);
      }
      idea.oninput = function () { e.idea = idea.value; save(); if (ideaOk(e.idea) && $("pk-err")) $("pk-err").textContent = ""; };
      idea.onkeydown = function (ev) { if (ev.key === "Enter" && !ev.isComposing) { ev.preventDefault(); submit(); } };
      $("pk-go").onclick = submit;
      B.querySelectorAll("[data-exi]").forEach(function (b) {
        b.onclick = function () {
          e.idea = ex[+b.getAttribute("data-exi")]; save();
          ui.vmode = "type"; ui.vnote = ""; renderPick();
          var i2 = $("pk-idea"); if (i2) { i2.value = e.idea; try { i2.focus(); } catch (err) {} }
        };
      });
      $("pk-type").onclick = function () { vReset(); ui.vmode = "type"; ui.vnote = ""; renderPick(); try { $("pk-idea").focus(); } catch (err) {} };
      if ($("pk-tovoice")) $("pk-tovoice").onclick = function () { ui.vmode = ""; ui.vnote = ""; renderPick(); };
      $("pk-back").onclick = function () { ui.pickStep = "home"; render(); };
      if (vo) voiceBind();
    };

    renderMaterial = function () {
      var p = curP(); if (!p || !v18of(p)) { legacy("b-material"); return; }
      var v = v18of(p), B = $("b-material");
      syncPick(v);
      var h = '<p class="v18sub">点一下选；带走的会进你的背包。</p>';
      if (v.weak) h += '<p class="weaknote" id="frag-weak">这句不太好拆。下面是示例，可以点选，也可以自己写。</p>';
      h += v.fragments.map(function (f) {
        var st = v.pick[f] || "";
        return '<div class="frag"><div class="fn">' + esc(f) + '</div><div class="fbtns"><button type="button" class="chipbtn is-keep' + (st === "take" ? " on" : "") + '" data-set="take" data-f="' + esc(f) + '">带走</button><button type="button" class="chipbtn is-drop' + (st === "leave" ? " on" : "") + '" data-set="leave" data-f="' + esc(f) + '">放下</button></div></div>';
      }).join("");
      h += '<div class="bags" id="frag-bags"><div class="bag"><b>背包</b>' + (v.take.length ? v.take.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") : '<em>还没有</em>') + '</div><div class="bag"><b>放下</b>' + (v.leave.length ? v.leave.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") : '<em>还没有</em>') + "</div></div>";
      h += '<div class="ownrow"><button class="ghost small" id="frag-own" type="button">' + (v.weak ? "自己写一条带走 / 一条放下" : "自己加一条") + '</button><div id="frag-ownbox"' + (v.weak ? "" : ' class="hidden"') + '><label class="field"><span class="h">带走</span><input type="text" id="own-take" maxlength="16" placeholder="写一条想带走的" /></label><label class="field"><span class="h">放下</span><input type="text" id="own-leave" maxlength="16" placeholder="写一条想放下的，可以空着" /></label><button class="sec2 small" id="own-add" type="button">加进上面</button></div></div>';
      if (v.weak) h += '<button class="ghost small" id="frag-back" type="button">这些都不像我</button>';
      h += '<div id="frag-err" class="pk-hint" role="status"></div>';
      h += '<div class="dock"><button class="main" id="frag-go"' + (v.take.length ? "" : " disabled") + ">选好了</button></div>";
      B.innerHTML = h;
      B.querySelectorAll("[data-set]").forEach(function (b) {
        b.onclick = function () {
          var f = b.getAttribute("data-f"), set = b.getAttribute("data-set");
          v.pick[f] = v.pick[f] === set ? "" : set;
          touchV(p); renderMaterial();
        };
      });
      $("frag-own").onclick = function () { $("frag-ownbox").classList.toggle("hidden"); };
      $("own-add").onclick = function () {
        function add(id, set) {
          var t = $(id).value.trim().slice(0, 16); if (!t) return;
          if (v.fragments.indexOf(t) < 0) v.fragments.push(t);
          v.pick[t] = set; v.weak = false;
        }
        add("own-take", "take"); add("own-leave", "leave");
        touchV(p); renderMaterial();
      };
      if ($("frag-back")) $("frag-back").onclick = function () {
        ui.pickStep = "idea"; S.entry.idea = p.idea || ""; S.entry.kind = v.kind || "did";
        S.cur = -1; go("pick");
      };
      $("frag-go").onclick = function () {
        syncPick(v);
        if (!v.take.length) { $("frag-err").textContent = "至少带走一条，后面的尝试才站得住"; return; }
        $("frag-err").textContent = "";
        bump("take_leave_done"); touchV(p); go("draft");
      };
    };

    renderDraft = function () {
      var p = curP(); if (!p || !v18of(p)) { legacy("b-draft"); return; }
      var v = v18of(p), B = $("b-draft"), d = v.direction || {};
      var h = '<p class="dirlead">选一个方向。我们用你带走的经验，拼出一条具体尝试。</p><div class="dirchips" id="dir-chips" role="radiogroup">';
      h += DIRS.map(function (x) {
        var on = d.id === x.id;
        return '<button type="button" data-dir="' + x.id + '"' + (on ? ' class="on" aria-checked="true"' : ' aria-checked="false"') + ">" + esc(x.label) + "</button>";
      }).join("") + "</div>";
      h += '<div class="dir-other' + (d.id === "other" ? "" : " hidden") + '" id="dir-other"><label class="field"><span class="h">其他方向，写一个词</span><input type="text" id="dir-custom" maxlength="12" placeholder="例如：照料、教书" value="' + esc(d.custom || "") + '" /></label></div>';
      h += '<div id="dir-err" class="pk-hint" role="status"></div>';
      var ready = d.id && (d.id !== "other" || (d.custom && d.custom.trim()));
      h += '<div class="dock"><button class="main" id="dir-go"' + (ready ? "" : " disabled") + ">用这个方向看看</button></div>";
      B.innerHTML = h;
      B.querySelectorAll("[data-dir]").forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute("data-dir"), meta = dirById(id);
          v.direction = { id: id, label: meta.label, custom: (v.direction && v.direction.custom) || "" };
          touchV(p); renderDraft();
          if (id === "other") try { $("dir-custom").focus(); } catch (e) {}
        };
      });
      if ($("dir-custom")) $("dir-custom").oninput = function () {
        v.direction.custom = this.value.trim().slice(0, 12);
        var ok = !!v.direction.custom;
        $("dir-go").disabled = !ok;
        save();
      };
      $("dir-go").onclick = function () {
        if (!v.direction || !v.direction.id) { $("dir-err").textContent = "先选一个方向"; return; }
        if (v.direction.id === "other" && !(v.direction.custom && v.direction.custom.trim())) { $("dir-err").textContent = "其他方向写一个词"; return; }
        buildPool(v); v.ix = 0; v.unlike = 0; v.edited = false; applyIx(p);
        bump("direction_picked"); bump("attempt_ok"); touchV(p); go("check");
        maybePolish(p);
      };
    };

    function maybePolish(p) {
      var v = v18of(p);
      if (!v || v.edited || !navigator.onLine || !AI.mode()) return;
      var sig = v.attempt;
      bgRun({
        type: "v18_attempt", key: "v18:" + p.id + ":" + v.ix, category: "", title: "顺一句尝试",
        role: "帮人把一条愿意试的小事说清楚",
        instructions: ["用 inputs 写一条今天一个人能做完的尝试，40 字以内。", "必须用上 take 里的经验，方向只用 direction。", "不写价格，不约人，不要求公开发布。", "enough 是一句验收，20 字以内。"],
        factRule: "不编造用户没说过的经历。",
        inputs: { idea: p.idea, take: v.take, leave: v.leave, direction: dirLabel(v), draft: v.attempt },
        schema: { type: "object", required: ["attempt"], properties: { attempt: STR(80), enough: STR(40) } }
      }, 2500, function (o) {
        if (!o || !o.attempt || v.edited || v.attempt !== sig) return;
        if (/存档|登月|大突破|创造|学习|转行|价格|元/.test(o.attempt)) return;
        v.pool[v.ix] = o.attempt;
        v.attempt = o.attempt;
        if (o.enough) v.enough = /今天做到这儿就够了/.test(o.enough) ? o.enough : "今天做到这儿就够了：" + o.enough;
        p.out.first_step = v.attempt; p.out.summary = v.attempt; p.out.star = v.enough;
        save();
        if (curP() === p && S.stage === "check") renderCheck();
      });
    }

    renderCheck = function () {
      var p = curP(); if (!p || !v18of(p)) { legacy("b-check"); return; }
      var v = v18of(p), B = $("b-check");
      if (!v.pool.length) { buildPool(v); applyIx(p); }
      var h = '<p class="kicker" id="try-kicker">' + (v.unlike ? "已换一条 · 仍用你的带走与方向" : "这一版 · 一次尝试") + "</p>";
      h += '<div class="trycard"><div class="lbl">我想试试</div><p class="tryline" id="try-line">' + esc(v.attempt) + "</p></div>";
      h += '<div class="basis" id="try-basis"><div><b>带走</b><span>' + esc(join(v.take)) + "</span></div><div><b>方向</b><span>" + esc(dirLabel(v)) + "</span></div>";
      if (v.leave.length) h += "<div><b>放下</b><span>" + esc(join(v.leave)) + "</span></div>";
      h += "</div>";
      h += '<div class="enough" id="en-line"><span class="en-t" id="en-t">' + esc(v.enough) + '</span><button type="button" class="mini" id="en-ed">改</button></div>';
      h += '<div id="en-box" class="hidden editbox"><input type="text" id="en-in" maxlength="40" value="' + esc(String(v.enough || "").replace(/^今天做到这儿就够了：/, "")) + '" /><div class="row"><button class="sec2 small" id="en-ok" type="button">用这句</button></div></div>';
      h += '<button type="button" id="try-edit">改一句</button>';
      h += '<div id="try-box" class="' + (ui.v18edit ? "" : "hidden") + ' editbox"><label class="field"><span class="h">改这句尝试</span><textarea id="try-in" rows="3" maxlength="80">' + esc(v.attempt) + '</textarea></label><div class="row"><button class="small" id="try-use" type="button">用这句</button><button class="sec2 small" id="try-ai" type="button">顺一下</button></div><div class="err" id="try-err" role="status"></div></div>';
      if (v.unlike >= 2) h += '<p class="stuck" id="try-stuck">还是不像？可以换个方向，或<button type="button" id="try-refrag">回去改「带走 / 放下」</button>。</p>';
      h += '<div class="dock"><button class="main" id="try-yes">有点想试</button><button class="sec2" id="try-no">' + (v.unlike >= 2 ? "换方向" : "不像我") + "</button></div>";
      if (p.landed) h += '<p style="text-align:center"><button class="ghost small" id="try-backok" type="button">回到完成页</button></p>';
      B.innerHTML = h;
      $("en-ed").onclick = function () { $("en-box").classList.toggle("hidden"); try { $("en-in").focus(); } catch (e) {} };
      $("en-ok").onclick = function () {
        var t = $("en-in").value.trim().slice(0, 40);
        if (!t) { toast("写一句就好"); return; }
        v.enough = /今天做到这儿就够了/.test(t) ? t : "今天做到这儿就够了：" + t;
        if (p.out) p.out.star = v.enough;
        touchV(p); renderCheck(); toast("验收句已改");
      };
      $("try-edit").onclick = function () { ui.v18edit = !ui.v18edit; renderCheck(); if (ui.v18edit) try { $("try-in").focus(); } catch (e) {} };
      if ($("try-use")) $("try-use").onclick = function () {
        var t = $("try-in").value.trim().slice(0, 80);
        if (!t) { $("try-err").textContent = "写一句想试的。"; return; }
        v.edited = true; v.attempt = t; v.pool[v.ix] = t; if (p.out) { p.out.first_step = t; p.out.summary = t; }
        ui.v18edit = false; touchV(p); renderCheck();
      };
      if ($("try-ai")) $("try-ai").onclick = function () {
        var t = $("try-in").value.trim();
        if (!t) { $("try-err").textContent = "先写一句，再顺。"; return; }
        if (!navigator.onLine || !AI.mode()) { $("try-err").textContent = "现在连不上，没能顺这句。你改的字还在，点「用这句」就按你写的。"; return; }
        $("try-err").textContent = "";
        bgRun({
          type: "v18_attempt", key: "v18edit:" + p.id, category: "", title: "顺一句",
          role: "帮人把一句尝试说顺",
          instructions: ["按 request 改写 draft，40 字以内。", "不约人，不公开发布，不写价格。失败就不要空话。"],
          factRule: "只改写用户给出的句子。",
          inputs: { draft: t, request: t, direction: dirLabel(v) },
          schema: { type: "object", required: ["attempt"], properties: { attempt: STR(80) } }
        }, 2500, function (o) {
          if (!o || !o.attempt || o.attempt === t) { if ($("try-err")) $("try-err").textContent = "没顺成。这句话还留着，可以自己改，或点「用这句」。"; return; }
          if ($("try-in")) $("try-in").value = o.attempt;
          toast("顺过了，看一眼再用");
        });
      };
      $("try-no").onclick = function () {
        if (v.unlike >= 2) { go("draft"); return; }
        v.unlike += 1;
        var prev = v.attempt;
        v.ix = (v.ix + 1) % v.pool.length;
        if (v.pool[v.ix] === prev) { v.pool.push(compose(v, v.pool.length + v.unlike)); v.ix = v.pool.length - 1; }
        v.edited = false; applyIx(p); touchV(p); renderCheck();
      };
      if ($("try-refrag")) $("try-refrag").onclick = function () { go("material"); };
      if ($("try-backok")) $("try-backok").onclick = function () { ui.view[p.id] = "ok"; go("save"); };
      $("try-yes").onclick = function () { doSave(p); };
    };

    function doSave(p) {
      var v = v18of(p);
      if (!v.title) v.title = defaultTitle(v);
      p.title = v.title;
      p.out = { title: v.title, first_step: v.attempt, star: v.enough, summary: v.attempt };
      var first = !p.landed;
      p.saved = true; p.savedAt = Date.now();
      if (first) { p.landed = true; p.landedAt = Date.now(); p.planet = nextPlanet(); bump("completed"); bump("save_ok"); }
      p.degree = p.degree || { skip: true };
      ui.view[p.id] = "ok";
      touchV(p); go("save");
    }

    function sharePlain(p) {
      var v = v18of(p), pl = planetOf(p.planet), lines = ["另存人生 · 第 " + (p.planet + 1) + " 次 · " + pl.n, "「" + (v.title || defaultTitle(v)) + "」"];
      if (!v.hide.take) lines.push("", "我想带走", join(v.take) || "（还没有）");
      if (!v.hide.leave) lines.push("", "我想放下", join(v.leave) || "（这次没有放下）");
      if (!v.hide.attempt) lines.push("", "我想试试", v.attempt || "");
      lines.push("", "你会带走什么？", "", "另存人生 · " + fmtDot(p.landedAt));
      return lines.join("\n");
    }
    function fieldRow(key, label, text, v) {
      var off = v.hide[key] ? " is-off" : "";
      return '<div class="sc-row' + off + '" id="sc-' + key + '" data-key="' + key + '"><div class="slbl">' + label + '</div><div class="sv" id="scv-' + key + '">' + esc(text) + '</div><div class="sc-tools"><button type="button" class="mini" data-ed="' + key + '">编辑</button>' + (key === "title" ? "" : '<button type="button" class="mini" data-hide="' + key + '">' + (v.hide[key] ? "显示" : "隐藏") + "</button>") + "</div></div>";
    }
    renderSave = function () {
      var p = curP(); if (!p || !v18of(p)) { legacy("b-save"); return; }
      var v = v18of(p), B = $("b-save"), view = (ui.view && ui.view[p.id]) || "ok";
      if (!p.landed) { doSave(p); return; }
      if (view === "share") { renderShare(p); return; }
      var h = '<div class="okscreen" id="ok-screen"><div class="okorb" id="ok-orb" aria-hidden="true"></div><h2>另存成功</h2><p class="oksub">你留下了一个愿意尝试的方向。</p><p class="kaitu" id="kaitu">之后可以带着这一版，去开图制定第一次尝试。</p><button type="button" id="ok-review">看这一版</button></div>';
      h += '<div class="dock"><button class="main" id="ok-share">分享这一版</button><button class="sec2" id="ok-map">看星图</button></div>';
      B.innerHTML = h;
      var orb = $("ok-orb");
      if (orb && !orb.getAttribute("data-lit")) { orb.setAttribute("data-lit", "1"); try { playStar(orb, false); } catch (e) { orb.classList.add("pop"); } }
      $("ok-share").onclick = function () { bump("share_click"); ui.view[p.id] = "share"; renderSave(); try { window.scrollTo(0, 0); } catch (e) {} };
      $("ok-map").onclick = function () { openBag(); };
      $("ok-review").onclick = function () { go("check"); };
    };

    function renderShare(p) {
      var v = v18of(p), B = $("b-save"), pl = planetOf(p.planet);
      if (!v.title) v.title = defaultTitle(v);
      var h = '<div class="sharecard v18" id="share-card"><div class="sc-brand"><b>另存人生</b><span>第 ' + (p.planet + 1) + " 次 · " + esc(pl.n) + "</span></div>";
      h += '<div class="sc-title"><span id="scv-title">「' + esc(v.title) + '」</span><button type="button" class="mini" data-ed="title">编辑</button></div>';
      h += fieldRow("take", "我想带走", join(v.take) || "（还没有）", v);
      h += fieldRow("leave", "我想放下", join(v.leave) || "（这次没有放下）", v);
      h += fieldRow("attempt", "我想试试", v.attempt || "", v);
      h += '<div class="sc-ask">你会带走什么？</div><div class="sc-foot"><span>另存人生 · ' + esc(fmtDot(p.landedAt)) + "</span><span></span></div></div>";
      h += '<div class="unhide" id="sc-unhide"></div>';
      h += '<div id="sc-editor"></div>';
      h += '<div class="shareacts"><button class="sec2" id="sc-png" type="button">保存成图片</button><button class="main" id="sc-share" type="button">分享文字</button></div><div id="sc-out"></div>';
      h += '<p style="text-align:center;margin-top:8px"><button class="ghost small" id="share-back" type="button">回到另存成功</button></p>';
      B.innerHTML = h;
      ["take", "leave", "attempt"].forEach(function (k) {
        if (!v.hide[k]) return;
        var b = document.createElement("button");
        b.type = "button"; b.className = "mini"; b.textContent = "显示" + ({ take: "带走", leave: "放下", attempt: "试试" }[k]);
        b.onclick = function () { v.hide[k] = false; touchV(p); renderShare(p); };
        $("sc-unhide").appendChild(b);
      });
      B.querySelectorAll("[data-hide]").forEach(function (b) {
        b.onclick = function () { var k = b.getAttribute("data-hide"); v.hide[k] = !v.hide[k]; touchV(p); renderShare(p); };
      });
      B.querySelectorAll("[data-ed]").forEach(function (b) {
        b.onclick = function () { openEdit(p, b.getAttribute("data-ed")); };
      });
      $("sc-png").onclick = function () {
        bump("share_click"); bump("share_image"); bump("shared");
        var cv = cardCanvasV18(p), nm = "另存人生_这一版_" + String(v.title || "这一版").replace(/[\\\/:*?"<>|\s「」×]+/g, "_").slice(0, 20) + ".png";
        if (cv.toBlob) cv.toBlob(function (blob) { downloadBlob(nm, blob); }, "image/png");
      };
      $("sc-share").onclick = function () {
        bump("share_click"); bump("share_text"); bump("shared");
        var t = sharePlain(p);
        $("sc-out").innerHTML = '<label class="field"><span class="h">复制下面这段</span><textarea id="sc-text" rows="8" readonly>' + esc(t) + "</textarea></label>";
        try { $("sc-text").focus(); $("sc-text").select(); } catch (e) {}
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("分享文字已复制"); }, function () {});
        if (navigator.share) navigator.share({ title: "另存人生", text: t }).catch(function () {});
      };
      $("share-back").onclick = function () { ui.view[p.id] = "ok"; renderSave(); };
    }
    function openEdit(p, key) {
      var v = v18of(p), box = $("sc-editor");
      var cur = key === "title" ? v.title : key === "attempt" ? v.attempt : join(v[key] || []);
      box.innerHTML = '<label class="field"><span class="h">改「' + ({ title: "标题", take: "带走", leave: "放下", attempt: "试试" }[key]) + '」</span><input type="text" id="sc-in" maxlength="80" value="' + esc(cur) + '" /></label><div class="row"><button class="small" id="sc-in-ok" type="button">用这句</button></div>';
      $("sc-in-ok").onclick = function () {
        var t = $("sc-in").value.trim();
        if (key === "title") { if (!t) { toast("标题留一个词"); return; } v.title = t.slice(0, 24); v.titleEdited = true; p.title = v.title; }
        else if (key === "attempt") { if (!t) { toast("尝试留一句"); return; } v.attempt = t.slice(0, 80); v.edited = true; if (p.out) p.out.first_step = v.attempt; }
        else {
          var arr = t.split(/[、,，]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
          v[key] = arr;
        }
        touchV(p); renderShare(p);
      };
      try { $("sc-in").focus(); } catch (e) {}
    }
    function cardCanvasV18(p) {
      var v = v18of(p), pl = planetOf(p.planet), W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
      var F = 'LCSans,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif', HF = "LCHead,LCHeadX," + F, INK = "#231C45";
      x.fillStyle = "#F7F4FC"; x.fillRect(0, 0, W, H);
      x.fillStyle = "#FFFFFF"; rrect(x, 70, 80, W - 140, H - 160, 36); x.fill();
      x.fillStyle = INK; x.font = "48px " + HF; x.fillText("另存人生", 120, 180);
      x.globalAlpha = .65; x.font = "400 28px " + F; var meta = "第 " + (p.planet + 1) + " 次 · " + pl.n; x.fillText(meta, W - 120 - x.measureText(meta).width, 176); x.globalAlpha = 1;
      x.font = "64px " + HF; var ty = 280; wrapLines(x, "「" + (v.title || defaultTitle(v)) + "」", W - 240, 2).forEach(function (l) { x.fillText(l, 120, ty); ty += 78; });
      function block(label, text) { x.font = "400 26px " + F; x.globalAlpha = .6; x.fillText(label, 120, ty + 20); x.globalAlpha = 1; x.font = "400 36px " + F; ty += 70; wrapLines(x, text, W - 240, 3).forEach(function (l) { x.fillText(l, 120, ty); ty += 50; }); ty += 16; }
      if (!v.hide.take) block("我想带走", join(v.take) || "（还没有）");
      if (!v.hide.leave) block("我想放下", join(v.leave) || "（这次没有放下）");
      if (!v.hide.attempt) block("我想试试", v.attempt || "");
      x.strokeStyle = "rgba(35,28,69,.35)"; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(120, ty + 10); x.lineTo(W - 120, ty + 10); x.stroke(); x.setLineDash([]);
      x.fillStyle = INK; x.font = "48px " + HF; x.fillText("你会带走什么？", 120, ty + 80);
      x.globalAlpha = .6; x.font = "400 26px " + F; x.fillText("另存人生 · " + fmtDot(p.landedAt), 120, H - 140); x.globalAlpha = 1;
      return c;
    }

    showResume = function () {
      var p = curP(); if (!p) return;
      if (!p.v18) {
        $("resume").innerHTML = '<div><b>这是更早的一版记录。</b>这一版从「开始这一版」走。以前留下的，可以在星图里看。</div><div class="row"><button class="small" id="rs-map">看星图</button><button class="sec2 small" id="rs-new">开始这一版</button></div>';
        $("resume").classList.remove("hidden");
        $("rs-map").onclick = function () { $("resume").classList.add("hidden"); openBag(); };
        $("rs-new").onclick = function () { $("resume").classList.add("hidden"); p.paused = true; S.cur = -1; ui.pickStep = "home"; go("pick"); };
        return;
      }
      var v = v18of(p), where = p.landed ? "另存成功" : STAGES[stageIdx(p.stage)].name;
      $("resume").innerHTML = '<div><b>欢迎回来。</b>上次停在「' + esc(where) + "」" + (v.title ? " · " + esc(v.title) : "") + "</div>" +
        '<div class="row"><button class="small" id="rs-go">继续</button><button class="ghost small" id="rs-home">回到首页</button></div>';
      $("resume").classList.remove("hidden");
      $("rs-go").onclick = function () { $("resume").classList.add("hidden"); if (p.landed) { ui.view[p.id] = "ok"; go("save"); } else go(p.stage || "material"); };
      $("rs-home").onclick = function () { $("resume").classList.add("hidden"); p.paused = true; S.cur = -1; ui.pickStep = "home"; go("pick"); };
    };

    statusOf = (function (orig) {
      return function (p) {
        if (p && p.v18) {
          if (p.landed) return { k: "done", t: "已留下 · " + planetOf(p.planet).n };
          return { k: "wip", t: "进行中 · " + STAGES[stageIdx(p.stage)].name };
        }
        return orig(p);
      };
    })(statusOf);
    summaryOf = (function (orig) {
      return function (p) { if (p && p.v18) return short(p.v18.attempt || p.idea || "这一版", 60); return orig(p); };
    })(summaryOf);
    cardHtml = (function (orig) {
      return function (x) {
        var p = x.p; if (!p || !p.v18) return orig(x);
        var st = statusOf(p), pl = p.landed ? planetOf(p.planet) : null, v = v18of(p);
        var name = v.title || short(v.attempt || p.idea || "这一版", 18);
        return '<button class="bagcard ' + st.k + (x.i === S.cur ? " cur" : "") + '" data-bag-card="' + x.i + '"' + (pl ? ' data-planet="' + p.planet + '"' : ' data-sailing="1"') + ">" +
          (pl ? '<span class="orb" style="--c:' + pl.c + ";--c2:" + pl.c2 + '" aria-hidden="true"></span><span class="pn">' + esc(pl.n) + "</span>" : '<span class="orb ship" aria-hidden="true"></span><span class="pn">进行中</span>') +
          '<span class="bc-n">' + esc(name) + '</span><span class="bc-s">' + esc(summaryOf(p)) + '</span><span class="bc-m"><span class="tag ' + st.k + '">' + esc(st.t) + "</span> " + esc(dirLabel(v) || "这一版") + " · " + esc(fmtTime(p.updatedAt)) + (x.i === S.cur ? " · 正在做" : "") + "</span></button>";
      };
    })(cardHtml);
    renderBagDetail = (function (orig) {
      return function (i) {
        var p = S.projects[i]; if (!p || !p.v18) return orig(i);
        var v = v18of(p), B = $("bag-body"), st = statusOf(p);
        B.innerHTML = '<button class="ghost small" id="bd-back" type="button">回到星图</button><div class="bd-h" id="bd-title">' + esc(v.title || short(v.attempt || "这一版", 18)) + '</div><div class="hint"><span class="tag ' + st.k + '">' + esc(st.t) + "</span> " + esc(dirLabel(v) || "") + "</div>" +
          '<p class="bd-s">' + esc(v.attempt || "") + "</p><p class=\"hint\">带走：" + esc(join(v.take) || "—") + " · 放下：" + esc(join(v.leave) || "—") + "</p>" +
          '<div class="big bd-acts"><button class="bigbtn" id="bd-edit" type="button"><strong>看这一版</strong><small>回到这条尝试。</small></button><button class="bigbtn" id="bd-home" type="button"><strong>开始新的一版</strong><small>原来的留在星图里。</small></button></div>';
        $("bd-back").onclick = function () { bagView.open = -1; renderBag(); };
        $("bd-edit").onclick = function () { closeBag(); S.cur = i; p.paused = false; if (p.landed) { ui.view[p.id] = "ok"; go("save"); } else go(p.stage || "check"); };
        $("bd-home").onclick = function () { closeBag(); S.cur = -1; ui.pickStep = "home"; go("pick"); };
      };
    })(renderBagDetail);
    renderBag = (function (orig) {
      return function () {
        orig.apply(this, arguments);
        var sum = $("bag-sum");
        if (sum) sum.textContent = sum.textContent.replace(/登陆过/g, "留下过").replace(/航行中/g, "进行中");
        var empty = $("bag-body");
        if (empty && !S.projects.length) empty.querySelector(".note") && (empty.querySelector(".note").textContent = "星图还是空的。留下一版之后，会在这里点亮一颗星球。背包装的是这一版带走的经验，不是项目列表。");
      };
    })(renderBag);

    renderMetrics = (function (orig) {
      return function () {
        orig.apply(this, arguments);
        var el = $("metrics-body"); if (!el) return;
        var html = el.innerHTML.replace("登月（完成）", "另存成功");
        el.innerHTML = html;
      };
    })(renderMetrics);

    routeUpdate = (function (orig) {
      return function () {
        var r = orig.apply(this, arguments);
        STAGES[4].name = "另存成功"; STAGES[4].todo = "留下这一版，或去分享";
        return r;
      };
    })(routeUpdate);

    screenUpdate = (function (orig) {
      return function () { orig.apply(this, arguments); document.body.classList.add("v18"); };
    })(screenUpdate);

    var cardCanvasPrev = cardCanvas, shareTextPrev = shareText;
    cardCanvas = function (p) { return p && p.v18 ? cardCanvasV18(p) : cardCanvasPrev(p); };
    shareText = function (p) { return p && p.v18 ? sharePlain(p) : shareTextPrev(p); };

    window.__lingcun18 = { splitFrags: splitFrags, DIRS: DIRS, sharePlain: function () { var p = curP(); return p ? sharePlain(p) : ""; } };
  })();
