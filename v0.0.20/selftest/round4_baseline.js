/* 在冻结提交 5fc1df4 的页面上走产品路径。断网。不调用模型。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { execFileSync } = require("child_process");
var { chromium } = require("playwright-core");

var frozenPath = path.join(__dirname, "round4_frozen.json");
var frozen = JSON.parse(fs.readFileSync(frozenPath, "utf8"));
var hash = crypto.createHash("sha256").update(fs.readFileSync(frozenPath)).digest("hex");
var expect = fs.readFileSync(path.join(__dirname, "round4_frozen.sha256"), "utf8").trim();
if (hash !== expect) throw new Error("frozen hash mismatch");

var html = execFileSync("git", ["show", "5fc1df4:v0.0.20/page/index.html"], { cwd: path.join(__dirname, "..", ".."), encoding: "utf8" });
var pagePath = "/tmp/lingcun-5fc1df4.html";
fs.writeFileSync(pagePath, html);
var URL = "file://" + pagePath;
var NET = [];

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function open(b) {
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  await p.route("**/*", function (route) {
    var u = route.request().url();
    if (/^https?:/i.test(u)) { NET.push(u); return route.abort(); }
    return route.continue();
  });
  await p.goto(URL);
  await p.evaluate(function () { localStorage.clear(); });
  await p.reload();
  await sleep(200);
  return p;
}

async function readLine(p) {
  var el = await p.$("#try-line");
  if (!el) return "";
  return el.textContent();
}

async function runCase(b, item) {
  var p = await open(b);
  var out = { id: item.id, input: item.input, blocked: "", line: "", second: "", liveAi: null, paceNote: "" };
  try {
    out.liveAi = await p.evaluate(function () { return window.__lingcun20 && window.__lingcun20.liveAi ? window.__lingcun20.liveAi() : null; });
    await p.click("#pk-start");
    await sleep(100);
    await p.click("#pk-type");
    await p.fill("#pk-idea", item.input);
    await p.click("#pk-go");
    await sleep(250);
    var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); }).catch(function () { return []; });
    out.stickers = labels;
    if (labels[0]) {
      await p.click('.v19-sticker[data-label="' + labels[0].replace(/"/g, "") + '"] .sticker-btn', { force: true });
      await p.click(".v19-act-take");
      await sleep(80);
    }
    var go = await p.$("#frag-go");
    var disabled = go ? await go.evaluate(function (e) { return !!e.disabled; }) : true;
    out.paceNote = !go ? "没有下一步" : (disabled ? "下一步仍不可用" : "可以进入方向");
    if (go && !disabled) {
      await p.click("#frag-go");
      await sleep(100);
      await p.click('[data-dir="body"]');
      await p.click("#dir-go");
      await sleep(200);
      out.line = await readLine(p);
    }
    if (item.turns && item.turns[0] && item.id === "U04") {
      await p.evaluate(function () { document.querySelector("#menu-btn").click(); document.querySelector("#menu-home").click(); });
      await sleep(200);
      await p.click("#pk-start");
      await sleep(100);
      await p.click("#pk-type");
      await p.fill("#pk-idea", item.turns[0]);
      await p.click("#pk-go");
      await sleep(200);
      var label2 = await p.$eval(".sticker-label", function (e) { return e.textContent; }).catch(function () { return ""; });
      if (label2) {
        await p.click('.v19-sticker[data-label="' + label2.replace(/"/g, "") + '"] .sticker-btn', { force: true });
        await p.click(".v19-act-take");
        await p.click("#frag-go");
        await sleep(80);
        await p.click('[data-dir="body"]');
        await p.click("#dir-go");
        await sleep(200);
        out.second = await readLine(p);
      }
    }
    if (out.liveAi === false) out.blocked = "产品 LIVE_AI 为 false，理解到行动没有进入模型。下面的句子是离线整理，不是语义评测。";
  } catch (e) {
    out.error = String(e && e.message || e);
  }
  await p.context().close();
  return out;
}

(async function () {
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var rows = [];
  for (var i = 0; i < frozen.cases.length; i++) rows.push(await runCase(b, frozen.cases[i]));
  await b.close();
  var doc = {
    commit: "5fc1df4a899f2e838a35444a8150faa32ba1ab99",
    hash: hash,
    realAttempts: 0,
    net: NET.slice(),
    note: "同一开发者执行。产品开关阻止了语义评测，没有用裸模型补结果。",
    cases: rows
  };
  fs.writeFileSync(path.join(__dirname, "holdout", "round4_baseline_5fc1df4.json"), JSON.stringify(doc, null, 2));
  console.log(JSON.stringify({ n: rows.length, net: NET.length, live: rows.map(function (r) { return r.id + ":" + r.liveAi + ":" + (r.line || r.paceNote || r.error || ""); }) }, null, 2));
  if (NET.length) process.exit(1);
})().catch(function (e) { console.error(e); process.exit(1); });
