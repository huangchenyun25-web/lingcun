/* 断网。用测试传输把乱序结果送进正式回调。不打中转。 */
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
const pack = (text) => ({ attempts: [
  { text: text, why: "依据原话", observe: "看见了", stop: "累了就停", uses: ["x"], needs: [] },
  { text: "只把原话留在纸上", why: "依据原话", observe: "写下了", stop: "不想写就停", uses: ["x"], needs: [] }
] });

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
  await p.evaluate(() => {
    window.__q = [];
    window.__lingcun20.armTransport((task, resolve) => { window.__q.push({ type: task.type, resolve: resolve }); });
  });
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
  await sleep(80);
  await p.click('[data-dir="body"]');
  await p.click("#dir-go");
  await sleep(150);
  if (await p.$("#v20-want-advice")) { await p.click("#v20-want-advice"); await sleep(150); }

  async function toDraft() {
    await p.click("#try-no");
    await sleep(80);
    await p.click("#try-no");
    await sleep(80);
    await p.click("#try-no");
    await sleep(120);
  }
  await toDraft();
  await p.click('[data-dir="express"]');
  await p.click("#dir-go");
  await sleep(150);
  await toDraft();
  await p.click('[data-dir="body"]');
  await p.click("#dir-go");
  await sleep(200);

  const beforeLate = await p.$eval("#try-line", (e) => e.textContent);
  await p.evaluate((payload) => {
    const list = window.__q.filter((x) => x.type === "v20_attempts");
    list[0].used = true;
    list[0].resolve(payload);
  }, pack("迟到候选甲"));
  await sleep(200);
  const afterLate = await p.$eval("#try-line", (e) => e.textContent);
  const late = await p.evaluate(() => window.__lingcun20.late());
  ok("迟到的候选没有盖住当前", afterLate.indexOf("迟到候选甲") < 0 && afterLate === beforeLate, afterLate);
  ok("迟到被记成旧序号", late.some((x) => /stale|older|superseded|hand/.test(x.reason)), JSON.stringify(late));

  await p.click("#try-yes");
  await sleep(150);
  const blocked = await p.evaluate(() => ({ note: (document.querySelector("#save-note") || {}).textContent || "", stage: document.body.className, landed: window.__lingcun20.frozen().landed }));
  ok("还在等时没有把旧动作存成新版本", /还在等这一版/.test(blocked.note) && blocked.landed === false, JSON.stringify(blocked));

  await p.evaluate((payload) => {
    const rec = window.__lingcun20.record();
    const id = (rec.intents[0] || rec.constraints[0] || rec.facts[0]).id;
    payload.attempts.forEach((a) => { a.uses = [id]; });
    const list = window.__q.filter((x) => x.type === "v20_attempts" && !x.used);
    const last = list[list.length - 1];
    last.used = true;
    last.resolve(payload);
    window.__q.forEach((x) => { if (x.type === "v18_attempt" && !x.used) { x.used = true; x.resolve(null); } });
  }, pack("当前候选乙"));
  await sleep(250);
  const shown = await p.$eval("#try-line", (e) => e.textContent);
  ok("当前这一版的候选写上了", shown.indexOf("当前候选乙") >= 0, shown);

  await p.evaluate((payload) => {
    const list = window.__q.filter((x) => x.type === "v20_attempts");
    list[0].resolve(payload);
  }, pack("迟到候选甲"));
  await sleep(150);
  ok("同一条迟到结果再来一次仍盖不住", (await p.$eval("#try-line", (e) => e.textContent)).indexOf("当前候选乙") >= 0);

  await p.click("#try-edit");
  await p.fill("#try-in", "我手写的一步");
  await p.click("#try-use");
  await sleep(150);
  await p.evaluate((payload) => {
    window.__q.filter((x) => !x.used).forEach((x) => { x.used = true; x.resolve(x.type === "v20_attempts" ? payload : null); });
  }, pack("模型盖写"));
  await sleep(200);
  ok("手写期间模型没有覆写", await p.$eval("#try-line", (e) => e.textContent) === "我手写的一步");

  await toDraft();
  await p.click('[data-dir="express"]');
  await p.click("#dir-go");
  await sleep(200);
  const draft = await p.$eval("#hand-draft", (e) => e.textContent).catch(() => "");
  const line = await p.$eval("#try-line", (e) => e.textContent);
  ok("换方向后手写留成失效草稿", draft.indexOf("我手写的一步") >= 0 && line.indexOf("我手写的一步") < 0, draft + " / " + line);

  await p.evaluate(() => { window.__q.forEach((x) => { if (!x.used) { x.used = true; x.resolve(null); } }); });
  await sleep(100);
  await p.click("#try-yes");
  await sleep(200);
  await p.click("#ok-share");
  await sleep(150);
  const shared = await p.$eval("#share-card", (e) => e.innerText);
  const frozen = await p.evaluate(() => window.__lingcun20.frozen());
  ok("分享和保存是确认下来的那一句", shared.indexOf(frozen.frozen.attempt) >= 0 && frozen.frozen.attempt.indexOf("我手写的一步") < 0, frozen.frozen.attempt);

  const snap = frozen.frozen.attempt;
  await p.click("#share-back");
  await sleep(80);
  await p.click("#ok-review");
  await sleep(150);
  await p.click("#try-edit");
  await p.fill("#try-in", "后来改的一句");
  await p.click("#try-use");
  await sleep(100);
  await p.evaluate(() => { document.querySelector("#menu-btn").click(); document.querySelector("#menu-home").click(); });
  await sleep(400);
  const kept = await p.evaluate(() => {
    const projects = JSON.parse(localStorage.getItem("lingcun_v010_state")).projects;
    const saved = projects.filter((x) => x.frozen)[0];
    return { frozen: saved.frozen.attempt, snaps: (saved.savedSnaps || []).map((s) => s.attempt) };
  });
  ok("后来的修改没有追改已保存的那一版", kept.frozen === snap, JSON.stringify(kept));

  await p.click("#pk-start");
  await sleep(300);
  if (await p.locator("#pk-type").isVisible()) await p.click("#pk-type");
  await p.fill("#pk-idea", "我想听雨");
  await p.click("#pk-go");
  await sleep(200);
  const leaked = await p.evaluate(() => JSON.stringify(window.__lingcun20.record() || {}).indexOf("当前候选乙") >= 0);
  ok("新的一局没有带上上一局的候选", leaked === false);

  const bound = await p.evaluate(() => {
    const projects = JSON.parse(localStorage.getItem("lingcun_v010_state")).projects;
    const saved = projects.filter((x) => x.frozen)[0];
    return saved.v18 && saved.v18.lastBound;
  });
  await p.reload();
  await sleep(250);
  const restored = await p.evaluate((old) => {
    const projects = JSON.parse(localStorage.getItem("lingcun_v010_state")).projects;
    const saved = projects.filter((x) => x.frozen)[0];
    return { attempt: saved.frozen.attempt, gate: old ? window.__lingcun20.acceptBound(old) : { ok: false, reason: "no-bound" } };
  }, bound);
  ok("刷新后保存的那一版还在，旧请求对不上", restored.attempt === snap && restored.gate.ok === false && /reloaded|other-project|stale/.test(restored.gate.reason), JSON.stringify(restored));
  ok("这轮没有发出网页请求", NET.length === 0, NET.slice(0, 3).join(" "));
  await b.close();
  const bad = R.filter((x) => x[0] === "FAIL");
  fs.writeFileSync(path.join(__dirname, "result-epoch.txt"), R.map((x) => x.join("\t")).join("\n") + "\n");
  console.log(bad.length ? "FAILED " + bad.length + "/" + R.length : "ALL_PASS " + R.length);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
