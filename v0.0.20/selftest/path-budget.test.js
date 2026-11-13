/* 发布默认不发送。评测开关打开后，仍走产品的 fetchWith 和 claimModelSend。不打真实中转。 */
var fs = require("fs");
var os = require("os");
var path = require("path");
var { chromium } = require("playwright-core");
var budget = require("./ai-budget");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0;
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
var FAKE = JSON.stringify({ choices: [{ message: { content: "{\"facts\":[],\"inferences\":[],\"unknowns\":[]}" } }] });

async function boot(b, opts) {
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  var p = await ctx.newPage();
  var hits = [];
  if (opts.eval) {
    await p.exposeFunction("__lingcunClaim", function (meta) {
      var ticket = budget.reserve({ route: meta && meta.route, kind: meta && meta.kind, channel: "page" });
      hits.push({ ev: "claim", ok: ticket.ok, reason: ticket.reason || "" });
      return ticket;
    });
    await p.addInitScript(function () {
      window.__lingcunEval = true;
      window.__lingcunAiBudget = { claim: function (meta) { return window.__lingcunClaim(meta); } };
    });
  }
  await p.route("**/*", function (route) {
    var u = route.request().url();
    if (/chat\/completions/.test(u)) {
      hits.push({ ev: "fetch", url: u });
      return route.fulfill({ status: 200, contentType: "application/json", body: FAKE });
    }
    if (/^https?:/i.test(u)) return route.abort();
    return route.continue();
  });
  await p.goto(URL);
  await p.evaluate(function () { localStorage.clear(); });
  await p.reload();
  await sleep(200);
  await p.click("#pk-start");
  await sleep(80);
  await p.click("#pk-type");
  await p.fill("#pk-idea", "我想把阳台那个空花盆收进柜子");
  await p.click("#pk-go");
  await sleep(1200);
  return { p: p, hits: hits, ctx: ctx };
}

(async function () {
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var plain = await boot(b, {});
  ok("测试默认 0 次真实发送", plain.hits.length === 0, JSON.stringify(plain.hits));
  await plain.ctx.close();

  var dirB = fs.mkdtempSync(path.join(os.tmpdir(), "path-b-"));
  process.env.AI_LEDGER_DIR = dirB;
  process.env.AI_BUDGET_CAP = "4";
  var opened = await boot(b, { eval: true });
  var fetches = opened.hits.filter(function (h) { return h.ev === "fetch"; });
  var claims = opened.hits.filter(function (h) { return h.ev === "claim" && h.ok; });
  ok("评测开关经过产品中转地址", fetches.length >= 1 && /lingcun-relay\.lingcun\.workers\.dev\/v1\/chat\/completions/.test(fetches[0].url), fetches[0] && fetches[0].url);
  ok("发送前先占用次数", claims.length >= 1 && opened.hits[0].ev === "claim");
  await opened.ctx.close();

  var dirC = fs.mkdtempSync(path.join(os.tmpdir(), "path-c-"));
  process.env.AI_LEDGER_DIR = dirC;
  process.env.AI_BUDGET_CAP = "1";
  budget.reserve({ route: "relay", kind: "seed", channel: "script" });
  var capped = await boot(b, { eval: true });
  var sent = capped.hits.filter(function (h) { return h.ev === "fetch"; });
  var refused = capped.hits.filter(function (h) { return h.ev === "claim" && !h.ok; });
  ok("超过上限后发送前就被拒", sent.length === 0 && refused.length >= 1, JSON.stringify(capped.hits));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
