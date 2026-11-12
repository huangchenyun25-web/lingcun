/* 撤回旧意愿不是冲突。尝试按还成立的那句来。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var oldText = "空瓶先留着";
var nextText = "我想把那张没寄出的便条写完";
var input = oldText + "。" + nextText + "。";
var action = "把没寄出的便条再写一段，写完就收好。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("契约能标撤回", src.indexOf("supersedes") >= 0);
  ok("提示词没有这句原话", src.indexOf("空瓶") < 0 && src.indexOf("便条") < 0 && src.indexOf("算了") < 0);
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
  await sleep(100);
  await p.evaluate(function (info) {
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") {
        resolve({
          facts: [
            { id: "f1", kind: "said", text: info.oldText, start: 0, end: info.oldText.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] },
            { id: "f2", kind: "keep", text: info.nextText, start: info.oldText.length + 1, end: info.oldText.length + 1 + info.nextText.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: ["f1"] }
          ],
          inferences: [], unknowns: [], advice: "offer"
        });
      } else if (task.type === "v20_attempts") {
        resolve({
          attempts: [
            { text: info.action, why: "接上还成立的那句。", observe: "纸上多了一段", stop: "写完就停", uses: ["f2"] },
            { text: info.oldText, why: "去做已经撤回的那句。", observe: "旧的还在", stop: "停", uses: ["f1"] }
          ]
        });
      } else resolve(null);
    });
  }, { oldText: oldText, nextText: nextText, action: action });
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", input);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(450);
  var asked = await p.$("#v20-conflict");
  var withdrawn = await p.$eval('#v20-mind [data-voice="withdrawn"]', function (e) { return e.nextElementSibling.innerText; }).catch(function () { return ""; });
  ok("撤回不进并存提示", !asked && withdrawn.indexOf(oldText) >= 0, withdrawn);
  await p.click('.v19-sticker[data-label="' + nextText + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(80);
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(60);
  await p.evaluate(function () { document.querySelector('[data-dir="body"]').click(); });
  await p.evaluate(function () { document.querySelector("#dir-go").click(); });
  await sleep(400);
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("尝试按还成立的那句", line.indexOf("便条") >= 0 && line.indexOf("空瓶") < 0 && line.indexOf("两边都还在") < 0, line);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
