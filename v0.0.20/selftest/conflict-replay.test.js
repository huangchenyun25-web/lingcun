/* 两边冲突时不能只带走一边。句子不在 U 题里。LingcunTransport，不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var lend = "我想把阳台的椅子借给楼上";
var stay = "同时又确定不想让第二户进门";
var input = lend + "，" + stay + "。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("契约有冲突字段", src.indexOf("conflicts_with") >= 0);
  ok("提示词没有这句原话", src.indexOf("椅子") < 0 && src.indexOf("第二户") < 0 && src.indexOf("小画") < 0);
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
  await sleep(120);
  var payload = {
    facts: [
      { id: "f1", kind: "keep", text: lend, start: 0, end: lend.length, speaker: "self", modality: "certain", conflicts_with: ["f2"] },
      { id: "f2", kind: "constraint", text: stay, start: lend.length + 1, end: lend.length + 1 + stay.length, speaker: "self", modality: "certain", conflicts_with: ["f1"] }
    ],
    inferences: [],
    unknowns: [],
    advice: "offer"
  };
  await p.evaluate(function (out) {
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") resolve(out);
      else if (task.type === "v20_attempts") resolve({
        attempts: [
          { text: "今晚只把阳台的椅子借给楼上。", why: "只做成借出这一边", observe: "椅子离开阳台", stop: "如果楼上不在就停", uses: ["f1"] },
          { text: "今晚不外借，椅子留在原处。", why: "只做成不进门这一边", observe: "椅子还在", stop: "如果改主意就停", uses: ["f2"] }
        ]
      });
      else resolve(null);
    });
  }, payload);
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", input);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(500);
  var asked = await p.$eval("#v20-conflict", function (e) { return e.textContent; }).catch(function () { return ""; });
  var early = await p.evaluate(function () { return document.body.innerText.indexOf("带走的是") >= 0; });
  ok("先指出两边，不生成一边", asked.indexOf("不能只留一边") >= 0 && early === false, asked);
  await p.click("#v20-keep-both");
  await sleep(200);
  var label = await p.$eval(".sticker-label", function (e) { return e.textContent; });
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(80);
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(80);
  await p.evaluate(function () { document.querySelector('[data-dir="body"]').click(); });
  await p.evaluate(function () { document.querySelector("#dir-go").click(); });
  await sleep(400);
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("行动同时留下两边", line.indexOf(lend) >= 0 && line.indexOf(stay) >= 0 && line.indexOf("只把阳台的椅子借给楼上") < 0, line);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
