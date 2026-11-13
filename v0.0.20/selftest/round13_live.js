/* 第十三轮只评测。新账本 selftest/round13，上限 12。不改产品。
   预算按离线全程实测：U04 为 4（理解 2、关系 1、行动 1）。U05 为 2（理解 1、关系 1）。
   不够预留的不开始。在飞的理解、关系、行动都落地后才截图。还在飞就不往下点。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { execSync } = require("child_process");
process.env.AI_LEDGER_DIR = path.join(__dirname, "round13");
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
var outPath = path.join(__dirname, "holdout", "round13_live_" + commit + ".json");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });
var CAP = 12;
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }
function shot(p, name) { return p.screenshot({ path: path.join(__dirname, "holdout", name), fullPage: true }); }
function ledgerSince(before) {
  var rows = [];
  try {
    fs.readFileSync(path.join(process.env.AI_LEDGER_DIR, "ai-ledger.jsonl"), "utf8").split("\n").forEach(function (line) {
      if (!line) return;
      var row = JSON.parse(line);
      if (row.id > before) rows.push(row);
    });
  } catch (e) {}
  return rows;
}
function contentOf(body) {
  try { return JSON.parse(JSON.parse(body).choices[0].message.content); }
  catch (e) { return null; }
}
async function pageBusy(p) {
  return p.evaluate(function () {
    var mind = window.__lingcun20 && window.__lingcun20.mindState ? window.__lingcun20.mindState() : null;
    var line = document.querySelector("#try-line");
    var text = line ? line.textContent : "";
    return {
      reading: document.body.innerText.indexOf("结果还没回来") >= 0,
      relationPending: !!(mind && mind.relationPending),
      attemptPending: !!(mind && mind.attemptPending) || text.indexOf("正在请一个小动作") >= 0,
      relationFrom: mind ? mind.relationFrom || "" : ""
    };
  }).catch(function () { return { reading: false, relationPending: false, attemptPending: false, relationFrom: "" }; });
}
async function settle(raw, p) {
  var last = -1, stable = 0, i, state = {};
  for (i = 0; i < 400; i++) {
    await sleep(400);
    state = await pageBusy(p);
    var busy = state.reading || state.relationPending || state.attemptPending;
    if (raw.length === last && !busy) stable++;
    else { stable = 0; last = raw.length; }
    if (raw.length > 0 && stable >= 3 && !busy) return { busy: false, state: state };
    if (used() >= CAP && stable >= 3 && !busy) return { busy: false, state: state };
  }
  state = await pageBusy(p);
  return { busy: !!(state.reading || state.relationPending || state.attemptPending), state: state };
}
async function screen(p) {
  return p.evaluate(function () {
    function t(id) { var e = document.querySelector(id); return e ? e.textContent : ""; }
    var mind = window.__lingcun20 && window.__lingcun20.mindState ? window.__lingcun20.mindState() : null;
    return {
      conflict: t("#v20-conflict"),
      bothHold: t("#v20-both-hold"),
      relation: t("#v20-relation-ask"),
      voice: t("#v20-voice-ask"),
      noAction: t("#v20-no-action"),
      ask: t("#v20-ask-advice"),
      hint: t("#premise-hint"),
      debug: t("#premise-debug"),
      mind: t("#v20-mind"),
      line: t("#try-line"),
      enough: t("#en-t"),
      basis: t("#try-basis"),
      stickers: Array.prototype.map.call(document.querySelectorAll(".sticker-label"), function (e) { return e.textContent; }),
      relations: mind ? mind.relations : [],
      relationFrom: mind ? mind.relationFrom : "",
      advice: mind ? mind.advice : "",
      readings: mind ? mind.readings : []
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
  if (CAP - used() < 1) return { reached: false, reason: "没有剩下的次数" };
  var beforeGo = await pageBusy(p);
  if (beforeGo.reading || beforeGo.relationPending) return { reached: false, reason: "理解或关系还在飞" };
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(80);
  await p.evaluate(function () { var b = document.querySelector('[data-dir="body"]'); if (b) b.click(); });
  await p.evaluate(function () { var b = document.querySelector("#dir-go"); if (b) b.click(); });
  var waited = await settle(raw, p);
  if (waited.busy) return { reached: false, reason: "行动请求还在飞", line: "", enough: "" };
  if (await p.$("#v20-want-advice")) {
    await p.click("#v20-want-advice");
    waited = await settle(raw, p);
    if (waited.busy) return { reached: false, reason: "建议之后的请求还在飞" };
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
    var firstWait = await settle(opened.raw, opened.p);
    row.materialWait = firstWait;
    if (!firstWait.busy) {
      row.material = await screen(opened.p);
      await shot(opened.p, "round13_" + item.id + "_material.png");
    }
    if (firstWait.busy) {
      row.stoppedAt = "理解还在飞，没有往下点";
    } else if (opts.revise) {
      var btn = await opened.p.$("#frag-revise") || await opened.p.$("#frag-back");
      if (!btn) row.reviseMiss = "没有改这句";
      else {
        await btn.click();
        await sleep(150);
        if (!(await opened.p.$("#pk-idea"))) {
          if (await opened.p.$("#pk-type")) await opened.p.click("#pk-type");
        }
        await opened.p.fill("#pk-idea", opts.revise);
        await opened.p.evaluate(function () { document.querySelector("#pk-go").click(); });
        var secondWait = await settle(opened.raw, opened.p);
        row.secondWait = secondWait;
        if (secondWait.busy) row.stoppedAt = "改口后的理解或关系还在飞，没有往下点";
        else {
          row.second = await screen(opened.p);
          await shot(opened.p, "round13_" + item.id + "_second.png");
        }
      }
    }
    if (!row.stoppedAt && (await opened.p.$("#v20-conflict") || await opened.p.$("#v20-relation-ask") || await opened.p.$("#v20-no-action"))) {
      row.stoppedAt = "停在先问或不给做法";
      row.check = await screen(opened.p);
      await shot(opened.p, "round13_" + item.id + "_check.png");
    } else if (!row.stoppedAt) {
      if (await opened.p.$("#v20-own-voice")) {
        await opened.p.click("#v20-own-voice");
        row.confirmed = true;
        await sleep(150);
      }
      row.took = await takeSticker(opened.p, opts.prefer || "");
      row.direction = await toDirection(opened.p, opened.raw);
      if (row.direction && row.direction.reached) {
        row.check = await screen(opened.p);
        await shot(opened.p, "round13_" + item.id + "_check.png");
        row.stoppedAt = "走到行动";
      } else row.stoppedAt = (row.direction && row.direction.reason) || "没有走到行动";
    }
  } catch (e) {
    row.error = String(e && e.message || e).slice(0, 400);
  }
  await sleep(300);
  var kinds = ledgerSince(before);
  row.ledger = kinds.map(function (x) { return { id: x.id, kind: x.kind, t: x.t }; });
  row.responses = opened.raw.map(function (r, i) {
    return { status: r.status, kind: kinds[i] ? kinds[i].kind : "", body: r.body };
  });
  row.relationReturns = row.responses.filter(function (r) { return r.kind === "v20_relation"; }).map(function (r) { return contentOf(r.body); });
  row.after = used();
  row.calls = row.after - before;
  await opened.ctx.close();
  return row;
}

(async function () {
  var doc = {
    commit: commit, hash: hash, cap: CAP,
    plan: "离线全程实测 U04 发送 4 次，U05 发送 2 次。不够就不开始。在飞请求落地后才截图。",
    cases: []
  };
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var queue = [
    { id: "U04", need: 4, opts: { prefer: "信", revise: byId.U04.turns[0], mode: "revise" } },
    { id: "U05", need: 2, opts: { prefer: "小画", mode: "conflict" } }
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
    console.log(item.id, row.calls, "used", used(), row.stoppedAt || row.error || "", "relation", (row.relationReturns || []).length);
  }
  await b.close();
  doc.used = used();
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log("LEDGER", used(), commit);
})().catch(function (e) { console.error(e); process.exit(1); });
