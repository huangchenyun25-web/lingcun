/* 验收句不能编出原话里没有的结果。通过校验的行动句要留在页面上。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var said = "今晚把阳台的椅子搬进门廊";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8") + fs.readFileSync(path.join(__dirname, "../_build/v18.js"), "utf8");
  ok("产品没有写死这句", src.indexOf("门廊") < 0 && src.indexOf("不潮") < 0 && src.indexOf("磁带") < 0);
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
  await p.evaluate(function (text) {
    window.__lingcun20.armTransport(function (task, resolve) {
      if (task.type === "v20_understand") {
        resolve({
          facts: [{ id: "f1", kind: "said", text: text, start: 0, end: text.length, speaker: "self", modality: "certain", conflicts_with: [] }],
          inferences: [], unknowns: [], advice: "offer"
        });
      } else if (task.type === "v18_attempt") {
        resolve({ attempt: "今晚把阳台的椅子搬进门廊，只做这一件。", enough: "椅子摸起来不潮了" });
      } else if (task.type === "v20_attempts") {
        resolve({
          attempts: [
            { text: "今晚把阳台的椅子搬进门廊，只做这一件。", why: "接上原话「今晚把阳台的椅子搬进门廊」。", observe: "椅子到了门廊", stop: "椅子摸起来不潮了", uses: ["今晚把阳台的椅子搬进门廊"] },
            { text: "先不搬，只在门口看一眼阳台的椅子。", why: "仍对着「今晚把阳台的椅子搬进门廊」，先停在看。", observe: "人站在门口", stop: "看完就停", uses: ["今晚把阳台的椅子搬进门廊"] }
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
  var label = await p.$eval(".sticker-label", function (e) { return e.textContent; });
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(80);
  await p.evaluate(function () { document.querySelector("#frag-go").click(); });
  await sleep(80);
  await p.evaluate(function () { document.querySelector('[data-dir="body"]').click(); });
  await p.evaluate(function () { document.querySelector("#dir-go").click(); });
  await sleep(500);
  var view = await p.evaluate(function () {
    return {
      line: (document.querySelector("#try-line") || {}).textContent || "",
      enough: (document.querySelector("#en-t") || {}).textContent || ""
    };
  });
  ok("行动句换成模型给出的原话动作", view.line.indexOf("搬进门廊") >= 0 && view.line.indexOf("带走的是你的自述") < 0, view.line);
  ok("验收句没有编出没说过的结果", view.enough.indexOf("不潮") < 0 && view.enough.indexOf("做完你认可的这一件就停") >= 0, view.enough);
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
