/* 关系单独问一次。理解里已有判断也不代替这一步；同一段不再打第二次。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var skipLib = "下周一先不去图书馆";
var fillForm = "我想在家把那张表格填完";
var lend = "我想把这把椅子借给邻居";
var keep = "同时又确定这周不外借";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这些原话", ["图书馆", "表格", "外借", "杂志", "小画", "磁带"].every(function (s) { return src.indexOf(s) < 0; }));
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  async function open(input, understand, focus) {
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
    await p.evaluate(function (pack) {
      window.__n = { understand: 0, relation: 0 };
      window.__lingcun20.armTransport(function (task, resolve) {
        if (task.type === "v20_understand") { window.__n.understand++; resolve(pack.understand); }
        else if (task.type === "v20_relation") { window.__n.relation++; resolve(pack.focus); }
        else resolve(null);
      });
    }, { understand: understand, focus: focus });
    await p.click("#pk-start");
    await sleep(30);
    await p.click("#pk-type");
    await p.fill("#pk-idea", input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await sleep(400);
    return { ctx: ctx, p: p };
  }
  var u1 = {
    facts: [
      { id: "f1", kind: "said", text: skipLib, start: 0, end: skipLib.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
      { id: "f2", kind: "keep", text: fillForm, start: skipLib.length + 1, end: skipLib.length + 1 + fillForm.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
    ],
    inferences: [], unknowns: [], relations: [{ a: "f1", b: "f2", relation: "independent", why: "理解时先写成互不影响。" }], advice: "offer"
  };
  var replaced = await open(skipLib + "。" + fillForm + "。", u1, { pairs: [{ a: "f1", b: "f2", replaces: true, both_ok: false, why: "后一句改成现在要做的事，前一句不再做。" }] });
  await replaced.p.evaluate(function () { var s = document.querySelector(".sticker-btn"); if (s) s.click(); });
  await replaced.p.click(".v19-act-take", { force: true }).catch(function () {});
  await sleep(80);
  await replaced.p.evaluate(function () { var b = document.querySelector("#frag-go"); if (b) b.click(); var d = document.querySelector('[data-dir="body"]'); if (d) d.click(); var g = document.querySelector("#dir-go"); if (g) g.click(); });
  await sleep(250);
  await replaced.p.evaluate(function () { var b = document.querySelector("#v20-pair-withdraw"); if (b) b.click(); });
  await sleep(200);
  var withdrawn = await replaced.p.$eval("#v20-withdrawn", function (e) { return e.textContent; }).catch(function () { return ""; });
  var counts = await replaced.p.evaluate(function () { return window.__n; });
  ok("后一句取代前一句", withdrawn.indexOf("已撤回") >= 0 && withdrawn.indexOf("图书馆") >= 0, withdrawn);
  ok("关系不再打模型", counts.relation === 0, JSON.stringify(counts));
  await replaced.ctx.close();

  var u2 = {
    facts: [
      { id: "f1", kind: "keep", text: lend, start: 0, end: lend.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
      { id: "f2", kind: "constraint", text: keep, start: lend.length + 1, end: lend.length + 1 + keep.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
    ],
    inferences: [], unknowns: [], relations: [{ a: "f1", b: "f2", relation: "independent", why: "理解时还没分开。" }], advice: "offer"
  };
  var clash = await open(lend + "，" + keep + "。", u2, { pairs: [{ a: "f1", b: "f2", replaces: false, both_ok: false, why: "两件都还成立，但不能一起做。" }] });
  await clash.p.evaluate(function () { var s = document.querySelector(".sticker-btn"); if (s) s.click(); });
  await clash.p.click(".v19-act-take", { force: true }).catch(function () {});
  await sleep(80);
  await clash.p.evaluate(function () { var b = document.querySelector("#frag-go"); if (b) b.click(); var d = document.querySelector('[data-dir="body"]'); if (d) d.click(); var g = document.querySelector("#dir-go"); if (g) g.click(); });
  await sleep(250);
  await clash.p.evaluate(function () { var b = document.querySelector("#v20-pair-clash"); if (b) b.click(); });
  await sleep(200);
  var asked = await clash.p.$eval("#v20-conflict", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("不能同时做就先问选边", asked.indexOf("不能只留一边") >= 0, asked);
  await clash.ctx.close();
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
