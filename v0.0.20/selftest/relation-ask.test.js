/* 两条本人的确定句先问用户。四种回答都看一遍。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var earlier = "明早先不去菜市场";
var later = "我想在家把购物清单核对完";
var input = earlier + "。" + later + "。";
var joint = "在家把清单对完三行，人留在屋里。";
var onlyLater = "把购物清单摊开，对三行就停。";
var onlyEarlier = "出门去菜市场转一圈。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这些原话", src.indexOf("菜市场") < 0 && src.indexOf("购物清单") < 0 && src.indexOf("杂志") < 0 && src.indexOf("小画") < 0);
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  async function open(attempts) {
    var ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    var p = await ctx.newPage();
    await p.route("**/*", function (route) {
      if (/^https?:/i.test(route.request().url())) { net.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await p.goto(URL);
    await p.evaluate(function () { localStorage.clear(); });
    await p.reload();
    await sleep(60);
    await p.evaluate(function (pack) {
      window.__n = { understand: 0, relation: 0, attempts: 0 };
      window.__lingcun20.armTransport(function (task, resolve) {
        if (task.type === "v20_understand") {
          window.__n.understand++;
          resolve({
            facts: [
              { id: "f1", kind: "said", text: pack.earlier, start: 0, end: pack.earlier.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
              { id: "f2", kind: "keep", text: pack.later, start: pack.earlier.length + 1, end: pack.earlier.length + 1 + pack.later.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }
            ],
            inferences: [], unknowns: [], relations: [{ a: "f1", b: "f2", relation: "independent", why: "模型先写成互不影响。" }], advice: "offer"
          });
        } else if (task.type === "v20_relation") { window.__n.relation++; resolve(null); }
        else if (task.type === "v20_attempts") { window.__n.attempts++; resolve(pack.attempts); }
        else resolve(null);
      });
    }, { earlier: earlier, later: later, attempts: attempts });
    await p.click("#pk-start");
    await sleep(30);
    await p.click("#pk-type");
    await p.fill("#pk-idea", input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await sleep(300);
    await p.evaluate(function () { var s = document.querySelector(".sticker-btn"); if (s) s.click(); });
    await p.click(".v19-act-take", { force: true }).catch(function () {});
    await sleep(60);
    await p.evaluate(function () {
      var go = document.querySelector("#frag-go"); if (go) go.click();
      var d = document.querySelector('[data-dir="body"]'); if (d) d.click();
      var g = document.querySelector("#dir-go"); if (g) g.click();
    });
    await sleep(200);
    return { ctx: ctx, p: p };
  }
  var attempts = {
    attempts: [
      { text: joint, why: "人留在屋里，清单也对完。", observe: "清单少了三行", stop: "对完就停", uses: ["f1", "f2"] },
      { text: onlyLater, why: "只做后面那件。", observe: "纸上有勾", stop: "对完就停", uses: ["f2"] },
      { text: onlyEarlier, why: "只做前面那件。", observe: "人出门了", stop: "到了就停", uses: ["f1"] }
    ]
  };
  var ask = await open(attempts);
  var title = await ask.p.$eval("#v20-pair-title", function (e) { return e.textContent; });
  var quotes = await ask.p.$eval("#v20-pair", function (e) { return e.textContent; });
  var before = await ask.p.evaluate(function () { return window.__n; });
  ok("核对页先问关系", title.indexOf("你说了两件事，它们是什么关系？") >= 0 && quotes.indexOf("菜市场") >= 0 && quotes.indexOf("购物清单") >= 0, title);
  ok("问的时候还没有行动", before.attempts === 0 && before.relation === 0, JSON.stringify(before));
  await ask.p.evaluate(function () { document.querySelector("#v20-pair-withdraw").click(); });
  await sleep(250);
  var withdrawn = await ask.p.$eval("#v20-withdrawn", function (e) { return e.textContent; }).catch(function () { return ""; });
  var line = await ask.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  var saved = await ask.p.evaluate(function () { return window.__lingcun20.record().userRelation; });
  ok("改主意就撤回前一句", withdrawn.indexOf("菜市场") >= 0 && line.indexOf("购物清单") >= 0 && line.indexOf("菜市场") < 0, withdrawn + " / " + line);
  ok("回答记在用户记录里", saved && saved.sourceId === "user" && saved.choice === "withdraw" && saved.rev === 1, JSON.stringify(saved));
  await ask.ctx.close();

  var both = await open(attempts);
  await both.p.evaluate(function () { document.querySelector("#v20-pair-both").click(); });
  await sleep(250);
  var bothLine = await both.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("两件都要就留下同时做得到的", bothLine.indexOf("清单对完三行") >= 0 && bothLine.indexOf(earlier) < 0, bothLine);
  await both.ctx.close();

  var clash = await open(attempts);
  await clash.p.evaluate(function () { document.querySelector("#v20-pair-clash").click(); });
  await sleep(200);
  var clashText = await clash.p.$eval("#v20-conflict", function (e) { return e.textContent; }).catch(function () { return ""; });
  var clashLine = await clash.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  var calls = await clash.p.evaluate(function () { return window.__n.attempts; });
  ok("打架就先问选边，不替用户选", clashText.indexOf("不能只留一边") >= 0 && clashLine.indexOf("菜市场") < 0 && clashLine.indexOf("购物清单摊开") < 0, clashText + " / " + clashLine + " / " + calls);
  await clash.ctx.close();

  var skip = await open(attempts);
  await skip.p.evaluate(function () { document.querySelector("#v20-pair-skip").click(); });
  await sleep(200);
  var skipLine = await skip.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  var skipRel = await skip.p.evaluate(function () { return { n: window.__n, rel: window.__lingcun20.record().userRelation }; });
  ok("跳过就先不给做法", skipLine.indexOf("先不给做法") >= 0 && skipRel.n.attempts === 0 && skipRel.rel.choice === "skip", skipLine);
  var again = await skip.p.evaluate(function () { return window.__lingcun20.record().relationHistory.length; });
  await skip.p.evaluate(function () { document.querySelector("#v20-pair-skip"); });
  ok("跳过也有版本", skipRel.rel.rev >= 1 && again === 0, JSON.stringify(skipRel.rel));
  await skip.ctx.close();
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
