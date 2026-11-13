/* 理解还在路上时先选了方向，同一句原话回来后仍要判断关系。句子不在 U 题里。不发网络。 */
var path = require("path");
var fs = require("fs");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var earlier = "明天先不去菜市场";
var later = "我想在家把购物清单写完";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这句原话", src.indexOf("菜市场") < 0 && src.indexOf("购物清单") < 0);
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
  await p.evaluate(function (pack) {
    window.__q = [];
    window.__n = { relation: 0 };
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") window.__q.push(resolve);
      else if (task.type === "v20_relation") { window.__n.relation++; resolve(pack.focus); }
      else resolve(null);
    });
  }, { focus: { pairs: [{ a: "f1", b: "f2", replaces: true, both_ok: false, why: "后一句换成现在要做的事。" }] } });
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", earlier + "。" + later + "。");
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(200);
  var labels = await p.$$eval(".sticker-label", function (els) { return els.map(function (e) { return e.textContent; }); });
  var label = labels.filter(function (t) { return t.indexOf("购物清单") >= 0; })[0] || labels[0];
  await p.click('.v19-sticker[data-label="' + label.replace(/"/g, "") + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(80);
  await p.evaluate(function () { var b = document.querySelector("#frag-go"); if (b) b.click(); });
  await sleep(80);
  await p.evaluate(function () { var b = document.querySelector('[data-dir="body"]'); if (b) b.click(); });
  await p.evaluate(function () { var b = document.querySelector("#dir-go"); if (b) b.click(); });
  await sleep(150);
  var queued = await p.evaluate(function () { return window.__q.length; });
  ok("先换方向时理解还没回来", queued >= 1, String(queued));
  await p.evaluate(function (out) { window.__q[0](out); }, {
    facts: [
      { id: "f1", kind: "said", text: earlier, start: 0, end: earlier.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
      { id: "f2", kind: "keep", text: later, start: earlier.length + 1, end: earlier.length + 1 + later.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
    ],
    inferences: [], unknowns: [], relations: [{ a: "f1", b: "f2", relation: "independent", why: "理解时先写成互不影响。" }], advice: "offer"
  });
  await sleep(250);
  var asked = await p.$("#v20-pair");
  ok("换方向后先问用户，不打关系模型", !!asked && (await p.evaluate(function () { return window.__n.relation; })) === 0);
  await p.evaluate(function () { document.querySelector("#v20-pair-withdraw").click(); });
  await sleep(200);
  var rel = await p.evaluate(function () { return window.__lingcun20.record().userRelation; });
  ok("后一句取代前一句", rel && rel.sourceId === "user" && rel.choice === "withdraw" && rel.relations[0].relation === "supersedes" && rel.relations[0].b === "f1", JSON.stringify(rel));
  await p.click("#try-no");
  await sleep(80);
  await p.click("#try-no");
  await sleep(120);
  if (await p.$("#try-refrag")) await p.click("#try-refrag");
  await sleep(200);
  var withdrawn = await p.$eval('#v20-mind [data-voice="withdrawn"]', function (e) { return e.nextElementSibling.innerText; }).catch(function () { return ""; });
  ok("回到材料页能看见已撤回", withdrawn.indexOf("菜市场") >= 0, withdrawn);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
