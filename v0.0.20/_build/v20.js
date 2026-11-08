  /* ================= v0.0.20：原话接下去。
     碎片只来自用户这一次写下的分句（标点切开；超过 16 字、又没有「但是 / 以及」这类连词的，不猜着切开）。
     不调用职业词库，也不把方向词写成用户的经历。不够两条时，请对方加一个词或回去改一句，不另开问卷。
     公共例子的空位见 __lingcun20.setEvidence：没有来源的不要，也不会写进贴纸、尝试或另存结果。
     这里没有语义模型。对得上，只是因为贴纸上的字能在原话里原样找到。 ================= */
  (function () {
    var MAX = 16;
    var SENT = "\u0000";
    var CONJ = /以及|然后|但是|或者|而且|不过|可是|因为|所以/g;
    var evidence = [];

    function uniq(a) {
      var o = [], s = {};
      (a || []).forEach(function (x) { if (x && !s[x]) { s[x] = 1; o.push(x); } });
      return o;
    }
    function norm(text) {
      return String(text || "")
        .replace(/\u2026|\.{3,}|…+/g, "")
        .replace(/\s+/g, "")
        .replace(/^["'「」“”]+|["'「」“”]+$/g, "");
    }
    function keepSpan(s, into) {
      s = String(s || "");
      if (s.length >= 2 && s.length <= MAX) into.push(s);
    }
    function splitLong(clause, into) {
      var re = new RegExp(CONJ.source, "g"), last = 0, m, hit = false, parts = [];
      while ((m = re.exec(clause))) {
        hit = true;
        parts.push(clause.slice(last, m.index));
        last = m.index + m[0].length;
      }
      if (!hit) return;
      parts.push(clause.slice(last));
      parts.forEach(function (p) { keepSpan(p, into); });
    }
    function groundedFragments(text) {
      var src = norm(text);
      var spans = [];
      if (src) {
        src.split(/[，。！？、；,.\n!?;:：]+/).forEach(function (clause) {
          if (!clause) return;
          if (clause.length <= MAX) { keepSpan(clause, spans); return; }
          splitLong(clause, spans);
        });
      }
      var list = uniq(spans);
      return { list: list, weak: list.length < 2, source: src };
    }
    function dirLabel20(v) {
      if (!v || !v.direction) return "";
      if (v.direction.id === "other") return v.direction.custom || "其他";
      return v.direction.label || "";
    }
    function attemptsOf(v) {
      var t0 = (v.take && v.take[0]) || "";
      var t1 = (v.take && v.take[1]) || "";
      var d = dirLabel20(v);
      var leave = (v.leave && v.leave[0]) || "";
      var lines = [];
      if (t0 && d) {
        lines.push("用你写下的「" + t0 + "」，在「" + d + "」里做一件今天能收尾的小事。");
        lines.push("今天只试一次：把「" + t0 + "」用在「" + d + "」上，做完就停。");
      } else if (t0) {
        lines.push("今天只用「" + t0 + "」做一件能做完的小事。");
        lines.push("把「" + t0 + "」收成一步，做完就停。");
      }
      if (t1 && d) lines.push("带着「" + t1 + "」，往「" + d + "」走一小步，一个人做完即可。");
      if (leave && t0) lines.push("先放下「" + leave + "」，只用「" + t0 + "」" + (d ? "碰一下「" + d + "」。" : "做一件小事。"));
      return uniq(lines);
    }
    function ensureAttempt(p) {
      if (!p || !p.v18 || !p.v18.direction || p.v18.edited) return;
      var v = p.v18, want = attemptsOf(v);
      if (!want.length) return;
      var ix = v.ix || 0;
      if (ix >= want.length) ix = ix % want.length;
      v.pool = want.slice();
      v.poolSig = want.join("\n");
      v.ix = ix;
      v.attempt = want[ix];
      if (!v.titleEdited) {
        var head = (v.take && v.take[0] ? v.take[0] : "这一版").slice(0, 8);
        v.title = head + " × " + (dirLabel20(v) || "新方向");
      }
      p.title = v.title;
      if (!v.enough) v.enough = "今天做到这儿就够了：做完这一件就停。";
      p.out = { title: v.title, first_step: v.attempt, star: v.enough, summary: v.attempt };
    }
    function prepareGrounded(p) {
      if (!p || !p.v18) return;
      var v = p.v18;
      v.custom = v.custom || [];
      var g = groundedFragments(p.idea || "");
      var sig = g.source + "\n" + v.custom.join("\n");
      v.fragments = g.list.slice();
      v.weak = g.list.length + v.custom.length < 2;
      if (v.board && v.board.v20 && v.board.sig === sig) return;
      function fromUser(w) {
        w = String(w || "");
        if (!w || w === SENT) return false;
        if (v.custom.indexOf(w) >= 0) return true;
        return g.source.indexOf(w) >= 0;
      }
      v.take = (v.take || []).filter(fromUser);
      v.leave = (v.leave || []).filter(fromUser);
      var pick = {};
      v.take.forEach(function (w) { pick[w] = "take"; });
      v.leave.forEach(function (w) { pick[w] = "leave"; });
      v.pick = pick;
      var seq = [];
      function add(w) { w = String(w || "").trim(); if (w && w !== SENT && seq.indexOf(w) < 0) seq.push(w); }
      g.list.forEach(add);
      v.custom.forEach(add);
      if (!seq.length) seq = [SENT];
      var placed = {};
      v.take.forEach(function (w) { placed[w] = 1; });
      v.leave.forEach(function (w) { placed[w] = 1; });
      var bubble = [null, null, null, null, null, null, null, null], n = 0, i;
      for (i = 0; i < seq.length && n < 8; i++) {
        if (!seq[i] || seq[i] === SENT || placed[seq[i]]) continue;
        bubble[n++] = seq[i];
      }
      v.board = { seq: seq, cursor: 0, bubble: bubble, v20: 1, sig: sig };
    }
    function tuneMaterialUi() {
      var p = curP();
      if (!p || !p.v18) return;
      var v = p.v18;
      var note = $("frag-weak");
      if (v.weak && note) {
        note.textContent = "这句还不好分成几条。可以自己加一个想带走的词，或回去改一句。";
        var q = $("src-quote");
        if (!q) {
          q = document.createElement("p");
          q.id = "src-quote";
          q.className = "srcquote";
          note.parentNode.insertBefore(q, note.nextSibling);
        }
        q.textContent = "原话：" + String(p.idea || "");
        var more = $("v19-more");
        if (more) more.hidden = false;
      }
      var real = ((v.board && v.board.seq) || []).filter(function (w) { return w && w !== SENT; });
      var swap = $("frag-swap");
      if (swap) swap.classList.toggle("hidden", real.length <= 8);
      document.querySelectorAll(".v19-sticker").forEach(function (el) {
        if (el.getAttribute("data-label") === SENT) el.parentNode.removeChild(el);
      });
    }
    function px(x, y, w, h, fill) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>';
    }
    function gramSvg() {
      var K = "#232B55", C = "#F7F0DF", B = "#5E72B5", D = "#4A5C9B", P = "#FFFBF1", S = "#E9DDBF";
      var h = "";
      /* 大喇叭口朝左，喉管收到右边的柜子上。 */
      h += px(1, 1, 10, 1, K);
      h += px(0, 2, 1, 12, K) + px(11, 2, 1, 4, K);
      h += px(1, 14, 8, 1, K);
      h += px(1, 2, 10, 2, P);
      h += px(1, 4, 10, 3, C);
      h += px(1, 7, 10, 2, B);
      h += px(1, 9, 10, 5, C);
      h += px(8, 6, 1, 6, S);
      h += px(9, 6, 4, 1, K) + px(9, 11, 4, 1, K);
      h += px(12, 7, 1, 4, K);
      h += px(9, 7, 3, 4, S);
      h += px(13, 8, 4, 2, D);
      h += px(13, 7, 4, 1, K) + px(13, 10, 4, 1, K);
      h += px(16, 10, 2, 5, K);
      h += px(17, 11, 1, 4, D);
      /* 柜子和唱片 */
      h += px(6, 15, 16, 9, K);
      h += px(7, 16, 14, 7, S);
      h += px(8, 17, 12, 5, C);
      h += '<g class="g-disc">';
      h += px(11, 17, 6, 1, K);
      h += px(10, 18, 8, 1, B);
      h += px(10, 19, 8, 1, D);
      h += px(11, 20, 6, 1, K);
      h += px(13, 18, 2, 2, P);
      h += "</g>";
      /* 摇把 */
      h += px(22, 18, 5, 1, K);
      h += px(26, 16, 1, 3, K);
      h += px(25, 15, 3, 1, C);
      h += '<text class="vz-time" id="vz-time" x="14" y="27.5" text-anchor="middle">0:30</text>';
      return '<svg class="gram" viewBox="0 0 30 29" width="168" height="162" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + h + "</svg>";
    }
    function markSvg() {
      var K = "#232B55", C = "#F7F0DF", B = "#5E72B5", P = "#FFFBF1";
      var h = "";
      h += px(1, 1, 11, 1, K) + px(12, 2, 3, 1, K);
      h += px(1, 2, 1, 12, K) + px(14, 3, 1, 11, K);
      h += px(1, 14, 14, 1, K);
      h += px(12, 1, 1, 2, K);
      h += px(2, 2, 9, 12, P);
      h += px(11, 3, 3, 3, C);
      h += px(4, 8, 2, 2, B) + px(6, 10, 2, 2, B) + px(8, 8, 2, 2, B) + px(10, 6, 2, 2, B);
      h += '<rect class="px-dot" x="12" y="2" width="1" height="1" fill="#5E72B5"/>';
      return '<svg viewBox="0 0 16 16" width="64" height="64" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' + h + "</svg>";
    }

    voiceHtml = function () {
      return '<div class="vz" id="vz" data-st="' + VZ.st + '">' +
        '<div class="vz-say" id="vz-say" aria-live="polite">' + esc(VSAY[VZ.st] || "") + "</div>" +
        '<div class="vz-card gl" id="vz-card"><textarea id="vz-text" rows="3" aria-label="转出来的文字，可以修改">' + esc(VZ.text) + '</textarea><span class="vz-ed">可修改</span></div>' +
        '<div class="vz-acts" id="vz-acts"><button class="sec2" id="vz-play">重听</button><button class="sec2" id="vz-redo">重来</button><button id="vz-ok">就这样</button></div>' +
        '<button class="vz-btn" id="vz-btn" aria-label="按住说话，松开结束，最多 30 秒">' + gramSvg() + "</button>" +
        '<div class="vz-hint" id="vz-hint">松开结束</div>' +
        '<button class="vz-type" id="vz-type">打字</button></div>';
    };

    playStar = (function (prev) {
      return function (el, small) {
        if (el && el.id === "ok-orb") return;
        return prev.apply(this, arguments);
      };
    })(playStar);

    headText = (function (prev) {
      return function (scr) {
        if (scr === "pick") return "如果保留过去的经验，<br>换一种接下来的生活，<br>你想试试什么？";
        return prev.apply(this, arguments);
      };
    })(headText);

    renderMaterial = (function (prev) {
      return function () {
        prepareGrounded(curP());
        prev.apply(this, arguments);
        tuneMaterialUi();
      };
    })(renderMaterial);

    renderCheck = (function (prev) {
      return function () {
        ensureAttempt(curP());
        return prev.apply(this, arguments);
      };
    })(renderCheck);

    function composeOk() {
      var p = curP(), screen = $("ok-screen");
      if (!screen || !p || !p.v18) return;
      var v = p.v18;
      var orb = $("ok-orb");
      if (orb) {
        orb.className = "okmark";
        orb.innerHTML = markSvg();
        orb.setAttribute("data-lit", "1");
      }
      var h2 = screen.querySelector("h2");
      var sub = screen.querySelector(".oksub");
      if (sub) {
        var d = dirLabel20(v);
        sub.textContent = d ? ("方向是「" + d + "」。") : "这一版先留这一步。";
      }
      if (!screen.querySelector(".okhead")) {
        var head = document.createElement("div");
        head.className = "okhead";
        var col = document.createElement("div");
        col.className = "okhead-copy";
        if (orb) head.appendChild(orb);
        if (h2) col.appendChild(h2);
        if (sub) col.appendChild(sub);
        head.appendChild(col);
        screen.insertBefore(head, screen.firstChild);
      }
      var tryEl = $("ok-try");
      if (!tryEl) {
        tryEl = document.createElement("p");
        tryEl.id = "ok-try";
        tryEl.className = "ok-try";
        var kaitu = $("kaitu");
        if (kaitu && kaitu.parentNode) kaitu.parentNode.insertBefore(tryEl, kaitu);
        else screen.appendChild(tryEl);
      }
      tryEl.textContent = v.attempt || "";
      screen.classList.add("okpanel");
    }
    renderSave = (function (prev) {
      return function () {
        var r = prev.apply(this, arguments);
        composeOk();
        return r;
      };
    })(renderSave);

    screenUpdate = (function (prev) {
      return function () {
        prev.apply(this, arguments);
        document.body.classList.add("v20");
      };
    })(screenUpdate);

    function setEvidence(items) {
      var next = [];
      (items || []).forEach(function (it) {
        if (!it || typeof it.text !== "string" || typeof it.source !== "string") return;
        var text = it.text.trim(), source = it.source.trim();
        if (!text || !source) return;
        next.push({ id: String(it.id || next.length + 1), text: text.slice(0, 80), source: source.slice(0, 160) });
      });
      evidence = next;
      return evidence.slice();
    }

    window.__lingcun20 = {
      fragments: groundedFragments,
      attempts: function () { var p = curP(); return p && p.v18 ? attemptsOf(p.v18) : []; },
      evidence: function () { return evidence.slice(); },
      setEvidence: setEvidence
    };
  })();
