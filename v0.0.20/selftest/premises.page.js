/* 断网打开页面，把候选送进同一条展示。不打中转。 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const URL = "file://" + path.resolve(__dirname, "../page/index.html");
const NET = [];
const R = [];
const ok = (name, cond, info) => {
  R.push([cond ? "PASS" : "FAIL", name, info === undefined ? "" : String(info)]);
  console.log(cond ? "PASS" : "FAIL", name, info === undefined ? "" : info);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.route("**/*", (route) => {
    const u = route.request().url();
    if (/^https?:/i.test(u)) { NET.push(u); return route.abort(); }
    return route.continue();
  });
  p.on("pageerror", (e) => ok("页面没有报错", false, e.message));
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await sleep(200);
  await p.click("#pk-start");
  await sleep(80);
  await p.click("#pk-type");
  await p.fill("#pk-idea", "我想观测流星，没有望远镜");
  await p.click("#pk-go");
  await sleep(200);
  await p.click('.v19-sticker[data-label="我想观测流星"] .sticker-btn', { force: true });
  await p.click(".v19-act-take");
  await sleep(80);
  await p.click("#frag-go");
  await sleep(120);
  await p.click('[data-dir="body"]');
  await p.click("#dir-go");
  await sleep(150);
  if (await p.$("#v20-want-advice")) { await p.click("#v20-want-advice"); await sleep(150); }
  const before = await p.$eval("#try-line", (e) => e.textContent);
  ok("整理句仍留着原话", /先不给做法/.test(before) && before.indexOf("带走的是你的") < 0, before);
  const injected = await p.evaluate(() => window.__lingcun20.applyCandidates([
    { text: "先架好望远镜", needs: [{ resource: "望远镜", key: true, claim: "have" }], uses: [] },
    { text: "今晚只抬头看两分钟", needs: [], uses: [] }
  ]));
  const shown = await p.$eval("#try-line", (e) => e.textContent);
  const note = await p.$eval("#premise-note", (e) => e.innerText);
  ok("架望远镜没有显示", shown.indexOf("望远镜") < 0 && shown.indexOf("抬头看") >= 0, shown);
  ok("页面记下拦住的前提", injected.premise.results[0].needs[0].status === "denied" && /望远镜/.test(note), note);
  const ask = await p.evaluate(() => window.__lingcun20.applyCandidates([
    { text: "租一艘观测船出海", needs: [{ resource: "观测船", key: true, claim: "have" }], uses: [] }
  ]));
  const q = await p.$eval("#premise-q", (e) => e.textContent);
  ok("缺条件只问一句", ask.premise.verdict === "clarify" && q.indexOf("观测船") >= 0 && q.indexOf("望远镜") < 0, q);
  await p.fill("#premise-in", "我有观测船");
  await p.click("#premise-answer");
  await sleep(150);
  const after = await p.evaluate(() => window.__lingcun20.record());
  const line = await p.$eval("#try-line", (e) => e.textContent);
  ok("回答写进当前记录并放行", after.facts.some((f) => f.text === "我有观测船" && f.sourceId === "premise") && line.indexOf("观测船") >= 0, line);
  const saved = await p.evaluate(() => {
    const raw = localStorage.getItem("lingcun_v010_state") || "";
    return raw;
  });
  ok("保存里有前提和未核实标记", /premise/.test(saved) && /verified/.test(saved));
  await p.reload();
  await sleep(250);
  const back = await p.evaluate(() => {
    const rec = window.__lingcun20.record();
    const line = document.querySelector("#try-line");
    return { has: rec && rec.facts.some((f) => f.text === "我有观测船"), line: line ? line.textContent : "" };
  });
  ok("重新打开还留着确认过的条件", back.has === true, JSON.stringify(back));
  await p.click("#try-edit");
  await p.fill("#try-in", "先架好望远镜");
  await p.click("#try-use");
  await sleep(150);
  const hand = await p.evaluate(() => ({
    line: document.querySelector("#try-line").textContent,
    note: document.querySelector("#premise-note").innerText,
    verified: (function () {
      const raw = localStorage.getItem(Object.keys(localStorage).filter((k) => /lingcun/.test(k) && /state|v0/.test(k))[0] || "") || "";
      return raw;
    })()
  }));
  ok("手写句子没有被改掉", hand.line === "先架好望远镜", hand.line);
  ok("手写只提示还没核实", /你写的/.test(hand.note) && /不能当成已经可行|还不能当成/.test(hand.note), hand.note);
  ok("这轮没有发出网页请求", NET.length === 0, NET.slice(0, 3).join(" "));
  await b.close();
  const bad = R.filter((x) => x[0] === "FAIL");
  fs.writeFileSync(path.join(__dirname, "result-premises.txt"), R.map((x) => x.join("\t")).join("\n") + "\n");
  console.log(bad.length ? "FAILED " + bad.length + "/" + R.length : "ALL_PASS " + R.length);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
