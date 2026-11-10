/* 冻结题走当前产品路径。真实中转。共享账本上限 20。不改题目，不重试刷通过。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { chromium } = require("playwright-core");
var budget = require("./ai-budget");
delete process.env.AI_LEDGER_DIR;
delete process.env.AI_BUDGET_CAP;

var frozenPath = path.join(__dirname, "round4_frozen.json");
var rawFile = fs.readFileSync(frozenPath);
var hash = crypto.createHash("sha256").update(rawFile).digest("hex");
var expect = fs.readFileSync(path.join(__dirname, "round4_frozen.sha256"), "utf8").trim();
if (hash !== expect) throw new Error("frozen hash changed");
var frozen = JSON.parse(rawFile.toString());
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var commit = "10fbca5";
var outPath = path.join(__dirname, "holdout", "round4_live_" + commit + ".json");
var order = (process.env.CASES || "U02,U03,U07,U04,U08,U01,U05,U06").split(",");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }

async function settle(raw) {
  var last = -1, stable = 0, i;
  for (i = 0; i < 50; i++) {
    await sleep(400);
    if (raw.length === last) stable++;
    else { stable = 0; last = raw.length; }
    if (raw.length > 0 && stable >= 4) return;
    if (used() >= 20 && stable >= 2) return;
  }
}

async function drive(p, text) {
  await p.click("#pk-start");
  await sleep(120);
  if (await p.locator("#pk-type").isVisible()) await p.click("#pk-type");
  await p.fill("#pk-idea", text);
  await p.click("#pk-go");
  await settle(p._raw);
  var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); }).catch(function () { return []; });
  var line = "";
  var goOff = true;
  if (labels[0]) {
    await p.$eval(".sticker-label", function (e) { e.scrollIntoView({ block: "center" }); });
    await p.click('.v19-sticker[data-label="' + labels[0].replace(/"/g, "") + '"] .sticker-btn', { force: true });
    await sleep(80);
    await p.click(".v19-act-take", { force: true });
    await sleep(80);
    var go = await p.$("#frag-go");
    goOff = go ? await go.evaluate(function (e) { return !!e.disabled; }) : true;
    if (go && !goOff) {
      await p.click("#frag-go");
      await sleep(100);
      await p.click('[data-dir="body"]');
      await p.click("#dir-go");
      await settle(p._raw);
      var el = await p.$("#try-line");
      line = el ? await el.textContent() : "";
    }
  }
  var view = await p.evaluate(function () {
    var api = window.__lingcun20 || {};
    return {
      record: api.record ? api.record() : null,
      late: api.late ? api.late() : [],
      hold: (document.querySelector("#v20-hold") || document.querySelector(".v20-mind") || {}).innerText || "",
      stickers: Array.prototype.map.call(document.querySelectorAll(".sticker-label"), function (e) { return e.textContent; })
    };
  });
  return { labels: labels, goOff: goOff, line: line, view: view };
}

async function runCase(b, item) {
  if (used() >= 20) return { id: item.id, skipped: true, reason: "账本已到 20" };
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  var raw = [];
  p._raw = raw;
  var before = used();
  await p.exposeFunction("__lingcunClaim", function (meta) {
    return budget.reserve({ route: meta && meta.route, kind: meta && meta.kind, channel: "page" });
  });
  await p.addInitScript(function () {
    window.__lingcunEval = true;
    window.__lingcunAiBudget = { claim: function (meta) { return window.__lingcunClaim(meta); } };
  });
  p.on("response", function (res) {
    if (res.url().indexOf("chat/completions") < 0) return;
    res.text().then(function (text) {
      raw.push({ status: res.status(), body: String(text).slice(0, 12000) });
      budget.note(used(), { status: "http", http: res.status(), ok: res.ok() });
    }).catch(function () {});
  });
  await p.route("**/*", function (route) {
    var u = route.request().url();
    if (/chat\/completions/.test(u)) return route.continue();
    if (/^https?:/i.test(u)) return route.abort();
    return route.continue();
  });
  var row = { id: item.id, title: item.title, input: item.input, rubric: item.rubric, before: before };
  try {
    await p.goto(URL);
    await p.evaluate(function () { localStorage.clear(); });
    await p.reload();
    await sleep(250);
    row.first = await drive(p, item.input);
    if (item.id === "U04") {
      await p.evaluate(function () { var b = document.querySelector("#menu-btn"); if (b) b.click(); var h = document.querySelector("#menu-home"); if (h) h.click(); });
      await sleep(300);
      if (await p.locator("#pk-start").isVisible()) {
        row.second = await drive(p, item.turns[0]);
      } else row.secondMiss = "没有回到能改原话的入口";
    }
    if (item.id === "U08" && row.first && row.first.line) {
      var oldLine = row.first.line;
      if (await p.locator("#try-no").isVisible()) {
        await p.click("#try-no"); await sleep(80);
        await p.click("#try-no"); await sleep(80);
        await p.click("#try-no"); await sleep(150);
        if (await p.locator('[data-dir="express"]').isVisible()) {
          await p.click('[data-dir="express"]');
          await p.click("#dir-go");
          await settle(raw);
          var el = await p.$("#try-line");
          row.afterDirection = el ? await el.textContent() : "";
          row.oldLineRemained = row.afterDirection === oldLine;
        }
      }
    }
  } catch (e) {
    row.error = String(e && e.message || e).slice(0, 500);
  }
  row.responses = raw;
  row.after = used();
  row.calls = row.after - before;
  await ctx.close();
  return row;
}

(async function () {
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var rows = [];
  var i;
  for (i = 0; i < order.length; i++) {
    if (used() >= 20) {
      rows.push({ id: order[i], skipped: true, reason: "账本已到 20" });
      continue;
    }
    var row = await runCase(b, byId[order[i]]);
    rows.push(row);
    fs.writeFileSync(outPath, JSON.stringify({ commit: commit, hash: hash, used: used(), cap: 20, cases: rows }, null, 2));
    console.log(row.id, "calls", row.calls, "used", used(), row.error || (row.first && row.first.line) || (row.first && row.first.goOff));
  }
  await b.close();
  console.log("LEDGER", used());
})().catch(function (e) { console.error(e); process.exit(1); });
