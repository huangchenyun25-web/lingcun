/* 只复测 U02、U03、U07。新账本，上限 12。不改题目，不改产品。
   预算：U07 理解 1 次，格式不对最多再 1 次，decline 后不再要行动和顺句。
   U02、U03 各是理解 1–2 次；若模型仍给出做法，再加行动 1 次和顺句 1 次。
   上限 2+5+5=12。先跑 U07 和 U02。若 U02 之后已用超过 7 次，就不再开 U03，以免半截停住。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
process.env.AI_LEDGER_DIR = path.join(__dirname, "round5");
process.env.AI_BUDGET_CAP = "12";
fs.mkdirSync(process.env.AI_LEDGER_DIR, { recursive: true });
var { chromium } = require("playwright-core");
var budget = require("./ai-budget");
var frozenPath = path.join(__dirname, "round4_frozen.json");
var rawFile = fs.readFileSync(frozenPath);
var hash = crypto.createHash("sha256").update(rawFile).digest("hex");
var expect = fs.readFileSync(path.join(__dirname, "round4_frozen.sha256"), "utf8").trim();
if (hash !== expect) throw new Error("frozen hash changed");
var frozen = JSON.parse(rawFile.toString());
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var commit = "8adbfe6";
var outPath = path.join(__dirname, "holdout", "round5_live_" + commit + ".json");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }
async function settle(raw) {
  var last = -1, stable = 0, i;
  for (i = 0; i < 40; i++) {
    await sleep(400);
    if (raw.length === last) stable++;
    else { stable = 0; last = raw.length; }
    if (raw.length > 0 && stable >= 4) return;
    if (used() >= 12 && stable >= 2) return;
  }
}
async function runCase(b, item) {
  var before = used();
  if (before >= 12) return { id: item.id, skipped: true, reason: "账本已到 12" };
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  var raw = [];
  await p.exposeFunction("__lingcunClaim", function (meta) {
    if (budget.snapshot().used >= 12) return { ok: false, reason: "cap" };
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
  var row = { id: item.id, input: item.input, rubric: item.rubric, before: before };
  try {
    await p.goto(URL);
    await p.evaluate(function () { localStorage.clear(); });
    await p.reload();
    await sleep(200);
    await p.click("#pk-start");
    await sleep(80);
    await p.click("#pk-type");
    await p.fill("#pk-idea", item.input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await settle(raw);
    row.screen = await p.evaluate(function () {
      function t(id) { var e = document.querySelector(id); return e ? e.textContent : ""; }
      var go = document.querySelector("#frag-go");
      return {
        noAction: t("#v20-no-action"),
        voice: t("#v20-voice-ask"),
        ask: t("#v20-ask-advice"),
        mind: t("#v20-mind"),
        line: t("#try-line"),
        goDisabled: go ? !!go.disabled : null,
        bodyHasAttempt: document.body.innerText.indexOf("带走的是你的") >= 0
      };
    });
    if (row.screen.voice) {
      row.stoppedAt = "先问本人";
    } else if (row.screen.noAction) {
      row.stoppedAt = "不给做法";
      if (await p.$("#v20-keep-text")) await p.click("#v20-keep-text");
    } else {
      var label = await p.$eval(".sticker-label", function (e) { return e.textContent; }).catch(function () { return ""; });
      if (label) {
        await p.click('.v19-sticker[data-label="' + label.replace(/"/g, "") + '"] .sticker-btn', { force: true });
        await p.click(".v19-act-take", { force: true });
        await sleep(80);
        if (await p.locator("#frag-go").isEnabled()) {
          await p.click("#frag-go");
          await sleep(80);
          await p.click('[data-dir="body"]');
          await p.click("#dir-go");
          await settle(raw);
          if (await p.$("#v20-want-advice")) { await p.click("#v20-want-advice"); await settle(raw); }
          row.line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
          if (row.line && await p.$("#try-yes")) {
            await p.click("#try-yes");
            await sleep(200);
            row.saved = await p.evaluate(function () { return document.body.innerText.slice(0, 400); });
          }
        }
      }
    }
  } catch (e) {
    row.error = String(e && e.message || e).slice(0, 400);
  }
  row.responses = raw;
  row.after = used();
  row.calls = row.after - before;
  await ctx.close();
  return row;
}

(async function () {
  var plan = (process.env.CASES || "U07,U02,U03").split(",");
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var rows = [];
  var i;
  for (i = 0; i < plan.length; i++) {
    if (plan[i] === "U03" && used() > 7) {
      rows.push({ id: "U03", skipped: true, reason: "剩下的次数不够把理解、行动和保存走完" });
      continue;
    }
    if (used() >= 12) {
      rows.push({ id: plan[i], skipped: true, reason: "账本已到 12" });
      continue;
    }
    var row = await runCase(b, byId[plan[i]]);
    rows.push(row);
    fs.writeFileSync(outPath, JSON.stringify({ commit: commit, hash: hash, cap: 12, used: used(), cases: rows }, null, 2));
    console.log(row.id, "calls", row.calls, "used", used(), row.stoppedAt || row.line || row.error || "");
  }
  await b.close();
  console.log("LEDGER", used());
})().catch(function (e) { console.error(e); process.exit(1); });
