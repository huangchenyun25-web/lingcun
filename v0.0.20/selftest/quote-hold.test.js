/* 没有合格的小动作时，不把原话复述当成尝试。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var said = "下周六把窗台的空杯子收进柜子";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("产品没有写死这句", src.indexOf("空杯子") < 0 && src.indexOf("窗台") < 0);
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
  await p.evaluate(function (text) {
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") {
        resolve({
          facts: [{ id: "f1", kind: "said", text: text, start: 0, end: text.length, speaker: "self", modality: "certain", conflicts_with: [], supersedes: [] }],
          inferences: [], unknowns: [], advice: "offer"
        });
      } else if (task.type === "v20_attempts") {
        resolve({
          attempts: [
            { text: "带走的是你的自述「" + text + "」。", why: "只是复述", observe: "原话还在", stop: "停", uses: ["f1"] },
            { text: text, why: "原句本身", observe: "原话还在", stop: "停", uses: ["f1"] }
          ]
        });
      } else resolve(null);
    });
  }, said);
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", said);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(400);
  await p.click('.v19-sticker[data-label="' + said + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(60);
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(60);
  await p.evaluate(function () { document.querySelector('[data-dir="craft"]').click(); });
  await p.evaluate(function () { document.querySelector("#dir-go").click(); });
  await sleep(400);
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  var basis = await p.$eval("#try-basis", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("复述不能当尝试", /先不给做法/.test(line) && line.indexOf("带走的是你的") < 0 && basis.indexOf("空杯子") >= 0, line);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
