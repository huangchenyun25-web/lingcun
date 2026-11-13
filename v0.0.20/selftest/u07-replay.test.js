/* 回放 U07 的真实理解结果。LingcunTransport，不发网络。 */
var fs = require("fs");
var path = require("path");
var { chromium } = require("playwright-core");
var live = require("./holdout/round4_live_10fbca5.json");
var u07 = live.actionPass.filter(function (c) { return c.id === "U07"; })[0];
var content = JSON.parse(JSON.parse(u07.responses[0].body).choices[0].message.content);
var URL = "file://" + path.resolve(__dirname, "../page/index.html");
var net = [];
var n = 0, fail = 0;
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  if (/别给我出主意/.test(fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8"))) throw new Error("产品代码不该写死这句原话");
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  var kinds = [];
  await p.route("**/*", function (route) {
    var u = route.request().url();
    if (/^https?:/i.test(u)) { net.push(u); return route.abort(); }
    return route.continue();
  });
  await p.goto(URL);
  await p.evaluate(function () { localStorage.clear(); });
  await p.reload();
  await sleep(200);
  await p.evaluate(function (payload) {
    window.__lingcun20.armTransport(function (task, resolve) {
      window.__kinds = window.__kinds || [];
      window.__kinds.push(task.type);
      if (task.type === "v20_understand") resolve(payload);
      else resolve(null);
    });
  }, content);
  await p.click("#pk-start");
  await sleep(80);
  await p.click("#pk-type");
  await p.fill("#pk-idea", u07.input);
  await p.evaluate(function () { document.querySelector("#pk-go").click(); });
  await sleep(600);
  var state = await p.evaluate(function () {
    var mind = document.querySelector("#v20-no-action");
    var go = document.querySelector("#frag-go");
    var rec = window.__lingcun20.record();
    return {
      note: mind ? mind.textContent : "",
      go: go ? go.disabled : null,
      advice: (function () {
        var raw = localStorage.getItem("lingcun_v010_state");
        var projects = raw ? JSON.parse(raw).projects : [];
        var cur = projects[projects.length - 1];
        return cur && cur.v18 && cur.v18.mind && cur.v18.mind.advice;
      })(),
      body: document.body.innerText.indexOf("带走的是你的") >= 0,
      kinds: window.__kinds || [],
      facts: rec && rec.facts.map(function (f) { return f.text; })
    };
  });
  ok("理解字段记成不要行动", state.advice === "decline", state.advice);
  ok("不生成尝试句", state.go === true && state.body === false && state.note.indexOf("先不给做法") >= 0, JSON.stringify(state));
  ok("没有去要行动", state.kinds.indexOf("v20_attempts") < 0, state.kinds.join(","));
  await p.click("#v20-want-advice");
  await sleep(200);
  var label = await p.$eval(".sticker-label", function (e) { return e.textContent; });
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await p.click(".v19-act-take", { force: true });
  await sleep(100);
  var resumed = await p.$eval("#frag-go", function (e) { return e.disabled; });
  var advice = await p.evaluate(function () {
    var raw = localStorage.getItem("lingcun_v010_state");
    var cur = JSON.parse(raw).projects.pop();
    return cur.v18.mind.advice + "/" + cur.v18.mind.adviceFrom;
  });
  ok("改口要建议后可以继续", advice === "offer/user" && resumed === false, advice + " disabled=" + resumed);
  ok("回放没有发出网页请求", net.length === 0, net.join(" "));
  await b.close();
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
