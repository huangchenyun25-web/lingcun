/* 第七轮只评测，不改产品。新账本 selftest/round7，上限 12。
   预留：理解 1、返工 1、行动 1、顺句 1。确认点击本身不发请求。
   U03 确认路径 4。没有确认按钮且剩下不少于 4，才改走 U02。
   U01 要 4，U04 要 6，U05 要 4，U06 要 4，U08 要 6，U07 要 2。
   剩下的次数不够该题的预留，就整题不开始。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { execSync } = require("child_process");
process.env.AI_LEDGER_DIR = path.join(__dirname, "round7");
process.env.AI_BUDGET_CAP = "12";
fs.mkdirSync(process.env.AI_LEDGER_DIR, { recursive: true });
var { chromium } = require("playwright-core");
var budget = require("./ai-budget");
var frozenPath = path.join(__dirname, "round4_frozen.json");
var rawFile = fs.readFileSync(frozenPath);
var hash = crypto.createHash("sha256").update(rawFile).digest("hex");
var expect = fs.readFileSync(path.join(__dirname, "round4_frozen.sha256"), "utf8").trim();
if (hash !== expect || hash !== "8b8f5870996dbd2fc615d8f5597f49bec79fd170284ef1e797329ead49f290dc") throw new Error("frozen hash changed");
var frozen = JSON.parse(rawFile.toString());
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var commit = execSync("git rev-parse --short HEAD", { cwd: path.resolve(__dirname, "../..") }).toString().trim();
var outPath = path.join(__dirname, "holdout", "round7_live_" + commit + ".json");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });
var CAP = 12;
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }
function shot(p, name) {
  return p.screenshot({ path: path.join(__dirname, "holdout", name), fullPage: true });
}
async function settle(raw, p) {
  var last = -1, stable = 0, i;
  for (i = 0; i < 70; i++) {
    await sleep(400);
    var pending = false;
    try { pending = await p.evaluate(function () { return document.body.innerText.indexOf("结果还没回来") >= 0; }); } catch (e) {}
    if (raw.length === last && !pending) stable++;
    else { stable = 0; last = raw.length; }
    if (raw.length > 0 && stable >= 3 && !pending) return;
    if (used() >= CAP && stable >= 2) return;
  }
}
async function screen(p) {
  return p.evaluate(function () {
    function t(id) { var e = document.querySelector(id); return e ? e.textContent : ""; }
    var go = document.querySelector("#frag-go");
    var buckets = {};
    document.querySelectorAll("#v20-mind p[data-voice]").forEach(function (el) {
      var ul = el.nextElementSibling;
      buckets[el.getAttribute("data-voice")] = ul ? ul.innerText : "";
    });
    return {
      noAction: t("#v20-no-action"),
      voice: t("#v20-voice-ask"),
      ask: t("#v20-ask-advice"),
      own: !!document.querySelector("#v20-own-voice"),
      want: !!document.querySelector("#v20-want-advice"),
      mind: t("#v20-mind"),
      buckets: buckets,
      line: t("#try-line"),
      basis: t("#try-basis"),
      goDisabled: go ? !!go.disabled : null,
      stickers: Array.prototype.map.call(document.querySelectorAll(".sticker-label"), function (e) { return e.textContent; }),
      bodyHasAttempt: document.body.innerText.indexOf("带走的是你的") >= 0 || document.body.innerText.indexOf("你确认过的") >= 0
    };
  });
}
async function enter(p, text) {
  if (await p.$("#pk-start")) await p.click("#pk-start");
  await sleep(60);
  if (await p.$("#pk-type")) await p.click("#pk-type");
  await p.fill("#pk-idea", text);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
}
async function goHome(p) {
  await p.evaluate(function () {
    var b = document.querySelector("#menu-btn");
    if (b) b.click();
    var h = document.querySelector("#menu-home");
    if (h) h.click();
  });
  await sleep(250);
}
async function takeSticker(p, prefer) {
  var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); }).catch(function () { return []; });
  var label = "";
  var i;
  for (i = 0; i < labels.length; i++) if (prefer && labels[i].indexOf(prefer) >= 0) { label = labels[i]; break; }
  if (!label) label = labels[0] || "";
  if (!label) return "";
  await p.click('.v19-sticker[data-label="' + label.replace(/"/g, "") + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(120);
  return label;
}
async function openPage(b) {
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  var raw = [];
  await p.exposeFunction("__lingcunClaim", function (meta) {
    if (budget.snapshot().used >= CAP) return { ok: false, reason: "cap" };
    return budget.reserve({ route: meta && meta.route, kind: meta && meta.kind, channel: "page" });
  });
  await p.addInitScript(function () {
    window.__lingcunEval = true;
    window.__lingcunAiBudget = { claim: function (meta) { return window.__lingcunClaim(meta); } };
  });
  p.on("response", function (res) {
    if (res.url().indexOf("chat/completions") < 0) return;
    res.text().then(function (text) { raw.push({ status: res.status(), body: String(text).slice(0, 12000) }); }).catch(function () {});
  });
  await p.route("**/*", function (route) {
    var u = route.request().url();
    if (/chat\/completions/.test(u)) return route.continue();
    if (/^https?:/i.test(u)) return route.abort();
    return route.continue();
  });
  await p.goto(URL);
  await p.evaluate(function () { localStorage.clear(); });
  await p.reload();
  await sleep(200);
  return { ctx: ctx, p: p, raw: raw };
}
async function toDirection(p, raw) {
  var go = await p.$("#frag-go");
  var enabled = go ? await go.evaluate(function (e) { return !e.disabled; }) : false;
  if (!enabled) return { reached: false, reason: "下一步不可用" };
  if (used() > CAP - 2) return { reached: false, reason: "剩下的次数不够行动和顺句" };
  await p.click("#frag-go");
  await sleep(80);
  await p.click('[data-dir="body"]');
  await p.click("#dir-go");
  var immediate = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  await settle(raw, p);
  if (await p.$("#v20-want-advice")) {
    if (used() > CAP - 1) return { reached: true, immediate: immediate, line: await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; }), opted: false, reason: "还差一次才能点我想听听建议" };
    await p.click("#v20-want-advice");
    await settle(raw, p);
  }
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  return { reached: true, immediate: immediate, line: line, opted: true };
}

