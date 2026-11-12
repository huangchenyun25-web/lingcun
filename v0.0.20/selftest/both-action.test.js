/* 两边都留时，尝试必须是同时做得到的小动作，不能复述原话。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var share = "我想把这盆薄荷分给隔壁";
var gate = "同时又确定不想让别人进院子";
var input = share + "，" + gate + "。";
var action = "把薄荷放在门外的台阶上，自己留在门内，让隔壁自己来取。";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这句原话", src.indexOf("薄荷") < 0 && src.indexOf("进院子") < 0);
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
            { id: "f1", kind: "keep", text: info.share, start: 0, end: info.share.length, speaker: "self", modality: "certain", conflicts_with: ["f2"] },
            { id: "f2", kind: "constraint", text: info.gate, start: info.share.length + 1, end: info.share.length + 1 + info.gate.length, speaker: "self", modality: "certain", conflicts_with: ["f1"] }
          ],
          inferences: [], unknowns: [], advice: "offer"
        });
      } else if (task.type === "v20_attempts") {
        resolve({
          attempts: [
            { text: info.action, why: "分给隔壁，自己不进院子。", observe: "薄荷在门外", stop: "隔壁没来就收回", uses: ["f1", "f2"] },
            { text: info.share + "。" + info.gate + "。", why: "只是把两句原话连起来", observe: "原话还在", stop: "停", uses: ["f1", "f2"] }
          ]
        });
      } else resolve(null);
    });
  }, { share: share, gate: gate, action: action });
  await p.click("#pk-start");
  await sleep(40);
  await p.click("#pk-type");
  await p.fill("#pk-idea", input);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(400);
  await p.click("#v20-keep-both");
  await sleep(150);
  var label = await p.$eval(".sticker-label", function (e) { return e.textContent; });
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(60);
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(60);
  await p.evaluate(function () { document.querySelector('[data-dir="body"]').click(); });
  await p.evaluate(function () { document.querySelector("#dir-go").click(); });
  await sleep(400);
  var line = await p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("留下同时做得到的小动作", line.indexOf("放在门外的台阶上") >= 0 && line.indexOf("两边都还在") < 0 && line.indexOf(share) < 0, line);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
