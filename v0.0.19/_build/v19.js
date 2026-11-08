  /* ================= v0.0.19（#60，refs #23）：像素蓝奶油 + 留下与放下拖拽。
     数据仍写 v.pick / v.take[] / v.leave[]，后面的好奇方向、一条尝试、另存、分享卡不用改。 ================= */
  (function () {
    var DIRS = [
      { id: "express", label: "表达" },
      { id: "tech", label: "科技" },
      { id: "body", label: "身体" },
      { id: "craft", label: "手作与现场" },
      { id: "work", label: "工作方式" },
      { id: "other", label: "其他" }
    ];
    var LIB = [
      "现场观察", "讲故事", "活动策划", "反复汇报", "协调供应商", "带团队", "做内容", "写公众号",
      "练过吉他", "后来搁下了", "想跑步", "迈不出第一步", "老是往后放", "对科技好奇", "带新人", "写复盘",
      "熬夜改稿", "跑客户", "做预算", "主持活动", "拍短视频", "整理数据", "研究用户", "开周会",
      "追热点", "记笔记", "照顾人", "做饭", "修东西", "拍照", "翻译", "教别人", "想开始的那件事", "早起写信"
    ];
    var DICT = [
      [/现场/, "现场观察"], [/讲故事|会讲|讲述/, "讲故事"], [/活动策划|线下活动|办过活动|策划/, "活动策划"],
      [/汇报/, "反复汇报"], [/供应商/, "协调供应商"], [/带团队|带过团队|带人/, "带团队"],
      [/做内容|内容/, "做内容"], [/公众号/, "写公众号"], [/吉他/, "练过吉他"],
      [/搁下|断更|更新断|停了/, "后来搁下了"], [/跑步/, "想跑步"], [/迈不出/, "迈不出第一步"],
      [/往后放|拖延/, "老是往后放"], [/科技|新技术|人工智能|编程/, "对科技好奇"],
      [/复盘/, "写复盘"], [/预算/, "做预算"], [/短视频|拍视频/, "拍短视频"], [/笔记/, "记笔记"],
      [/做饭|烹饪/, "做饭"], [/拍照|摄影/, "拍照"], [/翻译/, "翻译"], [/客户/, "跑客户"],
      [/周会/, "开周会"], [/新人/, "带新人"], [/数据/, "整理数据"], [/用户/, "研究用户"], [/热点/, "追热点"]
    ];
    var DIRWORDS = ["表达", "科技", "身体", "手作与现场", "工作方式", "其他", "记录", "照料", "教书", "好奇"];
    var SLOTS = [
      { x: 2, y: 1, rot: -3, dur: 7.2, delay: .2, shape: "s-torn", tint: false },
      { x: 52, y: 0, rot: 2.5, dur: 8.1, delay: .9, shape: "s-ticket", tint: true },
      { x: 4, y: 26, rot: -2, dur: 7.6, delay: .4, shape: "s-tape", tint: false },
      { x: 52, y: 25, rot: 2, dur: 8.4, delay: 1.2, shape: "s-stamp", tint: true },
      { x: 1, y: 51, rot: 3, dur: 7.4, delay: .6, shape: "s-tab", tint: false },
      { x: 50, y: 50, rot: -2.5, dur: 8.2, delay: 1.0, shape: "s-torn", tint: true },
      { x: 6, y: 75, rot: 2, dur: 7.0, delay: .3, shape: "s-ticket", tint: false },
      { x: 52, y: 74, rot: -2, dur: 7.8, delay: .8, shape: "s-stamp", tint: true }
    ];
    var drag = null;
    var suppressUntil = 0;

    function uniq(a) {
      var o = [], s = {};
      a.forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } });
      return o;
    }
    function clip28(s) {
      s = String(s || "").replace(/\s+/g, "");
      if (s.length < 2 || s.length > 8) return "";
      return s;
    }
    function extract(text) {
      var t = String(text || ""), hit = [];
      DICT.forEach(function (pair) { if (pair[0].test(t)) hit.push(pair[1]); });
      t.split(/[，。！？、；,\n]/).forEach(function (raw) {
        var s = String(raw || "").replace(/^(我|你)?(以前|曾经|后来|但是|但|又|总是|总|想要|想|负责|办过|学过|写过|带过|做过)/, "");
        s = clip28(s);
        if (s) hit.push(s);
      });
      return uniq(hit);
    }
    function gather(p) {
      var bits = [];
      function walk(x) {
        if (x == null) return;
        if (typeof x === "string") bits.push(x);
        else if (Object.prototype.toString.call(x) === "[object Array]") x.forEach(walk);
        else if (typeof x === "object") Object.keys(x).forEach(function (k) { walk(x[k]); });
      }
      if (p && p.idea) bits.push(p.idea);
      if (p && p.entry) walk(p.entry);
      return bits.join("\n");
    }
    function buildCandidates(p) {
      p = p || {};
      var v = p.v18 || {};
      var user = extract(gather(p));
      (v.custom || []).forEach(function (w) { var c = clip28(w); if (c) user.push(c); });
      var all = uniq(user.concat(LIB).concat(DIRWORDS)).filter(function (w) { return w && w.length >= 2 && w.length <= 8; });
      return all;
    }
    function empty8() { return [null, null, null, null, null, null, null, null]; }
    function placedSet(v) {
      var s = {};
      (v.take || []).forEach(function (w) { s[w] = 1; });
      (v.leave || []).forEach(function (w) { s[w] = 1; });
      return s;
    }
    function syncFromPick(v) {
      var seen = {};
      function keep(arr, set) {
        return (arr || []).filter(function (f) { if (v.pick[f] !== set || seen[f]) return false; seen[f] = 1; return true; });
      }
      var take = keep(v.take, "take"), leave = keep(v.leave, "leave");
      (v.fragments || []).forEach(function (f) {
        if (seen[f]) return;
        if (v.pick[f] === "take") { take.push(f); seen[f] = 1; }
        else if (v.pick[f] === "leave") { leave.push(f); seen[f] = 1; }
      });
      v.take = take;
      v.leave = leave;
    }
    function pull(v, n, extra) {
      var seq = v.board.seq;
      if (!seq.length || n <= 0) return [];
      var ban = placedSet(v);
      (v.board.bubble || []).forEach(function (w) { if (w) ban[w] = 1; });
      (extra || []).forEach(function (w) { if (w) ban[w] = 1; });
      var out = [], guard = 0, start = v.board.cursor;
      while (out.length < n && guard < seq.length) {
        var w = seq[v.board.cursor % seq.length];
        v.board.cursor = (v.board.cursor + 1) % seq.length;
        guard++;
        if (!w || ban[w] || out.indexOf(w) >= 0) continue;
        out.push(w);
        ban[w] = 1;
      }
      if (!out.length) v.board.cursor = start;
      return out;
    }
    function fillSlots(v, n) {
      var got = pull(v, n, []);
      var gi = 0;
      for (var i = 0; gi < got.length && i < 8; i++) {
        if (!v.board.bubble[i]) v.board.bubble[i] = got[gi++];
      }
    }
    function ensureBoard(p) {
      var v = p.v18;
      v.fragments = v.fragments || [];
      v.pick = v.pick || {};
      v.take = v.take || [];
      v.leave = v.leave || [];
      v.custom = v.custom || [];
      syncFromPick(v);
      if (!v.board || !v.board.seq || !v.board.seq.length) {
        var seq = buildCandidates(p);
        v.custom.forEach(function (w) {
          w = String(w || "").trim();
          if (w && w.length <= 16 && seq.indexOf(w) < 0) seq.push(w);
        });
        v.board = { seq: seq, cursor: 0, bubble: empty8() };
        fillSlots(v, 8);
      }
      var placed = placedSet(v), n = 0;
      for (var i = 0; i < 8; i++) {
        if (v.board.bubble[i] && placed[v.board.bubble[i]]) { v.board.bubble[i] = null; n++; }
      }
      if (n) fillSlots(v, n);
      return v;
    }
    function touchV(p) { p.updatedAt = Date.now(); save(); }
    function say(msg) {
      var el = $("v19-live");
      if (!el) return;
      el.textContent = "";
      setTimeout(function () { var e = $("v19-live"); if (e) e.textContent = msg; }, 30);
    }
    function iconStack(base, alt) {
      return '<span class="pix" aria-hidden="true"><img src="icons/' + base + '.svg" alt="" data-state="idle" draggable="false"><img src="icons/' + base + '-active.svg" alt="" data-state="active" draggable="false"><img src="icons/' + base + '-done.svg" alt="" data-state="done" draggable="false"></span>';
    }
    function chipsHtml(list) {
      return (list || []).map(function (w) {
        return '<button type="button" class="v19-chip" data-label="' + esc(w) + '" aria-label="把「' + esc(w) + '」放回对话框">' + esc(w) + "</button>";
      }).join("");
    }
    function renderStickers(v) {
      var host = $("v19-stickers");
      if (!host) return;
      host.innerHTML = "";
      v.board.bubble.forEach(function (label, i) {
        if (!label) return;
        var slot = SLOTS[i];
        var wrap = document.createElement("div");
        wrap.className = "v19-sticker";
        wrap.setAttribute("data-label", label);
        wrap.setAttribute("data-slot", String(i));
        wrap.style.left = slot.x + "%";
        wrap.style.top = slot.y + "%";
        var tilt = document.createElement("div");
        tilt.className = "tilt";
        tilt.style.setProperty("--dur", slot.dur + "s");
        tilt.style.setProperty("--delay", slot.delay + "s");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sticker-btn " + slot.shape + (slot.tint ? " tint" : "");
        btn.style.setProperty("--rot", slot.rot + "deg");
        btn.setAttribute("aria-label", "贴纸「" + label + "」。可以拖进背包或纸箱，也可以点按后选择带走或放下");
        var span = document.createElement("span");
        span.className = "sticker-label";
        span.textContent = label;
        btn.appendChild(span);
        tilt.appendChild(btn);
        wrap.appendChild(tilt);
        host.appendChild(wrap);
      });
    }

    renderMaterial = function () {
      var p = curP();
      if (!p || !p.v18) {
        var B0 = $("b-material");
        if (B0) B0.innerHTML = '<p class="v18sub">这是更早的一版记录。这一版不再沿用以前的提问。</p><div class="dock"><button class="main" id="leg-home" type="button">回到首页</button></div>';
        var home = $("leg-home");
        if (home) home.onclick = function () { S.cur = -1; ui.pickStep = "home"; go("pick"); };
        return;
      }
      var v = ensureBoard(p), B = $("b-material");
      var any = v.take.length + v.leave.length;
      var h = '<p class="v18sub">拖到背包或纸箱；点一下也能选。</p>';
      if (v.weak) h += '<p class="weaknote" id="frag-weak">这句不太好拆。下面是示例，可以拖走，也可以自己加。</p>';
      h += '<div class="v19-field" id="v19-field">';
      h += '<div class="v19-stickers" id="v19-stickers"></div>';
      h += '<div class="v19-actions" id="v19-actions" hidden role="group" aria-label="这张贴纸"><button type="button" class="v19-act-take">带走</button><button type="button" class="v19-act-leave">放下</button><button type="button" class="v19-act-cancel">取消</button></div>';
      h += '<div class="v19-more" id="v19-more" hidden><label for="v19-more-in">加一个自己的词，最多 16 个字</label><input id="v19-more-in" type="text" maxlength="16" autocomplete="off" placeholder="比如：赶不完的会" /><div class="v19-more-acts"><button type="button" id="v19-add">加上</button><button type="button" id="v19-add-take">放进背包</button><button type="button" id="v19-add-leave">放进纸箱</button></div></div>';
      h += '<div class="v19-caption"><span><button type="button" class="v19-textbtn" id="frag-more">更多…<img src="icons/b-pencil.svg" alt="" draggable="false"></button><button type="button" class="v19-textbtn" id="frag-swap" aria-label="换一批：把还没拖走的贴纸换成另一批">换一批</button></span><span class="v19-hint">拖到下面</span></div>';
      h += "</div>";
      h += '<div class="v19-bays" id="frag-bags">';
      h += '<div class="v19-target' + (v.take.length ? " has-items" : "") + '" id="target-take"><button type="button" class="bay" id="bay-take" data-set="take" aria-label="背包，带走。把贴纸拖到这里">' + iconStack("b-backpack") + '<span class="bay-name">背包</span></button><div class="tray" id="tray-take">' + chipsHtml(v.take) + "</div></div>";
      h += '<div class="v19-target' + (v.leave.length ? " has-items" : "") + '" id="target-leave"><button type="button" class="bay" id="bay-leave" data-set="leave" aria-label="纸箱，放下。把贴纸拖到这里">' + iconStack("b-box") + '<span class="bay-name">纸箱</span></button><div class="tray" id="tray-leave">' + chipsHtml(v.leave) + "</div></div>";
      h += "</div>";
      h += '<div id="frag-err" class="pk-hint" role="status"></div>';
      if (v.weak) h += '<button class="ghost small" id="frag-back" type="button">这些都不像我</button>';
      h += '<p id="v19-live" class="sr" aria-live="polite"></p>';
      h += '<div class="dock"><button class="main" id="frag-go" type="button"' + (any ? "" : " disabled") + ">下一步</button></div>";
      B.innerHTML = h;
      renderStickers(v);
    };

    function commitPlace(label, set) {
      var p = curP();
      if (!p || !p.v18 || !label) return;
      var v = ensureBoard(p);
      for (var i = 0; i < 8; i++) if (v.board.bubble[i] === label) v.board.bubble[i] = null;
      v.take = v.take.filter(function (w) { return w !== label; });
      v.leave = v.leave.filter(function (w) { return w !== label; });
      v.pick[label] = set;
      if (set === "take") v.take.push(label);
      else v.leave.push(label);
      if (v.fragments.indexOf(label) < 0) v.fragments.push(label);
      fillSlots(v, 1);
      touchV(p);
      renderMaterial();
      say("「" + label + "」已放进" + (set === "take" ? "背包" : "纸箱"));
    }
    function unplace(label) {
      var p = curP();
      if (!p || !p.v18 || !label) return;
      var v = ensureBoard(p);
      v.pick[label] = "";
      v.take = v.take.filter(function (w) { return w !== label; });
      v.leave = v.leave.filter(function (w) { return w !== label; });
      var slot = -1;
      for (var i = 0; i < 8; i++) if (!v.board.bubble[i] && slot < 0) slot = i;
      if (slot < 0) slot = 7;
      v.board.bubble[slot] = label;
      touchV(p);
      renderMaterial();
      say("「" + label + "」已放回对话框");
    }
    function openActions(label) {
      var bar = $("v19-actions"), more = $("v19-more");
      if (!bar) return;
      if (more) more.hidden = true;
      bar.hidden = false;
      bar.style.display = "flex";
      bar.setAttribute("data-label", label);
      setTimeout(function () { var b = document.querySelector(".v19-act-take"); if (b) b.focus(); }, 20);
    }
    function closeActions() {
      var bar = $("v19-actions");
      if (bar) bar.hidden = true;
    }
    function addCustom(dest) {
      var p = curP(), input = $("v19-more-in");
      if (!p || !input) return;
      var w = String(input.value || "").trim().slice(0, 16);
      if (!w) { try { input.focus(); } catch (e) {} return; }
      var v = ensureBoard(p);
      var inBubble = v.board.bubble.indexOf(w) >= 0;
      if (inBubble || v.pick[w] === "take" || v.pick[w] === "leave") { toast("这个词已经在了"); return; }
      if (v.custom.indexOf(w) < 0) v.custom.push(w);
      if (v.board.seq.indexOf(w) < 0) v.board.seq.push(w);
      if (v.fragments.indexOf(w) < 0) v.fragments.push(w);
      if (dest === "bubble") {
        var slot = -1;
        for (var i = 0; i < 8; i++) if (!v.board.bubble[i] && slot < 0) slot = i;
        if (slot < 0) slot = 7;
        v.board.bubble[slot] = w;
        say("已加上「" + w + "」");
      } else {
        v.pick[w] = dest;
        v.take = v.take.filter(function (x) { return x !== w; });
        v.leave = v.leave.filter(function (x) { return x !== w; });
        if (dest === "take") v.take.push(w);
        else v.leave.push(w);
        say("「" + w + "」已放进" + (dest === "take" ? "背包" : "纸箱"));
      }
      touchV(p);
      renderMaterial();
    }
    function swapBatch() {
      var p = curP();
      if (!p || !p.v18) return;
      var v = ensureBoard(p);
      closeActions();
      var old = v.board.bubble.slice();
      v.board.bubble = empty8();
      var got = pull(v, 8, old);
      for (var i = 0; i < got.length; i++) v.board.bubble[i] = got[i];
      touchV(p);
      renderMaterial();
      say("换了一批");
    }
    function clearOver() {
      var nodes = document.querySelectorAll(".bay.is-over");
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove("is-over");
    }
    function hitBay(x, y) {
      var bays = document.querySelectorAll(".bay[data-set]"), found = null;
      for (var i = 0; i < bays.length; i++) {
        var r = bays[i].getBoundingClientRect();
        if (x >= r.left - 18 && x <= r.right + 18 && y >= r.top - 18 && y <= r.bottom + 18) found = bays[i];
      }
      return found;
    }
    function spawnGhost(btn) {
      var r = btn.getBoundingClientRect();
      var g = document.createElement("div");
      g.className = "v19-ghost";
      g.style.left = r.left + "px";
      g.style.top = r.top + "px";
      g.style.width = r.width + "px";
      g.style.height = r.height + "px";
      var c = btn.cloneNode(true);
      c.style.width = "100%";
      c.style.height = "100%";
      g.appendChild(c);
      document.body.appendChild(g);
      return g;
    }
    function returnHome(d) {
      if (d.ghost) {
        d.ghost.style.transition = "transform .22s steps(4)";
        d.ghost.style.transform = "translate(0px,0px)";
      }
      setTimeout(function () {
        if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
        if (d.sticker) d.sticker.classList.remove("is-lifted");
      }, 230);
    }

    document.body.classList.add("v19");
    try { if (typeof PLANETS !== "undefined" && PLANETS[0]) { PLANETS[0].c = "#F7F0DF"; PLANETS[0].c2 = "#5E72B5"; } } catch (e) {}

    if (!window.__v19listen) {
      window.__v19listen = 1;
      document.addEventListener("pointerdown", function (e) {
        if (e.button !== undefined && e.button > 0) return;
        var btn = e.target.closest && e.target.closest(".sticker-btn");
        if (!btn || !btn.closest("#v19-stickers")) return;
        var sticker = btn.closest(".v19-sticker");
        if (!sticker) return;
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
        sticker.classList.add("is-held");
        drag = { id: e.pointerId, sticker: sticker, btn: btn, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
      });
      document.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.moved) {
          if (Math.sqrt(dx * dx + dy * dy) < 18) return;
          drag.moved = true;
          suppressUntil = Date.now() + 120;
          closeActions();
          drag.sticker.classList.add("is-lifted");
          drag.ghost = spawnGhost(drag.btn);
          document.documentElement.classList.add("v19-dragging");
        }
        if (drag.ghost) drag.ghost.style.transform = "translate(" + dx + "px," + dy + "px) scale(1.04)";
        var bay = hitBay(e.clientX, e.clientY);
        clearOver();
        if (bay) bay.classList.add("is-over");
        e.preventDefault();
      }, { passive: false });
      document.addEventListener("pointerup", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag;
        drag = null;
        document.documentElement.classList.remove("v19-dragging");
        clearOver();
        if (d.sticker) d.sticker.classList.remove("is-held");
        if (!d.moved) return;
        suppressUntil = Date.now() + 120;
        var bay = hitBay(e.clientX, e.clientY);
        if (bay) {
          if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
          commitPlace(d.sticker.getAttribute("data-label"), bay.getAttribute("data-set"));
        } else returnHome(d);
      });
      document.addEventListener("pointercancel", function (e) {
        if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
        var d = drag;
        drag = null;
        document.documentElement.classList.remove("v19-dragging");
        clearOver();
        if (d.sticker) d.sticker.classList.remove("is-held");
        if (d.moved) returnHome(d);
      });
      document.addEventListener("touchmove", function (e) { if (drag && drag.moved) e.preventDefault(); }, { passive: false });
      document.addEventListener("click", function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest("#frag-more")) {
          var more = $("v19-more"), bar = $("v19-actions");
          if (bar) bar.hidden = true;
          if (more) { more.hidden = false; setTimeout(function () { var i = $("v19-more-in"); if (i) i.focus(); }, 20); }
          return;
        }
        if (t.closest("#frag-swap")) { swapBatch(); return; }
        if (t.closest("#v19-add")) { addCustom("bubble"); return; }
        if (t.closest("#v19-add-take")) { addCustom("take"); return; }
        if (t.closest("#v19-add-leave")) { addCustom("leave"); return; }
        if (t.closest("#frag-back")) {
          var p = curP(), v = p && p.v18;
          ui.pickStep = "idea";
          S.entry.idea = (p && p.idea) || "";
          S.entry.kind = (v && v.kind) || "did";
          S.cur = -1;
          go("pick");
          return;
        }
        if (t.closest("#frag-go")) {
          var p2 = curP(), v2 = p2 && p2.v18;
          if (!v2) return;
          if (!v2.take.length) {
            var err = $("frag-err");
            if (err) err.textContent = "至少带走一条，后面的尝试才站得住";
            say("至少带走一条，后面的尝试才站得住");
            return;
          }
          var err2 = $("frag-err");
          if (err2) err2.textContent = "";
          bump("take_leave_done");
          touchV(p2);
          go("draft");
          return;
        }
        var chip = t.closest(".v19-chip");
        if (chip) { unplace(chip.getAttribute("data-label")); return; }
        var act = t.closest(".v19-act-take, .v19-act-leave, .v19-act-cancel");
        if (act) {
          var box = $("v19-actions");
          var label = box ? box.getAttribute("data-label") : "";
          if (act.classList.contains("v19-act-cancel")) {
            closeActions();
            say("已取消");
            var back = label && document.querySelector('.v19-sticker[data-label="' + label.replace(/"/g, "") + '"] .sticker-btn');
            if (back) back.focus();
            return;
          }
          closeActions();
          commitPlace(label, act.classList.contains("v19-act-take") ? "take" : "leave");
          return;
        }
        var btn = t.closest(".sticker-btn");
        if (btn && btn.closest("#v19-stickers")) {
          if (Date.now() < suppressUntil) return;
          var sticker = btn.closest(".v19-sticker");
          if (!sticker) return;
          openActions(sticker.getAttribute("data-label"));
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { closeActions(); var m = $("v19-more"); if (m) m.hidden = true; }
        if (e.key === "Enter" && e.target && e.target.id === "v19-more-in") { e.preventDefault(); addCustom("bubble"); }
      });
    }

    function drawCard(p) {
      var v = p.v18, pl = planetOf(p.planet), W = 1080, H = 1350, c = document.createElement("canvas");
      c.width = W; c.height = H;
      var x = c.getContext("2d");
      var F = 'LCSans,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif', HF = "LCHead,LCHeadX," + F, INK = "#232B55";
      x.fillStyle = "#5E72B5"; x.fillRect(0, 0, W, H);
      x.fillStyle = "#4A5C9B"; x.fillRect(78, 86, W - 140, H - 150);
      x.fillStyle = "#232B55"; x.fillRect(64, 72, W - 140, H - 150);
      x.fillStyle = "#F7F0DF"; x.fillRect(72, 80, W - 156, H - 166);
      x.fillStyle = "#FFFBF1"; x.fillRect(72, 80, W - 156, 10);
      x.fillStyle = INK; x.font = "48px " + HF; x.fillText("另存人生", 120, 180);
      x.globalAlpha = .65; x.font = "400 28px " + F;
      var meta = "第 " + (p.planet + 1) + " 次 · " + pl.n;
      x.fillText(meta, W - 140 - x.measureText(meta).width, 176);
      x.globalAlpha = 1;
      x.fillStyle = INK; x.font = "64px " + HF;
      var ty = 280;
      wrapLines(x, "「" + (v.title || p.title || "这一版") + "」", W - 280, 2).forEach(function (l) { x.fillText(l, 120, ty); ty += 78; });
      function block(label, text) {
        x.font = "400 26px " + F; x.globalAlpha = .65; x.fillStyle = INK; x.fillText(label, 120, ty + 20); x.globalAlpha = 1;
        x.font = "400 36px " + F; ty += 70;
        wrapLines(x, text, W - 280, 3).forEach(function (l) { x.fillText(l, 120, ty); ty += 50; });
        ty += 16;
      }
      function join(a) { return (a || []).join("、"); }
      if (!v.hide.take) block("我想带走", join(v.take) || "（还没有）");
      if (!v.hide.leave) block("我想放下", join(v.leave) || "（这次没有放下）");
      if (!v.hide.attempt) block("我想试试", v.attempt || "");
      x.strokeStyle = "rgba(35, 43, 85, .45)"; x.lineWidth = 4; x.setLineDash([10, 8]);
      x.beginPath(); x.moveTo(120, ty + 10); x.lineTo(W - 140, ty + 10); x.stroke(); x.setLineDash([]);
      x.fillStyle = INK; x.font = "48px " + HF; x.fillText("你会带走什么？", 120, ty + 80);
      x.globalAlpha = .7; x.font = "400 26px " + F; x.fillText("另存人生 · " + fmtDot(p.landedAt), 120, H - 150); x.globalAlpha = 1;
      return c;
    }
    var cardCanvasPrev = cardCanvas;
    cardCanvas = function (p) { return p && p.v18 ? drawCard(p) : cardCanvasPrev(p); };

    screenUpdate = (function (orig) {
      return function () { orig.apply(this, arguments); document.body.classList.add("v19"); };
    })(screenUpdate);

    window.__lingcun19 = {
      buildCandidates: buildCandidates,
      LIB: LIB,
      DIRS: DIRS,
      redraw: function () { renderMaterial(); },
      card: function () { return cardCanvas(curP()); }
    };
  })();