async function runConfirm(b, item, prefer) {
  var before = used();
  var opened = await openPage(b);
  var row = { id: item.id, mode: "confirm", input: item.input, rubric: item.rubric, before: before };
  try {
    await enter(opened.p, item.input);
    await settle(opened.raw, opened.p);
    row.material = await screen(opened.p);
    await shot(opened.p, "round7_" + item.id + "_material.png");
    if (!(await opened.p.$("#v20-own-voice"))) {
      row.stoppedAt = "没有出现确认按钮";
    } else {
      await opened.p.click("#v20-own-voice");
      await sleep(200);
      row.took = await takeSticker(opened.p, prefer);
      row.direction = await toDirection(opened.p, opened.raw);
      row.check = await screen(opened.p);
      await shot(opened.p, "round7_" + item.id + "_check.png");
      row.stoppedAt = row.direction && row.direction.reached ? "确认后看到尝试句" : (row.direction && row.direction.reason) || "确认后没有进入方向";
    }
  } catch (e) {
    row.error = String(e && e.message || e).slice(0, 400);
  }
  row.responses = opened.raw;
  row.after = used();
  row.calls = row.after - before;
  await opened.ctx.close();
  return row;
}

async function runAction(b, item, opts) {
  opts = opts || {};
  var before = used();
  var opened = await openPage(b);
  var row = { id: item.id, mode: opts.mode || "action", input: item.input, rubric: item.rubric, before: before };
  try {
    await enter(opened.p, item.input);
    await settle(opened.raw, opened.p);
    row.material = await screen(opened.p);
    await shot(opened.p, "round7_" + item.id + "_material.png");
    if (opts.stopAtUnderstand) {
      row.stoppedAt = "只做到理解";
    } else {
      if (opts.second) {
        await goHome(opened.p);
        await enter(opened.p, opts.second);
        await settle(opened.raw, opened.p);
        row.secondMaterial = await screen(opened.p);
        await shot(opened.p, "round7_" + item.id + "_second.png");
      }
      if (await opened.p.$("#v20-own-voice")) {
        await opened.p.click("#v20-own-voice");
        await sleep(150);
        row.confirmed = true;
      }
      if (opts.allowAdvice && await opened.p.$("#v20-want-advice") && !(await opened.p.$("#v20-no-action"))) {
        await opened.p.click("#v20-want-advice");
        await sleep(150);
      }
      row.took = await takeSticker(opened.p, opts.prefer || "");
      if (opts.allowAdvice && await opened.p.$("#v20-want-advice")) {
        await opened.p.click("#v20-want-advice");
        await sleep(150);
      }
      row.direction = await toDirection(opened.p, opened.raw);
      row.check = await screen(opened.p);
      await shot(opened.p, "round7_" + item.id + "_check.png");
      row.stoppedAt = row.direction && row.direction.reached ? "走到行动" : (row.direction && row.direction.reason) || "没有走到行动";
      if (opts.changeDirection && row.direction && row.direction.reached && used() <= CAP - 2) {
        var oldLine = row.direction.line || "";
        if (await opened.p.$("#try-no")) {
          await opened.p.click("#try-no");
          await sleep(80);
          if (await opened.p.$("#try-no")) await opened.p.click("#try-no");
          await sleep(200);
        }
        if (await opened.p.$('[data-dir="express"]')) {
          await opened.p.click('[data-dir="express"]');
          await opened.p.click("#dir-go");
          await settle(opened.raw, opened.p);
          row.afterDirection = await opened.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
          row.oldLineRemained = row.afterDirection === oldLine;
          await shot(opened.p, "round7_" + item.id + "_redirect.png");
        }
      }
    }
  } catch (e) {
    row.error = String(e && e.message || e).slice(0, 400);
  }
  row.responses = opened.raw;
  row.after = used();
  row.calls = row.after - before;
  await opened.ctx.close();
  return row;
}

