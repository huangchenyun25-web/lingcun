/* 按 speaker / modality 显示和使用。句子不在 U 题里。LingcunTransport，不发网络。 */
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
var reported = "房东说这扇门该换把锁";
var imagined = "或许下个月会把旧画框挂上";
var refused = "这周先不报名了";
var mixed = "抽屉里还有半盒图钉。假如周末有空，也许会把那张海报钉上。";
var pin = "抽屉里还有半盒图钉";
var poster = "假如周末有空，也许会把那张海报钉上";

(async function () {
  var src = fs.readFileSync(path.join(__dirname, "../_build/v20.js"), "utf8");
  ok("提示词没有这些原话", [reported, imagined, refused, "图钉", "海报", "画框", "换把锁", "摆摊", "磁带"].every(function (s) { return src.indexOf(s) < 0; }));
  var b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });

  async function open(input, out) {
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
    await p.evaluate(function (payload) {
      window.__lingcun20.armTransport(function (task, resolve) {
        window.__kinds = window.__kinds || [];
        window.__kinds.push(task.type);
        if (task.type === "v20_understand") resolve(payload);
        else resolve(null);
      });
    }, out);
    await p.click("#pk-start");
    await sleep(40);
    await p.click("#pk-type");
    await p.fill("#pk-idea", input);
    await p.evaluate(function () { document.querySelector("#pk-go").click(); });
    await sleep(500);
    return { ctx: ctx, p: p };
  }
  async function buckets(p) {
    return p.evaluate(function () {
      var out = {};
      document.querySelectorAll("#v20-mind p[data-voice]").forEach(function (el) {
        var ul = el.nextElementSibling;
        out[el.getAttribute("data-voice")] = ul ? ul.innerText : "";
      });
      return {
        buckets: out,
        ask: (document.querySelector("#v20-voice-ask") || {}).textContent || "",
        body: document.body.innerText.indexOf("带走的是你的") >= 0,
        kinds: window.__kinds || []
      };
    });
  }

  var a = await open(reported, { facts: [{ id: "f1", kind: "said", text: reported, start: 0, end: reported.length, speaker: "reported", modality: "certain" }], inferences: [], unknowns: [], advice: "offer" });
  var av = await buckets(a.p);
  ok("转述不在自述下", (av.buckets.reported || "").indexOf(reported) >= 0 && (av.buckets.self || "").indexOf(reported) < 0, JSON.stringify(av.buckets));
  ok("转述先问，不生成", av.ask.indexOf("你自己是这么想的吗") >= 0 && av.body === false && av.kinds.indexOf("v20_attempts") < 0, av.ask);
  await a.ctx.close();

  var h = await open(imagined, { facts: [{ id: "f1", kind: "said", text: imagined, start: 0, end: imagined.length, speaker: "self", modality: "hypothetical" }], inferences: [], unknowns: [], advice: "offer" });
  var hv = await buckets(h.p);
  ok("假设不在自述下", (hv.buckets.hypothetical || "").indexOf(imagined) >= 0 && (hv.buckets.self || "").indexOf(imagined) < 0, JSON.stringify(hv.buckets));
  ok("假设即使可以建议也先问", hv.ask.indexOf("你自己是这么想的吗") >= 0 && hv.body === false, hv.ask);
  await h.p.click("#v20-own-voice");
  await sleep(200);
  var label = await h.p.$eval(".sticker-label", function (e) { return e.textContent; });
  await h.p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await h.p.click(".v19-act-take", { force: true });
  await sleep(80);
  await h.p.click("#frag-go");
  await sleep(80);
  await h.p.click('[data-dir="body"]');
  await h.p.click("#dir-go");
  await sleep(200);
  var line = await h.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("确认后才生成，且不叫自述", line.indexOf(imagined) >= 0 && line.indexOf("确认过的") >= 0 && line.indexOf("自述") < 0, line);
  await h.ctx.close();

  var r = await open(refused, { facts: [{ id: "f1", kind: "said", text: refused, start: 0, end: refused.length, speaker: "self", modality: "refusal" }], inferences: [], unknowns: [], advice: "offer" });
  var rv = await buckets(r.p);
  ok("拒绝不在自述下", (rv.buckets.refusal || "").indexOf(refused) >= 0 && (rv.buckets.self || "").indexOf(refused) < 0, JSON.stringify(rv.buckets));
  ok("拒绝不能直接做成尝试", rv.body === false && rv.ask.indexOf("你自己是这么想的吗") >= 0, rv.ask);
  await r.ctx.close();

  var m = await open(mixed, {
    facts: [
      { id: "f1", kind: "said", text: pin, start: 0, end: pin.length, speaker: "self", modality: "certain" },
      { id: "f2", kind: "said", text: poster, start: pin.length + 1, end: pin.length + 1 + poster.length, speaker: "self", modality: "hypothetical" }
    ],
    inferences: [], unknowns: [], advice: "offer"
  });
  var mv = await buckets(m.p);
  ok("同段确定句留在自述", (mv.buckets.self || "").indexOf(pin) >= 0, JSON.stringify(mv.buckets));
  ok("同段假设句单独标出", (mv.buckets.hypothetical || "").indexOf("海报") >= 0 && (mv.buckets.self || "").indexOf("海报") < 0, JSON.stringify(mv.buckets));
  ok("有确定句时不先拿假设去问", mv.ask === "" && mv.body === false, mv.ask);
  await m.p.click('.v19-sticker[data-label="' + pin + '"] .sticker-btn', { force: true });
  await m.p.click(".v19-act-take", { force: true });
  await sleep(80);
  await m.p.click("#frag-go");
  await sleep(80);
  await m.p.click('[data-dir="craft"]');
  await m.p.click("#dir-go");
  await sleep(200);
  var mixedLine = await m.p.$eval("#try-line", function (e) { return e.textContent; }).catch(function () { return ""; });
  ok("尝试依据用确定句，不用假设句", mixedLine.indexOf(pin) >= 0 && mixedLine.indexOf("海报") < 0, mixedLine);
  await m.ctx.close();

  await b.close();
  ok("没有发出网页请求", net.length === 0, net.join(" "));
  console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
