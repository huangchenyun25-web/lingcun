/* 转述和假设不进「想试」。句子不在 U 题里。LingcunTransport，不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
var cases = [
  {
    name: "转述",
    input: "邻居说这面墙该重新刷漆",
    out: { facts: [{ id: "f1", kind: "said", text: "邻居说这面墙该重新刷漆", start: 0, end: 11, speaker: "reported", modality: "certain" }], inferences: [], unknowns: [], advice: "unsure" }
  },
  {
    name: "假设",
    input: "说不定下周会去河边坐坐",
    out: { facts: [{ id: "f1", kind: "said", text: "说不定下周会去河边坐坐", start: 0, end: 11, speaker: "self", modality: "hypothetical" }], inferences: [], unknowns: [], advice: "offer" }
  }
];

(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("契约有说话人和语气", src.indexOf('enum: ["self", "reported"]') >= 0 && src.indexOf('enum: ["certain", "hypothetical", "refusal"]') >= 0);
  ok("提示词没有这两句原话", src.indexOf("邻居说这面墙") < 0 && src.indexOf("河边坐坐") < 0 && src.indexOf("摆摊") < 0 && src.indexOf("磁带") < 0);
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var i;
  for (i = 0; i < cases.length; i++) {
    var item = cases[i];
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
    await sleep(150);
    await p.evaluate(function (payload) {
      window.__lingcun20.armTransport(function (task, resolve) {
        if (task.type === "v20_understand") resolve(payload);
        else resolve(null);
      });
    }, item.out);
    await p.click("#pk-start");
    await sleep(60);
    await p.click("#pk-type");
    await p.fill("#pk-idea", item.input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await sleep(500);
    var asked = await p.$eval("#v20-voice-ask", function (e) { return e.textContent; }).catch(function () { return ""; });
    var jumped = await p.evaluate(function () { return document.body.innerText.indexOf("带走的是你的") >= 0; });
    ok(item.name + "先问本人", asked.indexOf("你自己是这么想的吗") >= 0 && jumped === false, asked);
    await ctx.close();
  }
  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
