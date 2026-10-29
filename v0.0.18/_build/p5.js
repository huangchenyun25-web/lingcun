
  /* ========== 可选增强模块：能力对照（#11 定稿：有对象、有依据、有确定程度；不出现孤立的等级词） ========== */
  var DIRS = [{ id: "ipcm", name: "科技AI · IP/内容营销", cached: true }, { id: "sea", name: "科技AI · 出海营销" }, { id: "pm", name: "AI 产品经理" }];
  var AXIS_CAT = { mx: ["exp", { x_type: 1 }], tr: ["generic", { g_form: 0, g_kind: 0 }], pf: ["generic", { g_form: 1, g_kind: 0 }], wk: ["exp", { x_type: 1 }], dt: ["tool", {}], ai: ["generic", { g_form: 2, g_kind: 0 }],
    kol: ["generic", { g_form: 0, g_kind: 1 }], cp: ["exp", { x_type: 0 }], cm: ["generic", { g_form: 2, g_kind: 1 }], ip: ["generic", { g_form: 0, g_kind: 1 }], en: ["generic", { g_form: 0, g_kind: 0 }] };
  var M_ROLE = ["主导：主要是我定的", "参与执行：我负责其中一块", "协助：我帮忙做了一部分"];
  var M_ATT = ["附上了（有链接、文件或截图）", "没有附材料"];
  var M_CHK = ["核对过（有公开来源或第三方能证明）", "还没有核对"];
  var M_PUB = ["可以公开给任何人看", "只能私下给人看（比如面试时）", "只在我自己这儿"];
  function matchDir() { var a = S.match.dir; if (!a) return null; if (a.skip) return { skip: true }; if (a.otherOn) return a.other ? { id: "other", name: a.other } : null; return DIRS[a.i] ? { id: DIRS[a.i].id, name: DIRS[a.i].name, cached: !!DIRS[a.i].cached } : null; }
  function matchBasis() { var p = S.match.from >= 0 ? S.projects[S.match.from] : null, t = ""; if (p && (p.cat === "exp" || p.cat === "resume")) t = textsOf(p.cat === "exp" ? caseFacts(p) : inputsOf(p)).filter(function (x) { return x !== PEND; }).join("；"); return (t + " " + (S.match.desc || "")).trim(); }
  function axisHit(ax, basis) { basis = basis.toLowerCase(); return ax.kw.some(function (k) { return basis.indexOf(k.toLowerCase()) >= 0; }); }
  var VAGUE_DID = /^(我)?(主导|负责|参与|做|协助|带|管)(过|了)?([、，,\s]*(有数据|有结果|很多|一些|不少|这个|这块|相关的事))*[。.！!]?$/;
  var VAGUE_RES = /^(有数据|有结果|还行|不错|挺好|很好|数据不错|数据一般|有|效果好|效果不错|反响不错)[。.！!]?$/;
  function judgeMatch(axName, dirName, it) {
    var did = String(it.did || "").replace(/\s+/g, ""), res = String(it.result || "").replace(/\s+/g, "");
    var vague = !did || did.length < 8 || VAGUE_DID.test(did) || /^(我)?主导过[、，,]?有数据$/.test(did) || !res || (res.length < 6 && !/\d/.test(res)) || VAGUE_RES.test(res);
    if (vague) return { need: true, text: "信息还不够，先不下判断。能再说说：你本人具体做了哪几件事（比如定了什么、写了什么、对接了谁）？结果是什么（有数字就写上，并说从哪来）？" };
    var role = it.role && typeof it.role.i === "number" && !it.role.skip ? it.role.i : -1;
    var att = it.att && it.att.i === 0, chk = it.chk && it.chk.i === 0;
    var cert = att && chk ? "匹配度较高，有你附上并核对过的材料" : role === 2 ? "有一定关联，属于初步判断" : "初步匹配度高";
    var basisWord = att && chk ? "依据你的描述和你附上的材料" : "依据你的描述";
    var roleWord = role === 2 ? "你协助做了：" : "你负责了：";
    var pub = it.pub && typeof it.pub.i === "number" && !it.pub.skip ? it.pub.i : -1;
    var pubHint = pub === 0 ? "材料可以公开，下次给人看时可以直接附上链接。" : pub === 1 ? "这份材料适合面试时讲，或私下发给对方看；想让人直接看到，可以补一个能公开的版本。" : pub === 2 ? "材料目前只在你自己这儿，适合你讲给人听；想让人直接看到，可以补一个能公开的版本。" : "";
    var text = "这段经历与「" + dirName + "」方向的「" + axName + "」这一项较贴合（" + cert + "）。" + basisWord + "，" + roleWord + it.did.trim().replace(/[。.]$/, "") + "；结果是：" + it.result.trim().replace(/[。.]$/, "") + "。" +
      (att && chk ? "这个判断参考了你说核对过的材料，页面本身没法替你核实真假。" : "这个判断尚未核对材料；以后有合适材料，可以再补充。") + (pubHint ? pubHint : "");
    return { need: false, text: text, cert: cert };
  }
  function matchGaps() {
    var d = matchDir(); if (!d || !d.cached) return [];
    var basis = matchBasis();
    return JD_LIB.ipcm.axes.slice().sort(function (x, y) { return x.rank - y.rank; }).filter(function (ax) { var it = S.match.items[ax.id]; return !axisHit(ax, basis) && !(it && it.verdict && !it.verdict.need); }).slice(0, 4).map(function (ax) {
      var m = AXIS_CAT[ax.id] || ["generic", {}], pl = PLAIN[ax.id] || {};
      return { ax: ax, cat: m[0], pre: m[1], idea: pl.get || ax.fix };
    });
  }
  function openMatch() { S.match.from = S.cur; save(); $("s-match").classList.remove("hidden"); renderMatch(); try { $("s-match").scrollIntoView({ behavior: smooth(), block: "start" }); } catch (e) {} }
  function renderMatch() {
    var B = $("b-match"), d = matchDir(), basis = matchBasis();
    var h = '<p class="hint">这是可选的增强模块：不打分，只看这段经历和某个方向的哪几项较贴合、依据是什么。主流程不需要它。</p>' +
      '<div class="known"><div><span>依据的材料：' + esc(basis ? short(basis, 90) : "还没有。可以在下面写一段经历。") + "</span></div></div>" +
      '<label class="field"><span class="h">补充一段描述（可选）：做过什么、结果怎样</span><textarea id="m-desc" rows="2" placeholder="例：负责过品牌小红书账号，每周 3 篇，半年涨粉 2 万（后台数据）">' + esc(S.match.desc) + "</textarea></label>" +
      qHtml("mdir", "想对照哪个方向？", DIRS.map(function (x) { return x.name + (x.cached ? "（已收 8 份官网 JD，可以逐项对照）" : "（还没收 JD）"); }), S.match.dir);
    if (d && d.skip) h += '<div class="next"><b>下一步：</b>先不对照也完全可以。点上面「收起，回到刚才那一步」接着做你的东西。</div>';
    else if (d && !d.cached) h += '<div class="note">「' + esc(d.name) + '」还没收好官网 JD，先不逐项对照。</div><div class="next"><b>下一步：</b>把一段和这个方向有关的真实经历写成复盘，当作这个方向的第一份材料。</div><div class="row"><button class="small" id="m-tocase">写一段和「' + esc(short(d.name, 12)) + "」有关的经历复盘</button></div>";
    else if (d && d.cached) {
      var axes = JD_LIB.ipcm.axes.slice().sort(function (x, y) { return x.rank - y.rank; });
      var one = function (ax) {
        var it = S.match.items[ax.id] || {}, hit = axisHit(ax, basis), open = S.match.open === ax.id;
        var x = '<div class="axis" id="axis-' + ax.id + '"><div class="nm">' + esc(ax.name) + '</div><div class="hint" style="margin:2px 0">' + (hit ? "你的材料里提到了相关的事。" : "还没看到相关经历。") + "</div>";
        if (it.verdict) x += '<div class="verdict' + (it.verdict.need ? " need" : "") + '" data-verdict="' + ax.id + '">' + esc(it.verdict.text) + "</div>" + (it.verdict.need ? "" : '<div class="hint">材料记录：' + esc([qText(M_ATT, it.att) || "附没附：没说", qText(M_CHK, it.chk) || "核对：没说", qText(M_PUB, it.pub) || "能不能公开：没说"].join(" · ")) + "</div>");
        if (open) x += '<div class="cred" data-form="' + ax.id + '"><label class="field"><span class="t">你本人具体做了什么？</span><textarea id="m-did-' + ax.id + '" rows="2" placeholder="例：负责选题、写脚本、执行发布，并做了效果复盘">' + esc(it.did || "") + '</textarea></label><label class="field"><span class="t">结果是什么？</span><textarea id="m-res-' + ax.id + '" rows="2" placeholder="例：一场 300 人快闪，小红书笔记曝光 20 万（后台截图）">' + esc(it.result || "") + "</textarea></label>" +
          qHtml("mrole_" + ax.id, "你在里面是什么角色？", M_ROLE, it.role) + qHtml("matt_" + ax.id, "材料附上了吗？", M_ATT, it.att) + qHtml("mchk_" + ax.id, "材料核对过吗？", M_CHK, it.chk) + qHtml("mpub_" + ax.id, "材料能公开吗？", M_PUB, it.pub) +
          '<div class="row"><button class="small" data-judge="' + ax.id + '">帮我看看</button><button class="ghost small" data-mclose="1">先不说</button></div></div>';
        else x += '<div class="row"><button class="sec2 small" data-mopen="' + ax.id + '">' + (it.verdict ? "补充 / 改一改" : "说说我这方面的经历") + "</button>" + (!hit && !(it.verdict && !it.verdict.need) ? '<button class="ghost small" data-mgap="' + ax.id + '">还没有：做一件补上它</button>' : "") + "</div>";
        return x + '<div class="src">8 份官网 JD 里 ' + ax.cnt + " 份写了（" + esc(ax.who) + "）· " + esc(ax.quote) + "</div></div>";
      };
      h += axes.filter(function (a) { return a.rank <= 3; }).map(one).join("") + '<details' + (axes.some(function (a) { return a.rank > 3 && (a.id === S.match.open || a.id === S.match.last); }) ? " open" : "") + '><summary>其余 ' + axes.filter(function (a) { return a.rank > 3; }).length + " 项（展开）</summary>" + axes.filter(function (a) { return a.rank > 3; }).map(one).join("") + "</details>" +
        '<details><summary>这些要求来自哪 8 份官网 JD</summary><div class="hint">' + JD_LIB.ipcm.sources.map(function (s) { return esc(s[0]) + " · " + esc(s[2]) + ' · <a href="' + esc(s[3]) + '" target="_blank" rel="noopener noreferrer">官网</a>'; }).join("<br>") + "<br>JD 写的是理想人选，不是录用底线；这里只用来找你身上已经有的东西。</div></details>" +
        '<div class="next"><b>下一步：</b>看完就点上面「收起，回到刚才那一步」接着做；想补哪一项，点那一项的「还没有：做一件补上它」。</div>';
    }
    B.innerHTML = h;
    $("m-desc").oninput = function () { S.match.desc = this.value; save(); };
    $("m-desc").onchange = function () { renderMatch(); };
    bindQ(B, "mdir", false, function (v) { S.match.dir = v; save(); renderMatch(); });
    if ($("m-tocase")) $("m-tocase").onclick = function () { closeMatch(); S.entry.small = false; startProject("exp", "和「" + d.name + "」方向有关的一段经历"); };
    B.querySelectorAll("[data-mopen]").forEach(function (b) { b.onclick = function () { S.match.open = b.getAttribute("data-mopen"); save(); renderMatch(); }; });
    B.querySelectorAll("[data-mclose]").forEach(function (b) { b.onclick = function () { S.match.open = ""; save(); renderMatch(); }; });
    B.querySelectorAll("[data-mgap]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-mgap"), m = AXIS_CAT[id] || ["generic", {}]; closeMatch(); S.entry.small = false; startProject(m[0], (PLAIN[id] || {}).get || "", m[1]); }; });
    B.querySelectorAll("[data-form]").forEach(function (box) {
      var id = box.getAttribute("data-form"), it = S.match.items[id] = S.match.items[id] || {};
      ["mrole_", "matt_", "mchk_", "mpub_"].forEach(function (pre) { bindQ(box, pre + id, false, function (v) { it[{ mrole_: "role", matt_: "att", mchk_: "chk", mpub_: "pub" }[pre]] = v; save(); }); });
      $("m-did-" + id).oninput = function () { it.did = this.value; save(); };
      $("m-res-" + id).oninput = function () { it.result = this.value; save(); };
    });
    B.querySelectorAll("[data-judge]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-judge"), it = S.match.items[id], ax = JD_LIB.ipcm.axes.filter(function (a) { return a.id === id; })[0]; it.verdict = judgeMatch(ax.name, d.name, it); S.match.last = id; if (!it.verdict.need) S.match.open = ""; save(); renderMatch(); }; });
  }
  function closeMatch() { $("s-match").classList.add("hidden"); var el = $("s-" + S.stage); if (el) try { el.scrollIntoView({ behavior: smooth(), block: "start" }); } catch (e) {} }


  /* ========== #18 发布：可点的步骤 + 下载为 index.html + 选填用户名/仓库名生成链接；不自动发布，也不说「已经发布」 ========== */
  var GH_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, GH_REPO = /^[A-Za-z0-9._-]{1,100}$/;
  function ghLinks(u, r) {
    u = String(u || "").trim(); r = String(r || "").trim();
    if (!u || !r) return null;
    if (!GH_USER.test(u) || !GH_REPO.test(r)) return { bad: true };
    var eu = encodeURIComponent(u), er = encodeURIComponent(r);
    return { upload: "https://github.com/" + eu + "/" + er + "/upload/main", pages: "https://github.com/" + eu + "/" + er + "/settings/pages", site: "https://" + u.toLowerCase() + ".github.io/" + er + "/" };
  }
  function ghLinksHtml() {
    var g = S.gh || {}, L = ghLinks(g.u, g.r);
    if (!L) return '<p class="hint">填好用户名和仓库名，这里会出现三个链接：上传页、Pages 设置页、预计的公开网址。</p>';
    if (L.bad) return '<div class="warnbox">用户名只能有英文字母、数字和「-」；仓库名只能有英文字母、数字和「. _ -」。</div>';
    return '<div class="ghlinks"><a class="btnlink" id="gh-up" href="' + esc(L.upload) + '" target="_blank" rel="noopener noreferrer">④ 打开上传页 ↗</a><a class="btnlink" id="gh-pages" href="' + esc(L.pages) + '" target="_blank" rel="noopener noreferrer">⑤ 打开 Pages 设置页 ↗</a></div>' +
      '<div class="note">预计的公开网址：<a id="gh-site" href="' + esc(L.site) + '" target="_blank" rel="noopener noreferrer">' + esc(L.site) + "</a><br>这只是按你填的名字算出来的地址。要等你上传 index.html、在 Pages 设置里选好 main 并点 Save，再等一两分钟，它才能打开；页面没法替你确认。</div>";
  }
  function publishHtml(p) {
    var g = S.gh || {};
    return '<details id="pub-gh"' + (g.open ? " open" : "") + '><summary>想放到网上给人看？（可选）</summary>' +
      '<p class="hint">下面的按钮都在新标签页打开 GitHub，这一页不会关；步骤留在这里，回来接着看就行。</p><ol class="steps">' +
      '<li>注册或登录 GitHub。<div class="ghlinks"><a class="btnlink" id="gh-signup" href="https://github.com/signup" target="_blank" rel="noopener noreferrer">注册 GitHub ↗</a><a class="btnlink" id="gh-login" href="https://github.com/login" target="_blank" rel="noopener noreferrer">登录 ↗</a></div></li>' +
      '<li>新建一个公开（Public）仓库，名字用英文，例如 my-work。<div class="ghlinks"><a class="btnlink" id="gh-new" href="https://github.com/new" target="_blank" rel="noopener noreferrer">新建仓库 ↗</a></div></li>' +
      '<li>把这件作品下载成 index.html（GitHub Pages 要这个文件名才能直接打开）。<div class="ghlinks"><button class="small" id="gh-dl">下载为 index.html（放 GitHub 用）</button></div></li>' +
      "<li>在仓库里点 Add file → Upload files，把 index.html 拖进去，点 Commit changes。</li>" +
      "<li>Settings → Pages → Branch 选 main，点 Save。等一两分钟。</li></ol>" +
      '<div class="qt" style="font-weight:400">选填：填了用户名和仓库名，第 4、5 步可以直接点</div><div class="grid2"><label class="field"><span class="h">GitHub 用户名</span><input type="text" id="gh-user" autocomplete="off" placeholder="例：chenyun" value="' + esc(g.u || "") + '" /></label>' +
      '<label class="field"><span class="h">仓库名</span><input type="text" id="gh-repo" autocomplete="off" placeholder="例：my-work" value="' + esc(g.r || "") + '" /></label></div><div id="gh-links">' + ghLinksHtml() + "</div>" +
      '<p class="hint">发小红书、公众号也可以：把里面最关键的一段和一两张图发出去。只自己用、不公开也完全算数。</p></details>';
  }
  function bindPublish(p) {
    S.gh = S.gh || {};
    $("pub-gh").ontoggle = function () { S.gh.open = this.open; save(); };
    $("gh-dl").onclick = function () { download("index.html", renderOut(p, true)); };
    ["gh-user", "gh-repo"].forEach(function (id) { $(id).oninput = function () { S.gh[id === "gh-user" ? "u" : "r"] = this.value.trim(); save(); $("gh-links").innerHTML = ghLinksHtml(); }; });
  }

  /* ========== #22 星图（沿用 #17 背包的数据和详情页）：第一局登陆月球，之后每完成一件点亮一颗新星球；没做完的「航行中」 ========== */
  var bagView = { type: "", status: "", open: -1 };
  function statusOf(p) {
    if (p.landed) { var pl = planetOf(p.planet); return { k: "done", t: "已登陆 · " + pl.n + (p.saved ? "" : "（改过，还没再确认）") }; }
    return { k: "wip", t: "航行中 · " + (p.out ? "做出了第一版，还没登月" : "停在「" + STAGES[stageIdx(p.stage)].name + "」") };
  }
  function fmtTime(t) { if (!t) return "时间不详"; var d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; }; return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + z(d.getHours()) + ":" + z(d.getMinutes()); }
  function summaryOf(p) {
    var o = p.out;
    if (o) {
      var s = o.summary || o.logline || o.one_line || o.intro || "";
      if (!s && o.sections && o.sections[0]) s = o.sections[0].text || o.sections[0].summary || "";
      if (!s && o.experiences && o.experiences[0]) s = o.experiences[0].org + " · " + o.experiences[0].role;
      if (s) return short(String(s).replace(/\s+/g, " "), 60);
    }
    var t = textsOf(inputsOf(p)).filter(function (x) { return x && x !== PEND; })[0];
    return t ? "材料：" + short(String(t), 50) : "还没填材料";
  }
  function renderBagBtn() { var b = $("bag-btn"); if (b) b.innerHTML = " 星图 <b>(" + S.projects.length + ")</b>"; }
  function openBag(i) { bagView.open = typeof i === "number" ? i : -1; $("bag-panel").classList.remove("hidden"); document.body.classList.add("bagopen"); renderBag(); }
  function closeBag() { $("bag-panel").classList.add("hidden"); document.body.classList.remove("bagopen"); }
  function cardHtml(x) {
    var p = x.p, st = statusOf(p), pl = p.landed ? planetOf(p.planet) : null;
    return '<button class="bagcard ' + st.k + (x.i === S.cur ? " cur" : "") + '" data-bag-card="' + x.i + '"' + (pl ? ' data-planet="' + p.planet + '"' : " data-sailing=\"1\"") + ">" +
      (pl ? '<span class="orb" style="--c:' + pl.c + ";--c2:" + pl.c2 + '" aria-hidden="true"></span><span class="pn">' + esc(pl.n) + "</span>" : '<span class="orb ship" aria-hidden="true"></span><span class="pn">航行中</span>') +
      '<span class="bc-n">' + esc(CATS[p.cat].icon + " " + (p.title || titleFromInput(p))) + '</span><span class="bc-s">' + esc(summaryOf(p)) + '</span><span class="bc-m"><span class="tag ' + st.k + '">' + esc(st.t) + "</span> " + esc(CATS[p.cat].name) + " · 最后修改 " + esc(fmtTime(p.updatedAt)) + (x.i === S.cur ? " · 正在做" : "") + "</span></button>";
  }
  function renderBag() {
    var B = $("bag-body"), h = "";
    if (bagView.open >= 0 && S.projects[bagView.open]) return renderBagDetail(bagView.open);
    var cats = []; S.projects.forEach(function (p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    var list = S.projects.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return (!bagView.type || x.p.cat === bagView.type) && (!bagView.status || statusOf(x.p).k === bagView.status); });
    var planets = list.filter(function (x) { return x.p.landed; }).sort(function (a, b) { return a.p.planet - b.p.planet; });
    var sailing = list.filter(function (x) { return !x.p.landed; }).sort(function (a, b) { return (b.p.updatedAt || 0) - (a.p.updatedAt || 0); });
    var nL = S.projects.filter(function (p) { return p.landed; }).length, nS = S.projects.length - nL;
    if (!S.projects.length) h = '<div class="starmap"><div class="note" style="margin:0">星图还是空的。做完一件、确认之后，你会登上第一颗星球：月球 。没做完的也会在这里，标成「航行中」。</div></div><div class="row"><button class="small" id="bag-start">开始第一局</button></div>';
    else {
      h = '<p class="hint" id="bag-sum">登陆过 ' + nL + " 颗星球，航行中 " + nS + " 件。点一颗看看，再决定怎么打开。</p>" +
        '<details class="bagfilter-wrap"' + (bagView.type || bagView.status ? " open" : "") + '><summary>筛选</summary><div class="bagfilter"><label>类型 <select id="bag-type"><option value="">全部</option>' + cats.map(function (k) { return '<option value="' + k + '"' + (bagView.type === k ? " selected" : "") + ">" + esc(CATS[k].name) + "</option>"; }).join("") + "</select></label>" +
        '<label>状态 <select id="bag-status"><option value="">全部</option><option value="wip"' + (bagView.status === "wip" ? " selected" : "") + '>航行中</option><option value="done"' + (bagView.status === "done" ? " selected" : "") + ">已登陆</option></select></label></div></details>" +
        '<div class="starmap" id="starmap">' + (planets.length ? '<div class="qt" style="margin-top:0"> 登陆过的星球</div><div class="planets baglist">' + planets.map(cardHtml).join("") + "</div>" : (bagView.status === "wip" ? "" : '<p class="hint" style="margin:0">还没有登陆过的星球。做完一件、确认之后，第一颗是月球 。</p>')) +
        (sailing.length ? '<div class="qt"> 航行中</div><div class="sailing baglist">' + sailing.map(cardHtml).join("") + "</div>" : "") +
        (!planets.length && !sailing.length ? '<div class="note">这个筛选下没有东西。</div>' : "") + "</div>" +
        '<div class="row"><button class="ghost small" id="bag-other">做一件新的</button></div>';
    }
    B.innerHTML = h;
    if ($("bag-type")) $("bag-type").onchange = function () { bagView.type = this.value; renderBag(); };
    if ($("bag-status")) $("bag-status").onchange = function () { bagView.status = this.value; renderBag(); };
    B.querySelectorAll("[data-bag-card]").forEach(function (b) { b.onclick = function () { bagView.open = +b.getAttribute("data-bag-card"); renderBag(); }; });
    var other = $("bag-other") || $("bag-start"); if (other) other.onclick = startOther;
  }
  function startOther() { closeBag(); S.cur = -1; S.entry.act = ""; go("pick"); toast("选一个主题"); }
  function renderBagDetail(i) {
    var p = S.projects[i], c = CATS[p.cat], st = statusOf(p), B = $("bag-body");
    var where = p.saved || p.out ? "检查与修改" : STAGES[stageIdx(p.stage)].name;
    B.innerHTML = '<button class="ghost small" id="bd-back">← 回到星图</button>' +
      '<div class="bd-h" id="bd-title">' + esc(c.icon + " " + (p.title || titleFromInput(p))) + '</div><div class="hint"><span class="tag ' + st.k + '">' + esc(st.t) + "</span> 【" + esc(THEMES[themeOf(p)].name) + "】" + esc(c.name) + " · 最后修改 " + esc(fmtTime(p.updatedAt)) + (p.revs ? " · 改过 " + p.revs + " 次" : "") + (p.from ? " · 沿用了另一件的设置" : "") + "</div>" +
      '<p class="bd-s">' + esc(summaryOf(p)) + "</p>" + (p.landed && p.change ? '<p class="hint">完成卡上那句话：' + esc(changeLine(p)) + "</p>" : "") +
      '<div class="big bd-acts">' +
      '<button class="bigbtn" id="bd-view"' + (p.out ? "" : " disabled") + '><strong> 查看成果</strong><small>' + (p.out ? "在这里看一眼，不改动它。" : "这一件还没做出第一版。") + "</small></button>" +
      '<button class="bigbtn" id="bd-edit"><strong> 继续修改这一件</strong><small>改的就是这一件本身；回到「' + esc(where) + "」。" + (p.landed ? "" : "做完、确认之后就能登陆。") + "</small></button>" +
      '<button class="bigbtn" id="bd-new"><strong> 沿用设置做一件新的</strong><small>原作原样保留；新的一件带上' + (c.keep.length ? "这些设置（" + esc(c.keep.map(function (id) { var f = fieldById(p, id); return f ? f.t.replace(/[（(？?：:].*$/, "") : ""; }).filter(Boolean).join("、")) + "）" : "同样的做法") + "，从补齐材料开始。</small></button>" +
      '<button class="bigbtn" id="bd-dl"' + (p.out ? "" : " disabled") + '><strong> 下载</strong><small>' + (p.out ? esc(fileName(p)) + "，双击就能打开。" : "做出第一版之后才能下载。") + "</small></button></div>" +
      '<div id="bd-prev-wrap" class="hidden"><iframe class="preview" id="bd-prev" sandbox="allow-scripts" title="成果预览"></iframe></div>' +
      '<div class="row"><button class="ghost small" id="bd-other">做一件新的</button></div>';
    $("bd-back").onclick = function () { bagView.open = -1; renderBag(); };
    $("bd-view").onclick = function () { if (!p.out) return; $("bd-prev-wrap").classList.remove("hidden"); setPreview("bd-prev", renderOut(p, false)); };
    $("bd-edit").onclick = function () { closeBag(); bagView.open = -1; S.cur = i; p.paused = false; go(p.saved || p.out ? "check" : (p.stage || "material")); toast("在改「" + (p.title || c.name) + "」这一件"); };
    $("bd-new").onclick = function () { closeBag(); bagView.open = -1; newFromSettings(p); toast("新开了一件，原作留在星图里"); };
    $("bd-dl").onclick = function () { if (p.out) download(fileName(p), renderOut(p, true)); };
    $("bd-other").onclick = function () { bagView.open = -1; startOther(); };
  }

  /* ========== 卡住能问（#10）：每一步都有，答完接回这一步；默认仍以选择题推进 ========== */
  var GLOSS = [
    [/免费|额度|中转/, "「免费体验额度」是另存人生替你付的 AI 调用：不用注册、不用密钥，每人每天有一定次数，够走完一局。用完了明天再来，或者在右上角「AI：…」里填你自己的密钥接着做。中转服务只转发，不保存你的内容。"],
    [/api\s*(密钥|key)|密钥/i, "API 密钥是一串像密码的字符，AI 服务（比如 DeepSeek、阿里云百炼）用它认出是你在调用，并从你的账户扣额度。默认不用填：页面先用免费体验额度。想多玩几局，可以在右上角「AI：…」里填自己的密钥；它只存在你这个浏览器里，不会发给另存人生。"],
    [/星图|星球|航行中|登月|登陆/, "每做完一件、你确认过，就算登陆一颗星球：第一颗是月球，之后每一件点亮一颗新的。没做完的标成「航行中」，都在右上角  星图里，点开能继续或查看。"],
    [/待补/, "「待补」表示这一项你先跳过了，还没给。页面和 AI 都不会替你编成事实（写小说除外：跳过的设定由 AI 来创作）。以后想补，回到「补齐材料」点「改」。"],
    [/localstorage|存在哪|存哪/i, "你的进度和作品存在这台设备的这个浏览器里（localStorage），网址里不带任何进度。同一个浏览器再打开这一页就能接上；换电脑要先在页面最下面下载进度文件。"],
    [/结构|大纲/, "结构就是先列出故事分几段、每段讲什么。中长篇先出结构，你看过再一段一段展开，这样不用一次干等整篇写完。"],
    [/做成程度/, "做成程度是你自己的判断：还不满意 / 基本满意 / 已经在用或发出去了。它只帮你记一下，不影响能不能保存。"],
    [/能力对照/, "能力对照是可选的：看看一段经历和某个方向的哪几项较贴合、依据是什么。不打分，也不是必经的一步。"]
  ];
  function glossary(q) { if (!/是什么|什么意思|啥意思|指什么|是啥|怎么理解/.test(q) || q.length > 40) return ""; for (var i = 0; i < GLOSS.length; i++) if (GLOSS[i][0].test(q)) return GLOSS[i][1]; return ""; }
  function askTask(q) {
    var p = curP(), st = STAGES[stageIdx(S.stage)];
    var inputs = { question: q, where: { stage: st.name, todo: st.todo, category: p ? CATS[p.cat].name : "", project: p ? p.title : "", answered: p ? inputsOf(p) : {} },
      environment: { page: "另存人生 v" + VERSION + "（单个网页）", ai_mode: AI.mode() || "还没选", provider: AI.mode() === "direct" ? AI.P().name : "", model: AI.mode() === "direct" ? AI.cfg().model : "", browser: String(navigator.userAgent || "").replace(/^Mozilla\/5\.0 /, "").slice(0, 120), online: navigator.onLine } };
    return { type: "ask", key: "ask", category: p ? CATS[p.cat].name : "", title: "回答你的问题", role: "温和的引导者，陪零基础的人在这一页里把东西做出来",
      instructions: ["用两三句大白话回答 question；是术语就先解释它是什么，再说在这一步里意味着什么。", "是报错就结合 environment 说最可能的原因，和一个在这一页里就能做的动作（比如检查密钥、换一家、把材料改小）。", "不让用户离开这一页去别的工具。back_to_step 用一句话说回到这一步要做什么。"],
      factRule: "只依据 inputs 回答；不确定就直说不确定，不编造页面上没有的功能。", inputs: inputs, schema: { type: "object", required: ["answer", "back_to_step"], properties: { answer: STR(600), back_to_step: STR(120) } } };
  }
  function appendAsk(stage) {
    document.querySelectorAll(".ask").forEach(function (x) { x.remove(); });
    var body = $("b-" + stage); if (!body) return;
    var open = S.ask.stage === stage && !S.ask.resolved;
    var d = document.createElement("details"); d.className = "ask"; d.id = "ask"; if (open) d.open = true;
    d.innerHTML = '<summary> 卡住了？直接告诉我你看到什么</summary><p class="hint">可以说「我不明白」、问一个词、贴一段报错。问完会接回这一步，你的选择都还在原地。</p>' +
      '<div class="chipq"><button data-aq="我不明白这一步要做什么">我不明白这一步</button><button data-aq="「待补」是什么意思？">这个词是什么意思</button><button data-aq="出现了报错：">出现了报错</button></div>' +
      '<textarea id="ask-q" rows="2" placeholder="例：「待补」是什么意思？／ 点了按钮之后出现「连不上」">' + esc(open ? S.ask.q : "") + '</textarea><div class="row"><button class="small" id="ask-go">问一下</button></div><div id="ask-slot"></div><div id="ask-ans"></div>';
    body.appendChild(d);
    d.querySelectorAll("[data-aq]").forEach(function (b) { b.onclick = function () { $("ask-q").value = b.getAttribute("data-aq"); $("ask-q").focus(); }; });
    if (open && S.ask.a) showAnswer(S.ask.a);
    $("ask-go").onclick = function () {
      var q = $("ask-q").value.trim(); if (!q) { toast("写一句你看到了什么"); return; }
      S.ask = { q: q, stage: S.stage, resolved: false, a: null }; save();
      var g = glossary(q);
      if (g) { S.ask.a = { answer: g, back_to_step: "回到「" + STAGES[stageIdx(S.stage)].name + "」：" + STAGES[stageIdx(S.stage)].todo + "。", local: true }; save(); showAnswer(S.ask.a); return; }
      AI.run(askTask(q), $("ask-slot")).then(function (o) { if (S.ask.q !== q) return; S.ask.a = o; save(); if ($("ask-ans")) showAnswer(o); });
    };
  }
  function showAnswer(o) {
    $("ask-ans").innerHTML = '<div class="ans" data-answer><div>' + esc(o.answer) + '</div><div class="next" style="margin-top:8px"><b>回到这一步：</b>' + esc(o.back_to_step) + '</div><div class="row"><button class="small" id="ask-back">回到这一步</button><button class="ghost small" id="ask-more">还是不明白，换个说法问</button></div></div>';
    $("ask-back").onclick = function () { S.ask.resolved = true; save(); var d = $("ask"); if (d) d.open = false; var el = $("s-" + S.stage); if (el) try { el.scrollIntoView({ behavior: smooth(), block: "start" }); } catch (e) {} toast("好，接着这一步"); };
    $("ask-more").onclick = function () { $("ask-q").value = ""; $("ask-q").focus(); };
  }

  /* ========== 回来时接上次进度（#10） ========== */
  function showResume() {
    var p = curP(); if (!p) return;
    var st = STAGES[stageIdx(S.stage)], q = S.ask.q && !S.ask.resolved ? "「" + S.ask.q + "」（还没解决）" : "「" + st.todo + "」";
    $("resume").innerHTML = '<div><b>欢迎回来。上次做到这里，留下了这个问题：</b>' + esc(q) + '</div><div class="hint" style="margin-top:4px">位置：' + esc(st.name) + " · " + esc(CATS[p.cat].name) + (p.title ? "「" + esc(p.title) + "」" : "") + "</div>" +
      '<div class="row"><button class="small" id="rs-go">继续</button><button class="sec2 small" id="rs-edit">修改</button><button class="ghost small" id="rs-later">先放下</button></div>';
    $("resume").classList.remove("hidden"); try { window.scrollTo(0, 0); } catch (e) {}
    $("rs-go").onclick = function () { $("resume").classList.add("hidden"); if (S.ask.q && !S.ask.resolved) S.ask.stage = S.stage; go(S.stage); };
    $("rs-edit").onclick = function () { $("resume").classList.add("hidden"); go("material"); toast("改一改材料；改完再做一次第一版"); };
    $("rs-later").onclick = function () { $("resume").classList.add("hidden"); p.paused = true; S.cur = -1; go("pick"); toast("先放下了，东西都还在星图里"); };
  }

  /* ========== AI 设置面板（#24：默认免费体验额度；「用自己的密钥」保留 v0.0.9 的直连） ========== */
  function chip() { $("ai-chip-t").textContent = AI.label(); }
  function bindCfg() {
    var sel = $("ai-preset");
    sel.innerHTML = Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '">' + esc(PRESETS[k].name) + "</option>"; }).join("");
    function fill() {
      var c = AI.cfg(), mo = AI.mode();
      $("ai-agent-help").classList.toggle("hidden", mo !== "agent");
      sel.value = c.preset || "deepseek"; $("ai-base").value = c.base; $("ai-model").value = c.model; $("ai-key").value = "";
      $("ai-key").placeholder = c.hasKey ? "已经存了一把密钥（不显示）。要换就重新填" : "粘贴你的密钥";
      $("ai-preset-note").textContent = (PRESETS[sel.value] || PRESETS.custom).note;
      $("ai-use-relay").disabled = !AI.relayOn() || mo === "relay";
      $("ai-relay-state").textContent = !AI.relayOn() ? "免费体验额度还没开通（中转服务还没部署），现在请先用自己的密钥。" : mo === "relay" ? " 正在用免费体验额度" + (AI.quotaLeft() !== null ? "，今天还剩 " + AI.quotaLeft() + " 次" : "") + "。" : mo === "direct" ? "现在用的是你自己的密钥。" : "";
    }
    openCfg = function (own) { $("ai-cfg").classList.remove("hidden"); fill(); if (own || !AI.relayOn() || AI.mode() === "direct") $("ai-own").open = true; try { $("ai-cfg").scrollIntoView({ behavior: smooth(), block: "start" }); } catch (e) {} };
    $("ai-chip").onclick = function () { if ($("ai-cfg").classList.contains("hidden")) openCfg(); else $("ai-cfg").classList.add("hidden"); };
    $("ai-cfg-close").onclick = function () { $("ai-cfg").classList.add("hidden"); };
    $("ai-use-relay").onclick = function () { AI.setMode("relay"); fill(); toast("改用免费体验额度"); };
    sel.onchange = function () { AI.setDirect({ preset: sel.value, base: "", model: "" }); fill(); };
    $("ai-save").onclick = function () {
      var k = $("ai-key").value.trim(), o = { preset: sel.value, base: $("ai-base").value.trim(), model: $("ai-model").value.trim() };
      var PRE = PRESETS[sel.value] || PRESETS.custom; if (o.base === PRE.base) o.base = ""; if (o.model === PRE.model) o.model = "";
      if (k) o.key = k;
      AI.setDirect(o);
      if (!AI.cfg().hasKey) { $("ai-test-out").textContent = "还没填密钥。"; return; }
      AI.setMode("direct"); fill(); $("ai-test-out").textContent = "存好了，现在用你自己的密钥。密钥只在这个浏览器里。"; toast("已保存");
    };
    $("ai-test").onclick = function () {
      if (!AI.cfg().hasKey) { $("ai-test-out").textContent = "先填密钥并点「保存」。"; return; }
      $("ai-test-out").textContent = "正在连…";
      AI.ping().then(function () { $("ai-test-out").textContent = " 连上了，能用。"; }, function (e) { $("ai-test-out").textContent = " " + e.message; });
    };
    $("ai-forget").onclick = function () { AI.forget(); if (AI.cfg().mode === "direct" && AI.relayOn()) AI.setMode("relay"); fill(); $("ai-test-out").textContent = "密钥已经从这个浏览器删掉了。" + (AI.relayOn() ? "现在改回免费体验额度。" : ""); toast("密钥已删除"); };
    saveForLater = function () { save(); };
    AI.onChange(chip); AI.onChange(function () { if (!$("ai-cfg").classList.contains("hidden")) fill(); });
    chip();
  }
  /* #21：本机小统计（分层看，不混用）。都只是这个浏览器里的次数 */
  renderMetrics = function () {
    var el = $("metrics-body"); if (!el) return; var m = METRICS;
    var rate = function (a, b) { return b ? Math.round(a / b * 100) + "%" : "—"; };
    el.innerHTML = '<table><tr><td>开局</td><td>' + m.started + '</td><td></td></tr><tr><td>登月（完成）</td><td>' + m.completed + "</td><td>完成率 " + rate(m.completed, m.started) + "</td></tr>" +
      "<tr><td>看到完成卡</td><td>" + m.card_seen + "</td><td></td></tr><tr><td>保存或分享（点击次数）</td><td>" + m.shared + "</td><td>保存/分享率 " + rate(m.shared, m.card_seen) + "</td></tr>" +
      "<tr><td>看到 star 入口</td><td>" + m.star_seen + "</td><td></td></tr><tr><td>点 star 入口（点击次数）</td><td>" + m.star_clicked + "</td><td>点击率 " + rate(m.star_clicked, m.star_seen) + "</td></tr></table>" +
      '<p class="hint">这些只是这台设备上的点击次数，不上传、不联网。点了 star 入口不等于 GitHub 上真的多了一颗 star：真实的 star 数以 GitHub 页面为准。</p>';
  };

  /* ========== 事件 ========== */
  function bind() {
    $("netnote").textContent = NET_NOTICE;
    $("foot").textContent = "另存人生 v" + VERSION + " 测试版 · 单个网页，不上传统计：只在这个浏览器里记几个本地次数（见下面「小统计」）。" + NET_NOTICE + "做出来的小网页联不联网，以它自己的检查结果为准（见「检查与修改」）。我们陪你借助 AI 做出东西，不承诺求职结果。";
    renderMetrics();
    document.querySelectorAll("[data-edit]").forEach(function (b) { b.onclick = function () { go(b.getAttribute("data-edit")); }; });
    $("match-close").onclick = closeMatch;
    $("bag-btn").onclick = function () { if ($("bag-panel").classList.contains("hidden")) openBag(); else closeBag(); };
    $("bag-close").onclick = closeBag;
    $("bag-panel").onclick = function (ev) { if (ev.target === this) closeBag(); };
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !$("bag-panel").classList.contains("hidden")) closeBag(); });
    renderBagBtn();
    $("btn-export").onclick = function () {
      var o = clone(S), files = {}; o.projects.forEach(function (p) { var m = imgsOf(p); if (Object.keys(m).length) files[p.id] = m; });
      download("另存人生进度_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ lingcun_save: VERSION, state: o, images: files }), "application/json");
    };
    $("restore-file").onchange = function () {
      var f = this.files && this.files[0]; if (!f) return; var fr = new FileReader();
      fr.onload = function () { try { var j = JSON.parse(fr.result); if (!j || !j.state || !j.state.projects) throw 0; S = merge(j.state); resetSigs(); renderBagBtn(); for (var id in (j.images || {})) try { localStorage.setItem(LS_FILES + id, JSON.stringify(j.images[id])); } catch (e) {} $("err-restore").textContent = ""; save(); render(); toast("已恢复"); } catch (e) { $("err-restore").textContent = "这个文件读不出来：要用「下载进度文件」存下的那个 .json。"; } };
      fr.readAsText(f);
    };
    $("btn-reset").onclick = function () {
      if (!window.confirm("确定清空这台设备上的进度吗？清空后找不回来。（API 密钥不会被清掉，要删请到右上角「忘掉密钥」）")) return;
      try { S.projects.forEach(function (p) { localStorage.removeItem(LS_FILES + p.id); }); localStorage.removeItem(LS_KEY); localStorage.removeItem(OLD_LS_KEY); } catch (e) {}
      S = blank(); resetSigs(); renderBagBtn(); $("resume").classList.add("hidden"); $("s-match").classList.add("hidden"); go("pick");
    };
    bindCfg();
  }

  /* ========== 启动 ========== */
  try { if ('scrollRestoration' in history) history.scrollRestoration = "manual"; } catch (e) {}
  var restored = load();
  bind();
  render();
  if (restored && curP() && !curP().paused) showResume();
  else if (restored && curP() && curP().paused) showResume();
  /* agent 入口：读待办任务、交回结果；timings 给人和 agent 看等待都花在哪 */
  window.lingcunAI = {
    version: VERSION,
    mode: function () { return AI.mode(); },
    setMode: function (m) { if (["agent", "direct"].indexOf(m) < 0 && !(m === "mock" && /[?&]ai=mock\b/.test(location.search))) return false; AI.setMode(m); return true; },
    enable: function () { AI.setMode("agent"); return AI.pending(); },
    disable: function () { AI.endAgent(); return true; },
    pending: function () { return AI.pending(); },
    submit: function (id, result) { return AI.submit(id, result); }
  };
  Object.defineProperty(window.lingcunAI, "metrics", { enumerable: true, get: function () { var o = { note: "只是这个浏览器里的点击次数，不是 GitHub 上的 star 数" }; METRIC_KEYS.forEach(function (k) { o[k] = METRICS[k]; }); return o; } });
  Object.defineProperty(window.lingcunAI, "timings", { enumerable: true, get: function () { return AI.timings.map(AI.publicTm); } });
  /* 测试用 */
  window.__lingcun = { state: function () { return S; }, ai: AI, CATS: CATS, matchCats: matchCats, judge: judgeMatch, sysPrompt: function (t) { return AI.sysPrompt(t); }, taskDraft: function () { return taskDraft(curP()); },
    taskRevise: function (req, part) { return taskRevise(curP(), req, part); }, render: function () { render(); }, setMockDelay: function (ms) { AI.setMockDelay(ms); }, renderOut: function () { var p = curP(); return p ? renderOut(p, true) : ""; }, ghLinks: ghLinks, openBag: function (i) { openBag(i); },
    routeIdea: routeIdea, factRule: function () { return factRule(curP()); }, landing: function () { return LANDING; }, cardCanvas: function () { return cardCanvas(curP()).toDataURL("image/png"); },
    replayLanding: function () { armLanding(true); }, excerpt: function () { return excerptOf(curP()); } };
})();
</script>
</body>
</html>
