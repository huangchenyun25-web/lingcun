/* 回到输入后仍能打字。改口后以最新这句为准。句子不在 U 题里。不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var n = 0, fail = 0, net = [];
var first = "周六把窗台的空瓶收进纸箱";
var next = "改成把那张没寄出的便条写完";
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v18.js"), "utf8") + fs.readFileSync(path.join(__dirname, "../_build/v19.js"), "utf8");
  ok("产品没有写死这两句", src.indexOf("空瓶") < 0 && src.indexOf("便条") < 0 && src.indexOf("摆摊") < 0);
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
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
  await p.click("#pk-start");
  await sleep(80);
  var typeShown = await p.$eval("#pk-type", function (e) { return e.offsetParent !== null && !e.classList.contains("hidden"); });
  ok("打字按钮一开始就在", typeShown);
  await p.click("#pk-type");
  await sleep(80);
  var ideaShown = await p.$eval("#pk-idea", function (e) { return e.offsetParent !== null; });
  ok("点打字后能输入", ideaShown);
  await p.fill("#pk-idea", first);
  await p.click("#pk-go");
  await sleep(250);
  await p.evaluate(function () {
    document.querySelector("#menu-btn").click();
    document.querySelector("#menu-home").click();
  });
  await sleep(200);
  await p.click("#pk-start");
  await sleep(120);
  var backShown = await p.$eval("#pk-type", function (e) { return e.offsetParent !== null && !e.classList.contains("hidden"); });
  ok("回到首页后打字还在", backShown);
  await p.click("#pk-type");
  await sleep(80);
  var backIdea = await p.$eval("#pk-idea", function (e) { return e.offsetParent !== null; });
  ok("回到首页后点打字能输入", backIdea);
  await p.fill("#pk-idea", first);
  await p.click("#pk-go");
  await sleep(200);
  await p.click("#frag-revise");
  await sleep(150);
  var reviseIdea = await p.$eval("#pk-idea", function (e) { return { shown: e.offsetParent !== null, value: e.value }; });
  var reviseType = await p.$eval("#pk-type", function (e) { return e.offsetParent !== null; });
  ok("改这句时输入还在", reviseType && reviseIdea.shown && reviseIdea.value.indexOf("空瓶") >= 0, JSON.stringify(reviseIdea));
  await p.fill("#pk-idea", next);
  await p.click("#pk-go");
  await sleep(250);
  var state = await p.evaluate(function () {
    var labels = Array.prototype.map.call(document.querySelectorAll(".sticker-label"), function (e) { return e.textContent; });
    var rec = window.__lingcun20.record();
    var current = rec ? rec.facts.concat(rec.constraints, rec.intents).map(function (x) { return x.text; }) : [];
    return { labels: labels, current: current, idea: (JSON.parse(localStorage.getItem("lingcun_v010_state")).projects.slice(-1)[0] || {}).idea || "" };
  });
  ok("当前只留最新这句", state.idea === next && state.current.join(" ").indexOf("便条") >= 0 && state.current.join(" ").indexOf("空瓶") < 0, JSON.stringify(state));
  ok("旧句不再当贴纸", state.labels.join(" ").indexOf("空瓶") < 0 && state.labels.join(" ").indexOf("便条") >= 0, state.labels.join("|"));
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
