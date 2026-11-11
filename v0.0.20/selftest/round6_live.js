/* 只复测 U02、U03。新账本 selftest/round6，上限 6。不改题目。
   每题按理解 1 次、格式不对再 1 次来留。decline 或先问本人之后不再要行动和顺句。
   2+2=4，上限 6，两题都能走完。若 U02 用了 4 次以上，剩下的不够 U03 的理解加一次返工，就不再开 U03。 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var { execSync } = require("child_process");
process.env.AI_LEDGER_DIR = path.join(__dirname, "round6");
process.env.AI_BUDGET_CAP = "6";
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
var commit = execSync("git rev-parse --short HEAD", { cwd: path.resolve(__dirname, "../..") }).toString().trim();
var outPath = path.join(__dirname, "holdout", "round6_live_" + commit + ".json");
var byId = {};
frozen.cases.forEach(function (c) { byId[c.id] = c; });
var CAP = 6;
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function used() { return budget.snapshot().used; }
async function settle(raw) {
  var last = -1, stable = 0, i;
  for (i = 0; i < 40; i++) {
    await sleep(400);
    if (raw.length === last) stable++;
    else { stable = 0; last = raw.length; }
    if (raw.length > 0 && stable >= 4) return;
    if (used() >= CAP && stable >= 2) return;
  }
}
async function runCase(b, item) {
  var before = used();
  if (before >= CAP) return { id: item.id, skipped: true, reason: "账本已到 6" };
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
      var buckets = {};
      document.querySelectorAll("#v20-mind p[data-voice]").forEach(function (el) {
        var ul = el.nextElementSibling;
        buckets[el.getAttribute("data-voice")] = ul ? ul.innerText : "";
      });
      return {
        noAction: t("#v20-no-action"),
        voice: t("#v20-voice-ask"),
        ask: t("#v20-ask-advice"),
        mind: t("#v20-mind"),
        buckets: buckets,
        line: t("#try-line"),
        goDisabled: go ? !!go.disabled : null,
        bodyHasAttempt: document.body.innerText.indexOf("带走的是你的") >= 0
      };
    });
    var shot = path.join(__dirname, "holdout", "round6_" + item.id + ".png");
    await p.screenshot({ path: shot, fullPage: true });
    row.screenshot = shot;
    if (row.screen.voice) row.stoppedAt = "先问本人";
    else if (row.screen.noAction) row.stoppedAt = "不给做法";
    else row.stoppedAt = "没有停在询问或不给做法";
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
  var plan = ["U02", "U03"];
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var rows = [];
  var i;
  for (i = 0; i < plan.length; i++) {
    if (plan[i] === "U03" && used() > 4) {
      rows.push({ id: "U03", skipped: true, reason: "剩下的次数不够把理解走完" });
      continue;
    }
    if (used() >= CAP) {
      rows.push({ id: plan[i], skipped: true, reason: "账本已到 6" });
      continue;
    }
    var row = await runCase(b, byId[plan[i]]);
    rows.push(row);
    fs.writeFileSync(outPath, JSON.stringify({ commit: commit, hash: hash, cap: CAP, used: used(), plan: "U02、U03 各预留理解 1 次和返工 1 次。到询问或不给做法就停，不再要行动。", cases: rows }, null, 2));
    console.log(row.id, "calls", row.calls, "used", used(), row.stoppedAt || row.error || "");
  }
  await b.close();
  console.log("LEDGER", used(), commit);
})().catch(function (e) { console.error(e); process.exit(1); });
