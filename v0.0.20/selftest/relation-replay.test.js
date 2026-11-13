/* 两条本人内容必须写明关系。缺了就返工，仍缺就先问。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var desk = "明天把书桌擦一遍";
var ticket = "抽屉里的旧车票先留着";
var input = desk + "。" + ticket + "。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function facts(withRelation) {
  var out = {
    facts: [
      { id: "f1", kind: "said", text: desk, start: 0, end: desk.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
      { id: "f2", kind: "said", text: ticket, start: desk.length + 1, end: desk.length + 1 + ticket.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
    ],
    inferences: [], unknowns: [], advice: "offer"
  };
  if (withRelation) out.relations = [{ a: "f1", b: "f2", relation: "independent", why: "两件都还成立，做一件不必取消另一件。" }];
  return out;
}
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("契约要求关系", src.indexOf('enum: ["supersedes", "conflicts", "independent"]') >= 0);
  ok("提示词没有这句原话", src.indexOf("书桌") < 0 && src.indexOf("车票") < 0 && src.indexOf("杂志") < 0 && src.indexOf("小画") < 0);
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  async function open(withRelation) {
    var ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    var p = await ctx.newPage();
    await p.route("**/*", function (route) {
      var u = route.request().url();
      if (/^https?:/i.test(u)) { net.push(u); return route.abort(); }
      return route.continue();
    });
    await p.goto(URL);
    await p.evaluate(function () { localStorage.clear(); });
    await p.reload();
    await sleep(100);
    await p.evaluate(function (payload) {
      window.__n = 0;
      window.__lingcun20.armTransport(function (task, resolve) {
        if (task.type === "v20_understand") { window.__n++; resolve(payload); }
        else resolve(null);
      });
    }, facts(withRelation));
    await p.click("#pk-start");
    await sleep(40);
    await p.click("#pk-type");
    await p.fill("#pk-idea", input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await sleep(500);
    return { ctx: ctx, p: p };
  }
  var missing = await open(false);
  var ask = await missing.p.$eval("#v20-relation-ask", function (e) { return e.textContent; }).catch(function () { return ""; });
  var calls = await missing.p.evaluate(function () { return window.__n; });
  var jumped = await missing.p.evaluate(function () { return document.body.innerText.indexOf("带走的是你的") >= 0; });
  ok("缺关系会返工一次", calls === 2, String(calls));
  ok("仍缺就先问，不复述", ask.indexOf("还不确定") >= 0 && jumped === false, ask);
  await missing.ctx.close();
  var known = await open(true);
  var ask2 = await known.p.$("#v20-relation-ask");
  var clash = await known.p.$("#v20-conflict");
  ok("写明独立就不追问、不当冲突", !ask2 && !clash);
  await known.ctx.close();
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