function save(doc) {
  doc.used = used();
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
}

(async function () {
  var doc = {
    commit: commit,
    hash: hash,
    cap: CAP,
    plan: "U03 确认 4；不够确认按钮则 U02 确认 4。其后 U01 要 4，U04 要 6，U05 要 4，U06 要 4，U08 要 6，U07 要 2。不够预留的题不开始。",
    cases: []
  };
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var u03 = await runConfirm(b, byId.U03, "磁带");
  doc.cases.push(u03);
  save(doc);
  console.log("U03", u03.calls, "used", used(), u03.stoppedAt || u03.error);
  if (u03.stoppedAt === "没有出现确认按钮" && CAP - used() >= 4) {
    var u02 = await runConfirm(b, byId.U02, "我哥说");
    doc.cases.push(u02);
    save(doc);
    console.log("U02", u02.calls, "used", used(), u02.stoppedAt || u02.error);
  } else if (u03.stoppedAt === "没有出现确认按钮") {
    doc.cases.push({ id: "U02", skipped: true, reason: "U03 没有确认按钮，剩下的次数也不够再走 U02" });
  }
  var queue = [
    { id: "U01", need: 4, opts: { prefer: "相册", allowAdvice: true } },
    { id: "U04", need: 6, opts: { prefer: "信", allowAdvice: true, second: byId.U04.turns[0], mode: "revise-then-action" } },
    { id: "U05", need: 4, opts: { prefer: "小画", allowAdvice: true } },
    { id: "U06", need: 4, opts: { prefer: "雨声", allowAdvice: true } },
    { id: "U08", need: 6, opts: { prefer: "花盆", allowAdvice: true, changeDirection: true } },
    { id: "U07", need: 2, opts: { stopAtUnderstand: true, allowAdvice: false } }
  ];
  var i;
  for (i = 0; i < queue.length; i++) {
    var item = queue[i];
    if (CAP - used() < item.need) {
      doc.cases.push({ id: item.id, skipped: true, reason: "剩下 " + (CAP - used()) + " 次，不够这一题预留的 " + item.need + " 次" });
      console.log(item.id, "skip", CAP - used(), "<", item.need);
      continue;
    }
    var row = await runAction(b, byId[item.id], item.opts);
    doc.cases.push(row);
    save(doc);
    console.log(item.id, row.calls, "used", used(), row.stoppedAt || row.error);
  }
  await b.close();
  save(doc);
  console.log("LEDGER", used(), commit);
})().catch(function (e) { console.error(e); process.exit(1); });
