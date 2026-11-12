/* 第九轮只评测。新账本 selftest/round9，上限 12。不改产品。
   预留：理解 1、返工 1、行动 1、顺句 1。确认、改口、选边不发请求。
   U04 要 6（第一句理解、改口后再理解、再行动和顺句）。
   U05 要 4。U02 要 4。U08 要 6。不够预留的不开始。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { execSync } = require("child_process");
process.env.AI_LEDGER_DIR = path.join(__dirname, "round9");
process.env.AI_BUDGET_CAP = "12";
fs.mkdirSync(process.env.AI_LEDGER_DIR, { recursive: true });
var { chromium } = require("playwright-core");
var budget = require("./ai-budget");
var rawFile = fs.readFileSync(path.join(__dirname, "round4_frozen.json"));
var hash = crypto.createHash("sha256").update(rawFile).digest("hex");
var expect = "8b8f5870996dbd2fc615d8f5597f49bec79fd170284ef1e797329ead49f290dc";
if (hash !== expect) throw new Error("frozen hash changed");
var frozen = JSON.parse(rawFile.toString());
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var commit = execSync("git rev-parse --short HEAD", { cwd: path.resolve(__dirname, "../..") }).toString().trim();
var outPath = path.join(__dirname, "holdout", "round9_live_" + commit + ".json");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });
var CAP = 12;
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }
function shot(p, name) { return p.screenshot({ path: path.join(__dirname, "holdout", name), fullPage: true }); }
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
    return {
      conflict: t("#v20-conflict"),
      bothHold: t("#v20-both-hold"),
      voice: t("#v20-voice-ask"),
      noAction: t("#v20-no-action"),
      ask: t("#v20-ask-advice"),
      mind: t("#v20-mind"),
      line: t("#try-line"),
      enough: t("#en-t"),
      basis: t("#try-basis"),
      stickers: Array.prototype.map.call(document.querySelectorAll(".sticker-label"), function (e) { return e.textContent; })
    };
  });
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
  await sleep(180);
  return { ctx: ctx, p: p, raw: raw };
}
async function enter(p, text) {
  if (await p.$("#pk-start")) await p.click("#pk-start");
  await sleep(60);
  if (await p.$("#pk-type")) await p.click("#pk-type");
  await sleep(40);
  await p.fill("#pk-idea", text);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
}
async function takeSticker(p, prefer) {
  var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); }).catch(function () { return []; });
  var label = "", i;
  for (i = 0; i < labels.length; i++) if (prefer && labels[i].indexOf(prefer) >= 0) { label = labels[i]; break; }
  if (!label) label = labels[0] || "";
  if (!label) return "";
  await p.click('.v19-sticker[data-label="' + label.replace(/"/g, "") + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(100);
  return label;
}
async function toDirection(p, raw) {
  var go = await p.$("#frag-go");
  var enabled = go ? await go.evaluate(function (e) { return !e.disabled; }) : false;
  if (!enabled) return { reached: false, reason: "下一步不可用" };
  if (used() > CAP - 2) return { reached: false, reason: "剩下的次数不够行动和顺句" };
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(80);
  await p.evaluate(function () { var b = document.querySelector('[data-dir="body"]'); if (b) b.click(); });
  await p.evaluate(function () { var b = document.querySelector("#dir-go"); if (b) b.click(); });
  await settle(raw, p);
  if (await p.$("#v20-keep-both")) await p.click("#v20-keep-both");
  if (await p.$("#v20-want-advice")) {
    await p.click("#v20-want-advice");
    await settle(raw, p);
  }
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  var enough = await p.$eval("#en-t", function (e) { return e.textContent; }).catch(function () { return ""; });
  return { reached: true, line: line, enough: enough };
}

async function run(b, item, opts) {
  var before = used();
  var opened = await openPage(b);
  var row = { id: item.id, input: item.input, rubric: item.rubric, before: before, mode: opts.mode || "" };
  try {
    await enter(opened.p, item.input);
    await settle(opened.raw, opened.p);
    row.material = await screen(opened.p);
    await shot(opened.p, "round9_" + item.id + "_material.png");
    if (opts.stop) {
      row.stoppedAt = "只看到理解";
    } else {
      if (opts.revise) {
        var btn = await opened.p.$("#frag-revise") || await opened.p.$("#frag-back");
        if (!btn) row.reviseMiss = "没有改这句";
        else {
          await btn.click();
          await sleep(150);
          var typeOn = await opened.p.$eval("#pk-type", function (e) { return e.offsetParent !== null; }).catch(function () { return false; });
          row.typeVisible = typeOn;
          if (!(await opened.p.$("#pk-idea"))) {
            if (await opened.p.$("#pk-type")) await opened.p.click("#pk-type");
          }
          await opened.p.fill("#pk-idea", opts.revise);
          await opened.p.evaluate(function () { document.querySelector("#pk-go").click(); });
          await settle(opened.raw, opened.p);
          row.second = await screen(opened.p);
          await shot(opened.p, "round9_" + item.id + "_second.png");
        }
      }
      if (opts.preferSide && await opened.p.$("[data-keep-side]")) {
        row.pickedSide = await opened.p.evaluate(function (word) {
          var buttons = document.querySelectorAll("[data-keep-side]");
          var i;
          for (i = 0; i < buttons.length; i++) {
            var host = buttons[i].parentNode;
            if (host && host.textContent.indexOf(word) >= 0) { buttons[i].click(); return host.textContent; }
          }
          return "";
        }, opts.preferSide);
        await sleep(150);
      } else if (await opened.p.$("#v20-keep-both")) {
        await opened.p.click("#v20-keep-both");
        row.keptBoth = true;
        await sleep(150);
      } else if (await opened.p.$("#v20-own-voice")) {
        await opened.p.click("#v20-own-voice");
        row.confirmed = true;
        await sleep(150);
      }
      if (!opts.stop) {
        row.took = await takeSticker(opened.p, opts.prefer || "");
        row.direction = await toDirection(opened.p, opened.raw);
        row.check = await screen(opened.p);
        await shot(opened.p, "round9_" + item.id + "_check.png");
        row.stoppedAt = row.direction && row.direction.reached ? "走到行动" : ((row.direction && row.direction.reason) || "没有走到行动");
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

(async function () {
  var doc = {
    commit: commit, hash: hash, cap: CAP,
    plan: "U04 预留 6，U05 预留 4，U02 预留 4，U08 预留 6。不够就不开始。",
    cases: []
  };
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var queue = [
    { id: "U04", need: 6, opts: { prefer: "信", preferSide: "信", revise: byId.U04.turns[0], mode: "revise" } },
    { id: "U05", need: 4, opts: { prefer: "小画", mode: "conflict" } },
    { id: "U02", need: 4, opts: { prefer: "我哥说", mode: "confirm" } },
    { id: "U08", need: 6, opts: { prefer: "花盆", mode: "direction" } }
  ];
  var i;
  for (i = 0; i < queue.length; i++) {
    var item = queue[i];
    if (CAP - used() < item.need) {
      doc.cases.push({ id: item.id, skipped: true, reason: "剩下 " + (CAP - used()) + " 次，不够预留的 " + item.need + " 次" });
      console.log(item.id, "skip", CAP - used(), "<", item.need);
      continue;
    }
    var row = await run(b, byId[item.id], item.opts);
    doc.cases.push(row);
    doc.used = used();
    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
    console.log(item.id, row.calls, "used", used(), row.stoppedAt || row.error || row.skipped);
  }
  await b.close();
  doc.used = used();
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log("LEDGER", used(), commit);
})().catch(function (e) { console.error(e); process.exit(1); });
