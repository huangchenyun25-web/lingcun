/* 下标差一位、推测句不是原文，也不该把整段读法丢掉再无限重问。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var earlier = "明早先不出门倒垃圾";
var later = "我想把阳台的空箱子叠好";
var source = earlier + "。" + later + "。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这句原话", src.indexOf("倒垃圾") < 0 && src.indexOf("空箱子") < 0);
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
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
  await sleep(80);
  var slipped = {
    facts: [
      { id: "f1", kind: "said", text: earlier + "。", start: 0, end: earlier.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
      { id: "f2", kind: "keep", text: later + "。", start: earlier.length + 1, end: earlier.length + later.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
    ],
    inferences: [{ id: "i1", text: "先把箱子叠好，垃圾明天再说。", start: 0, end: source.length }],
    unknowns: [],
    relations: [{ a: "f1", b: "f2", relation: "independent", why: "理解时先写成互不影响。" }],
    advice: "offer"
  };
  var errors = await p.evaluate(function (pack) { return window.__lingcun20.checkUnderstand(pack.source, pack.out); }, { source: source, out: slipped });
  ok("下标差一位仍收下原文里的句子", errors.length === 0, JSON.stringify(errors));
  var invented = await p.evaluate(function (pack) {
    var out = JSON.parse(JSON.stringify(pack.out));
    out.facts[1].text = "并不在这句话里的安排";
    var errors = window.__lingcun20.checkUnderstand(pack.source, out);
    var only = JSON.parse(JSON.stringify(pack.out));
    only.facts = [{ id: "f9", kind: "said", text: "并不在这句话里的安排", start: 0, end: 4, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }];
    return { kept: out.facts.map(function (f) { return f.text; }), errors: errors, only: window.__lingcun20.checkUnderstand(pack.source, only) };
  }, { source: source, out: slipped });
  ok("对不上原文的句子不会留下", invented.kept.indexOf("并不在这句话里的安排") < 0 && invented.only.length > 0, JSON.stringify(invented));

  await p.evaluate(function (pack) {
    window.__n = { understand: 0, relation: 0 };
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") { window.__n.understand++; resolve(pack.out); }
      else if (task.type === "v20_relation") { window.__n.relation++; resolve({ pairs: [{ a: "f1", b: "f2", replaces: true, both_ok: false, why: "后一句换成现在要做的事。" }] }); }
      else resolve(null);
    });
  }, { out: slipped });
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", source);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(400);
  var counts = await p.evaluate(function () { return window.__n; });
  ok("只理解一次，关系不再打模型", counts.understand === 1 && counts.relation === 0, JSON.stringify(counts));
  await ctx.close();

  var ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  var p2 = await ctx2.newPage();
  await p2.route("**/*", function (route) {
    var u = route.request().url();
    if (/^https?:/i.test(u)) { net.push(u); return route.abort(); }
    return route.continue();
  });
  await p2.goto(URL);
  await p2.evaluate(function () { localStorage.clear(); });
  await p2.reload();
  await sleep(80);
  await p2.evaluate(function () {
    window.__n = { understand: 0 };
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") window.__n.understand++;
      resolve(null);
    });
  });
  await p2.click("#pk-start");
  await sleep(40);
  await p2.click("#pk-type");
  await p2.fill("#pk-idea", source);
  await p2.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(300);
  var labels = await p2.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); });
  if (labels[0]) {
    await p2.click('.v19-sticker[data-label="' + labels[0].replace(/"/g, "") + '"] .sticker-btn', { force: true });
    await sleep(200);
  }
  var again = await p2.evaluate(function () { return window.__n; });
  var failed = await p2.$eval("#v20-mind", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("失败后只返工一次并停止", again.understand === 2 && failed.indexOf("没能核上") >= 0, JSON.stringify(again) + " " + failed);
  await ctx2.close();
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
