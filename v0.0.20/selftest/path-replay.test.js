/* 用第十一、十二轮已记下的模型返回，离线走完 U04、U05 的页面路径。关系小步用仿真返回。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var frozen = JSON.parse(fs.readFileSync(path.join(__dirname, "round4_frozen.json"), "utf8"));
var round11 = JSON.parse(fs.readFileSync(path.join(__dirname, "holdout/round11_live_a9d63d8.json"), "utf8"));
var round12 = JSON.parse(fs.readFileSync(path.join(__dirname, "holdout/round12_live_0461f33.json"), "utf8"));
var n = 0, fail = 0, net = [];
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function byId(doc, id) { return doc.cases.filter(function (c) { return c.id === id && !c.skipped; })[0]; }
function content(row) {
  try { return JSON.parse(JSON.parse(row.body).choices[0].message.content); }
  catch (e) { return null; }
}
function caseOf(id) { return frozen.cases.filter(function (c) { return c.id === id; })[0]; }
(async function () {
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var ctx0 = await b.newContext();
  var probe = await ctx0.newPage();
  await probe.route("**/*", function (route) {
    if (/^https?:/i.test(route.request().url())) { net.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await probe.goto(URL);
  var u04 = caseOf("U04");
  var u05 = caseOf("U05");
  var first = u04.input;
  var second = u04.turns[0];
  var recorded = [];
  [round11, round12].forEach(function (doc, di) {
    var name = di === 0 ? "round11" : "round12";
    (doc.cases || []).forEach(function (c) {
      if (c.skipped) return;
      (c.responses || []).forEach(function (row, i) {
        var parsed = content(row);
        if (!parsed || !parsed.facts) return;
        var blob = parsed.facts.map(function (f) { return f.text || ""; }).join("");
        var source = blob.indexOf("信") >= 0 || blob.indexOf("杂志先别动") >= 0 ? second : (blob.indexOf("小画") >= 0 ? u05.input : first);
        recorded.push({ from: name, id: c.id, i: i, source: source, out: parsed });
      });
    });
  });
  var checks = await probe.evaluate(function (rows) {
    return rows.map(function (row) {
      return { from: row.from, id: row.id, i: row.i, errors: window.__lingcun20.checkUnderstand(row.source, JSON.parse(JSON.stringify(row.out))) };
    });
  }, recorded);
  checks.forEach(function (row) {
    ok(row.from + " " + row.id + " #" + row.i + " 对得上原文才收下", row.errors.length === 0, JSON.stringify(row.errors));
  });
  await ctx0.close();

  function attemptsFrom(doc, id) {
    var found = null;
    (byId(doc, id).responses || []).forEach(function (row) {
      var parsed = content(row);
      if (parsed && parsed.attempts) found = parsed;
    });
    return found;
  }
  async function play(label, input, turns, sim, attempts) {
    var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    var p = await ctx.newPage();
    await p.route("**/*", function (route) {
      if (/^https?:/i.test(route.request().url())) { net.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await p.goto(URL);
    await p.evaluate(function () { localStorage.clear(); });
    await p.reload();
    await sleep(80);
    var queue = recorded.filter(function (row) { return row.source === input || turns.indexOf(row.source) >= 0; }).map(function (row) { return row.out; });
    await p.evaluate(function (pack) {
      window.__log = [];
      window.__seen = {};
      window.__lingcun20.armTransport(function (task, resolve) {
        var src = (task.inputs && (task.inputs.user_text || task.inputs.userText)) || "";
        if (!src && task.inputs && task.inputs.pairs) src = "relation";
        var key = task.type + ":" + src;
        window.__seen[key] = (window.__seen[key] || 0) + 1;
        window.__log.push(task.type);
        if (task.type === "v20_understand") {
          var text = task.inputs && task.inputs.user_text;
          var next = null;
          for (var i = 0; i < pack.queue.length; i++) {
            var facts = pack.queue[i].facts || [];
            var hit = facts.some(function (f) { return text && f.text && text.indexOf(f.text) >= 0; });
            if (hit) { next = pack.queue.splice(i, 1)[0]; break; }
          }
          resolve(next);
        } else if (task.type === "v20_relation") {
          var pairs = (task.inputs && task.inputs.pairs) || [];
          resolve({ pairs: pairs.map(function (pair) { return { a: pair.a, b: pair.b, replaces: pack.sim.replaces, both_ok: pack.sim.both_ok, why: pack.sim.why }; }) });
        } else if (task.type === "v20_attempts") resolve(pack.attempts);
        else resolve(null);
      });
    }, { queue: queue, sim: sim, attempts: attempts });
    async function submit(text) {
      if (await p.$("#pk-start")) await p.click("#pk-start");
      await sleep(40);
      var visible = await p.$eval("#pk-idea", function (e) { return e.offsetParent !== null; }).catch(function () { return false; });
      if (!visible && await p.$("#pk-type")) await p.click("#pk-type");
      await sleep(40);
      await p.fill("#pk-idea", text);
      await p.evaluate(function () { document.querySelector("#pk-go").click(); });
      await sleep(400);
    }
    await submit(input);
    var ti;
    for (ti = 0; ti < turns.length; ti++) {
      var btn = await p.$("#frag-revise") || await p.$("#frag-back");
      if (btn) await btn.click();
      await sleep(120);
      await submit(turns[ti]);
    }
    var screen = await p.evaluate(function () {
      function t(id) { var e = document.querySelector(id); return e ? e.textContent : ""; }
      var mind = window.__lingcun20.mindState();
      return {
        log: window.__log,
        seen: window.__seen,
        conflict: t("#v20-conflict"),
        withdrawn: (document.querySelector('#v20-mind [data-voice="withdrawn"]') || {}).textContent || "",
        mind: t("#v20-mind"),
        relationFrom: mind ? mind.relationFrom : "",
        relations: mind ? mind.relations : []
      };
    });
    if (!screen.conflict) {
      var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); }).catch(function () { return []; });
      var sticker = labels.filter(function (t) { return t.indexOf("信") >= 0 || t.indexOf("小画") >= 0; })[0] || labels[0] || "";
      if (sticker) {
        await p.click('.v19-sticker[data-label="' + sticker.replace(/"/g, "") + '"] .sticker-btn', { force: true });
        await p.click(".v19-act-take", { force: true });
        await sleep(80);
      }
      await p.evaluate(function () { var b = document.querySelector("#frag-go"); if (b && !b.disabled) b.click(); });
      await sleep(80);
      await p.evaluate(function () { var b = document.querySelector('[data-dir="body"]'); if (b) b.click(); });
      await p.evaluate(function () { var b = document.querySelector("#dir-go"); if (b) b.click(); });
      await sleep(200);
      if (await p.$("#v20-want-advice")) { await p.click("#v20-want-advice"); await sleep(200); }
    }
    var end = await p.evaluate(function () {
      function t(id) { var e = document.querySelector(id); return e ? e.textContent : ""; }
      var mind = window.__lingcun20.mindState();
      var counts = {};
      window.__log.forEach(function (type) { counts[type] = (counts[type] || 0) + 1; });
      var over = false;
      Object.keys(window.__seen).forEach(function (key) { if (window.__seen[key] > 2) over = true; });
      return {
        counts: counts,
        over: over,
        seen: window.__seen,
        line: t("#try-line"),
        conflict: t("#v20-conflict"),
        hint: t("#premise-hint"),
        debug: t("#premise-debug"),
        mind: t("#v20-mind"),
        relationFrom: mind ? mind.relationFrom : "",
        relations: mind ? mind.relations : []
      };
    });
    console.log("BUDGET", label, JSON.stringify(end.counts));
    ok(label + " 同一段理解不超过一次返工", end.over === false, JSON.stringify(end.seen));
    ok(label + " 关系小步发出一次", end.counts.v20_relation === 1, JSON.stringify(end.counts));
    ok(label + " 没有调试说明", (end.hint + end.mind + end.line).indexOf("程序") < 0 && end.debug === "");
    await ctx.close();
    return end;
  }
  var u04end = await play("U04", first, [second], { replaces: true, both_ok: false, why: "后一句收回前一句，前一句不再做。" }, attemptsFrom(round11, "U04"));
  ok("U04 标出撤回", (u04end.mind || "").indexOf("已撤回") >= 0, u04end.mind);
  ok("U04 核对页是写信的动作", (u04end.line || "").indexOf("信") >= 0 && (u04end.line || "").indexOf("杂志清") < 0, u04end.line);
  var u05end = await play("U05", u05.input, [], { replaces: false, both_ok: false, why: "两件都还成立，但不能一起做。" }, attemptsFrom(round11, "U05"));
  ok("U05 先问选边", (u05end.conflict || "").indexOf("不能只留一边") >= 0, u05end.conflict || u05end.mind);
  ok("U05 还没生成寄出的尝试", (u05end.counts.v20_attempts || 0) === 0, JSON.stringify(u05end.counts));
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
