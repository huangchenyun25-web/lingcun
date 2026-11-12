/* v0.0.20 连续性与三处界面。
   碎片必须是原话的连续分句。词库、方向词、上一句、没带来源的公共例子都不能混进来。
   node selftest20.js
   需要 playwright-core 与 /usr/bin/google-chrome。流程断网。 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const URL = "file://" + path.resolve(__dirname, "../page/index.html");
const OUT = __dirname;
const R = [];
const NET = [];
const EXAMPLES = [];
const ok = (name, cond, info) => {
  R.push([cond ? "PASS" : "FAIL", name, info === undefined ? "" : String(info)]);
  console.log(cond ? "PASS" : "FAIL", name, info === undefined ? "" : info);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FILLER = ["现场观察", "讲故事", "活动策划", "反复汇报", "协调供应商", "带团队", "做内容", "写公众号", "练过吉他", "后来搁下了", "想跑步", "迈不出第一步", "老是往后放", "对科技好奇", "带新人", "写复盘", "熬夜改稿", "跑客户", "做预算", "主持活动", "拍短视频", "整理数据", "研究用户", "开周会", "追热点", "记笔记", "照顾人", "做饭", "修东西", "拍照", "翻译", "教别人", "想开始的那件事", "早起写信", "表达", "科技", "身体", "手作与现场", "工作方式", "其他"];
const MANY = "喂过猫，浇过花，写过信，修过灯，煮过面，拍过照，教过画，记过账，跑过步，译过书";

function leaked(list, src) {
  return FILLER.filter((w) => list.indexOf(w) >= 0 && String(src).indexOf(w) < 0);
}

async function launch() {
  return chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-gpu"] });
}
async function page(b, o) {
  o = o || {};
  const mobile = o.mobile !== false;
  const ctx = await b.newContext({
    viewport: o.viewport || (mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 }),
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: o.reduced ? "reduce" : "no-preference"
  });
  if (o.speech) {
    await ctx.addInitScript(() => {
      window.__say = "上周在阳台种了三盆薄荷，周末想做成茶";
      function SR() {}
      SR.prototype.start = function () {};
      SR.prototype.stop = function () {
        var t = window.__say || "";
        if (this.onresult) this.onresult({ results: [{ isFinal: true, 0: { transcript: t } }] });
        if (this.onend) this.onend();
      };
      window.SpeechRecognition = SR;
      window.webkitSpeechRecognition = SR;
    });
  }
  const p = await ctx.newPage();
  p.errs = [];
  p.net = [];
  await p.route("**/*", (route) => {
    const u = route.request().url();
    if (/^https?:/i.test(u)) { p.net.push(u); NET.push(u); return route.abort(); }
    return route.continue();
  });
  p.on("pageerror", (e) => p.errs.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR|Failed to load resource|CORS policy|origin 'null'/.test(m.text())) p.errs.push("console: " + m.text());
  });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await sleep(200);
  if (o.offline !== false) await ctx.setOffline(true);
  p.ctx = ctx;
  return p;
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + ".png") });
const text = (p, sel) => p.$eval(sel, (e) => e.innerText);
const labels = (p) => p.$$eval(".sticker-label", (els) => els.map((e) => e.textContent));

async function typeIdea(p, idea) {
  if (await p.$("#pk-start")) await p.click("#pk-start");
  await sleep(120);
  if (await p.$("#pk-type")) await p.click("#pk-type");
  await sleep(40);
  await p.fill("#pk-idea", idea);
  await p.click("#pk-go");
  await sleep(250);
}
async function place(p, label, set) {
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await sleep(40);
  await p.click(set === "leave" ? ".v19-act-leave" : ".v19-act-take");
  await sleep(80);
}

(async () => {
  const b = await launch();
  const probe = await page(b, { mobile: true });
  const cases = await probe.evaluate(() => {
    const f = window.__lingcun20.fragments;
    const rows = [
      ["标点两句", "刚刚去景德镇做了几个盘子，想写一个跟五大名窑相…"],
      ["未见过的说法", "以前做过几场线下的活动，也在现场讲过故事"],
      ["混着好几件事", "会修自行车，但讨厌每天加班，想试试周末摆摊"],
      ["另一件不相干的事", "上周在阳台种了三盆薄荷，周末想做成茶"],
      ["十个短句", "喂过猫，浇过花，写过信，修过灯，煮过面，拍过照，教过画，记过账，跑过步，译过书"],
      ["太长又没有连词", "我把去年没写完的那篇长笔记又从头到尾看了一遍还是没决定要不要发出去"],
      ["短而含糊", "想换一种"],
      ["重复字", "嗯嗯嗯嗯嗯嗯"],
      ["空", ""]
    ];
    return rows.map((pair) => {
      const g = f(pair[1]);
      return { name: pair[0], idea: pair[1], list: g.list, weak: g.weak };
    });
  });
  const expect = {
    "标点两句": ["刚刚去景德镇做了几个盘子", "想写一个跟五大名窑相…"],
    "未见过的说法": ["以前做过几场线下的活动", "也在现场讲过故事"],
    "混着好几件事": ["会修自行车", "但讨厌每天加班", "想试试周末摆摊"],
    "另一件不相干的事": ["上周在阳台种了三盆薄荷", "周末想做成茶"],
    "十个短句": MANY.split("，"),
    "太长又没有连词": ["我把去年没写完的那篇长笔记又从头到尾看了一遍还是没决定要不要发出去"],
    "短而含糊": ["想换一种"],
    "重复字": ["嗯嗯嗯嗯嗯嗯"],
    "空": []
  };
  cases.forEach((c) => {
    const want = expect[c.name];
    const leak = leaked(c.list, c.idea);
    const sub = c.list.every((w) => c.idea.indexOf(w) >= 0);
    ok("分句 " + c.name, c.list.join("|") === want.join("|") && leak.length === 0 && sub && c.weak === (c.list.length < 2), c.list.join("|") + (leak.length ? " LEAK " + leak.join(",") : ""));
    EXAMPLES.push(c.name + "\n  输入：" + (c.idea || "（空）") + "\n  碎片：" + (c.list.join(" / ") || "（没有）") + "\n  需要补一句：" + (c.weak ? "是" : "否"));
  });
  const ev = await probe.evaluate(() => {
    const api = window.__lingcun20;
    const before = api.fragments("喂过猫，浇过花").list.join(",");
    const kept = api.setEvidence([
      { id: "x", text: "大厂员工想辞职", source: "https://example.com/note" },
      { text: "没有来源就不该收下" }
    ]);
    const after = api.fragments("喂过猫，浇过花").list.join(",");
    return { before: before, after: after, n: kept.length, source: kept[0] && kept[0].source };
  });
  ok("带来源的公共例子不改原话", ev.before === "喂过猫,浇过花" && ev.after === ev.before && ev.n === 1 && /example\.com/.test(ev.source || ""), JSON.stringify(ev));
  await probe.ctx.close();

  async function homeLook(p, tag) {
    await shot(p, tag + "_首页");
    const box = await p.evaluate(() => {
      const r = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const b = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height, fs: parseFloat(s.fontSize), bg: s.backgroundColor, shadow: s.boxShadow };
      };
      const h = r("#h-pick"), btn = r("#pk-start"), brand = r(".brand"), rule = r(".rule"), sub = r(".v18sub");
      const gap = btn.top - sub.bottom;
      return {
        h: h, btn: btn, brand: brand, rule: rule, gap: gap,
        vw: window.innerWidth, vh: window.innerHeight,
        wide: document.documentElement.scrollWidth <= window.innerWidth + 1,
        title: document.querySelector("#h-pick").innerText.replace(/\s+/g, "")
      };
    });
    const inView = (n) => n && n.top >= -1 && n.bottom <= box.vh + 1 && n.left >= -1 && n.right <= box.vw + 1;
    ok(tag + " 标题在首屏且没被裁切", inView(box.h) && box.h.fs <= 31 && box.h.fs >= 20, JSON.stringify(box.h));
    ok(tag + " 开始这一版在首屏", inView(box.btn) && box.gap > 4 && box.gap < 80, "gap=" + box.gap);
    ok(tag + " 品牌不是小色块，分隔线不横贯", box.brand.w > 72 && (box.brand.bg === "rgba(0, 0, 0, 0)" || box.brand.shadow === "none") && box.rule.w < 120 && box.rule.w > 40, JSON.stringify({ brand: box.brand, rule: box.rule }));
    ok(tag + " 标题原文还在", box.title.indexOf("如果保留过去的经验，换一种接下来的生活，你想试试什么？") >= 0, box.title);
    ok(tag + " 首页没有横向溢出", box.wide);
  }

  const phone = await page(b, { mobile: true, viewport: { width: 390, height: 844 }, speech: true });
  await homeLook(phone, "手机");
  await phone.click("#pk-start");
  await sleep(150);
  await shot(phone, "手机_说话");
  const gram = await phone.evaluate(() => {
    const btn = document.querySelector("#vz-btn");
    const svg = btn && btn.querySelector("svg");
    const s = btn ? getComputedStyle(btn) : null;
    return {
      label: btn && btn.getAttribute("aria-label"),
      gram: !!(svg && svg.classList.contains("gram")),
      eyes: !!(svg && /M99 112|vz-core/.test(svg.innerHTML)),
      bg: s && s.backgroundColor,
      shadow: s && s.boxShadow
    };
  });
  ok("手机留声机按钮", gram.gram && !gram.eyes && /按住说话/.test(gram.label || "") && gram.bg === "rgba(0, 0, 0, 0)", JSON.stringify(gram));
  await phone.click("#pk-type");
  await sleep(40);
  await phone.click('[data-exi="0"]');
  await sleep(40);
  await phone.fill("#pk-idea", "会修自行车，但讨厌每天加班，想试试周末摆摊");
  await phone.click("#pk-go");
  await sleep(250);
  const bike = await labels(phone);
  ok("改掉例子后不再留下例子", bike.join(",") === "会修自行车,但讨厌每天加班,想试试周末摆摊", bike.join(","));
  ok("例子句没有漏进这一屏", bike.indexOf("办过线下活动策划") < 0 && leaked(bike, bike.join("")).length === 0);
  await shot(phone, "手机_留下_原话");
  await place(phone, "但讨厌每天加班", "leave");
  await place(phone, "会修自行车", "take");
  await phone.click("#frag-go");
  await sleep(180);
  await phone.click('[data-dir="body"]');
  await phone.click("#dir-go");
  await sleep(150);
  if (await phone.$("#v20-want-advice")) { await phone.click("#v20-want-advice"); await sleep(150); }
  const line = await text(phone, "#try-line");
  ok("尝试引用带走的原话", /先不给做法/.test(line) && line.indexOf("带走的是你的") < 0 && line.indexOf("擅长") < 0 && line.indexOf("现场观察") < 0 && (await text(phone, "#try-basis")).indexOf("会修自行车") >= 0, line);
  await phone.click("#try-yes");
  await sleep(250);
  await shot(phone, "手机_另存成功");
  const saved = await phone.evaluate(() => {
    const s = document.querySelector("#ok-screen");
    const mark = document.querySelector(".okmark");
    const review = document.querySelector("#ok-review");
    const mr = mark.getBoundingClientRect();
    const rr = review.getBoundingClientRect();
    const bg = getComputedStyle(s).backgroundColor;
    return {
      text: s.innerText,
      mark: mr.width,
      reviewIn: rr.top >= 0 && rr.bottom <= window.innerHeight && rr.height >= 36,
      bg: bg,
      tag: document.querySelector("#kaitu").tagName
    };
  });
  ok("另存成功写出方向和这一步", /另存成功/.test(saved.text) && /方向是「身体」/.test(saved.text) && /先不给做法/.test(saved.text) && /看这一版/.test(saved.text), saved.text.replace(/\n/g, " / "));
  ok("成功标记是小的，看这一版在屏内", saved.mark <= 80 && saved.mark >= 48 && saved.reviewIn && saved.tag === "P", JSON.stringify(saved));
  ok("成功页底是奶油不是发光圆", saved.bg === "rgb(247, 240, 223)");
  EXAMPLES.push("走完一局 · 打字 · 断网整理\n  输入：会修自行车，但讨厌每天加班，想试试周末摆摊\n  碎片：" + bike.join(" / ") + "\n  带走：会修自行车；放下：但讨厌每天加班；方向：身体\n  尝试：" + line);
  await phone.click("#ok-share");
  await sleep(120);
  ok("分享仍是这一句", /先不给做法/.test(await text(phone, "#share-card")) && (await text(phone, "#share-card")).indexOf("会修自行车") >= 0);
  ok("手机这局无报错", phone.errs.length === 0, phone.errs.join(" | "));
  await phone.ctx.close();

  const desk = await page(b, { mobile: false, viewport: { width: 1280, height: 720 }, speech: true });
  await homeLook(desk, "桌面");
  await desk.click("#pk-start");
  await sleep(150);
  await shot(desk, "桌面_说话");
  const dgram = await desk.evaluate(() => {
    const svg = document.querySelector("#vz-btn svg");
    const l = document.querySelector(".pk-l").getBoundingClientRect();
    const r = document.querySelector(".pk-r").getBoundingClientRect();
    return { gram: !!(svg && svg.classList.contains("gram")), gap: r.x - (l.x + l.width) };
  });
  ok("桌面留声机仍在左栏", dgram.gram && dgram.gap > 40, JSON.stringify(dgram));
  await desk.click("#pk-type");
  await desk.fill("#pk-idea", "上周在阳台种了三盆薄荷，周末想做成茶");
  await desk.click("#pk-go");
  await sleep(250);
  const bal = await labels(desk);
  ok("桌面另一输入只留原话", bal.join(",") === "上周在阳台种了三盆薄荷,周末想做成茶", bal.join(","));
  await place(desk, "上周在阳台种了三盆薄荷", "take");
  await desk.click("#frag-go");
  await sleep(150);
  await desk.click('[data-dir="craft"]');
  await desk.click("#dir-go");
  await sleep(150);
  if (await desk.$("#v20-want-advice")) { await desk.click("#v20-want-advice"); await sleep(150); }
  const line2 = await text(desk, "#try-line");
  ok("第二局尝试仍引用原话", /先不给做法/.test(line2) && line2.indexOf("会修自行车") < 0 && (await text(desk, "#try-basis")).indexOf("上周在阳台种了三盆薄荷") >= 0, line2);
  await desk.click("#try-yes");
  await sleep(200);
  await shot(desk, "桌面_另存成功");
  const dok = await text(desk, "#ok-screen");
  ok("桌面成功页对得上这一局", /手作与现场/.test(dok) && /先不给做法/.test(dok) && !/会修自行车/.test(dok), dok.replace(/\n/g, " / "));
  EXAMPLES.push("走完一局 · 打字\n  输入：上周在阳台种了三盆薄荷，周末想做成茶\n  碎片：" + bal.join(" / ") + "\n  带走：上周在阳台种了三盆薄荷；方向：手作与现场\n  尝试：" + line2);
  ok("桌面这局无报错", desk.errs.length === 0, desk.errs.join(" | "));
  await desk.ctx.close();

  async function batch(p, tag) {
    await typeIdea(p, MANY);
    const first = await labels(p);
    ok(tag + " 多于 8 条时先显示 8 张", first.length === 8 && first.every((w) => MANY.indexOf(w) >= 0) && leaked(first, MANY).length === 0, first.join(","));
    await shot(p, tag + "_留下_换一批前");
    await p.click("#frag-swap");
    await sleep(80);
    const second = await labels(p);
    const overlap = second.filter((w) => first.indexOf(w) >= 0);
    ok(tag + " 换一批仍在原话里", second.length === 2 && overlap.length === 0 && second.every((w) => MANY.indexOf(w) >= 0), second.join(","));
    await shot(p, tag + "_留下_换一批");
  }
  const bphone = await page(b, { mobile: true, viewport: { width: 390, height: 844 } });
  await batch(bphone, "手机");
  ok("手机换一批无报错", bphone.errs.length === 0, bphone.errs.join(" | "));
  await bphone.ctx.close();
  const bdesk = await page(b, { mobile: false, viewport: { width: 1280, height: 720 } });
  await batch(bdesk, "桌面");
  ok("桌面换一批无报错", bdesk.errs.length === 0, bdesk.errs.join(" | "));
  await bdesk.ctx.close();

  const weak = await page(b, { mobile: true });
  await typeIdea(weak, "我把去年没写完的那篇长笔记又从头到尾看了一遍还是没决定要不要发出去");
  const wlabs = await labels(weak);
  const wbody = await weak.evaluate(() => document.body.innerText);
  ok("长句整句留下，不拆成词库", wlabs.length === 1 && wlabs[0].indexOf("长笔记") >= 0 && wlabs[0].indexOf("现场观察") < 0 && !/下面是示例/.test(wbody), wlabs.join(","));
  ok("太长时可以自己加", await weak.$eval("#v19-more", (e) => !e.hidden));
  await weak.ctx.close();

  const stale = await page(b, { mobile: true });
  await stale.evaluate(() => {
    const idea = "上周在阳台种了三盆薄荷，周末想做成茶";
    const state = {
      v: "0.0.19", t: 1, stage: "material", cur: 0,
      entry: { mode: "", act: "", idea: "办过线下活动策划，负责现场和讲故事", kind: "did", bg: { weekly: "", keep: "", avoid: "" }, situation: "", goal: "", small: false },
      projects: [{
        id: 99, cat: "generic", idea: idea, title: "旧", stage: "material", paused: false, landed: false, createdAt: 1, updatedAt: 1,
        v18: {
          kind: "did", weak: true,
          fragments: ["现场观察", "讲故事", "活动策划", "反复汇报"],
          pick: { "现场观察": "take" }, take: ["现场观察"], leave: ["协调供应商"], custom: [],
          board: { seq: ["现场观察", "讲故事", "协调供应商", "带团队", "做内容", "写公众号", "活动策划", "反复汇报"], cursor: 0, bubble: ["讲故事", "活动策划", "反复汇报", "协调供应商", "带团队", "做内容", "写公众号", "练过吉他"] }
        }
      }],
      ask: { q: "", stage: "", resolved: true, a: null },
      match: { dir: null, desc: "", items: {}, open: "" }, nextGoal: "", gh: {}
    };
    localStorage.setItem("lingcun_v010_state", JSON.stringify(state));
  });
  await stale.reload();
  await sleep(250);
  if (await stale.$("#rs-go")) await stale.click("#rs-go");
  await sleep(200);
  const oldLabs = await labels(stale);
  const oldBody = await stale.evaluate(() => document.body.innerText);
  ok("旧档里的词库不再当成用户的话", oldLabs.join(",") === "上周在阳台种了三盆薄荷,周末想做成茶" && oldBody.indexOf("现场观察") < 0 && oldBody.indexOf("办过线下活动策划") < 0, oldLabs.join(","));
  ok("旧档无报错", stale.errs.length === 0, stale.errs.join(" | "));
  await stale.ctx.close();

  const talk = await page(b, { mobile: true, speech: true });
  await talk.click("#pk-start");
  await sleep(150);
  const box = await talk.locator("#vz-btn").boundingBox();
  await talk.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await talk.mouse.down();
  await sleep(700);
  await talk.mouse.up();
  await sleep(300);
  const heard = await talk.evaluate(() => {
    const z = document.querySelector("#vz");
    const ta = document.querySelector("#vz-text");
    return { st: z && z.getAttribute("data-st"), text: ta ? ta.value : "" };
  });
  ok("松手后能改识别文字", heard.st === "done" && /薄荷/.test(heard.text || ""), JSON.stringify(heard));
  await talk.click("#vz-ok");
  await sleep(300);
  const said = await labels(talk);
  ok("说话走同一条原话", said.join(",") === "上周在阳台种了三盆薄荷,周末想做成茶", said.join(","));
  EXAMPLES.push("走完到碎片 · 按住说话（测试里用浏览器语音的替身，不连识别服务）\n  输入：上周在阳台种了三盆薄荷，周末想做成茶\n  碎片：" + said.join(" / "));
  ok("说话路径无报错", talk.errs.length === 0, talk.errs.join(" | "));
  await talk.ctx.close();

  const still = await page(b, { mobile: true, reduced: true, speech: true });
  await still.click("#pk-start");
  await sleep(120);
  const anim = await still.evaluate(() => {
    const z = document.querySelector("#vz");
    z.setAttribute("data-st", "rec");
    const disc = document.querySelector(".g-disc");
    return { name: getComputedStyle(disc).animationName, label: document.querySelector("#vz-btn").getAttribute("aria-label") };
  });
  ok("减少动态效果时唱片不转", anim.name === "none" && /按住说话/.test(anim.label || ""), anim.name);
  await still.ctx.close();

  const resign = await page(b, { mobile: true });
  await resign.click("#pk-start");
  await sleep(80);
  await resign.click("#pk-type");
  await sleep(40);
  await resign.fill("#pk-idea", "我想离职，钱够半年，也确认不想留在这行业");
  await resign.click("#pk-go");
  await sleep(250);
  const view = await resign.evaluate(() => window.__lingcun20.record());
  const intent = (view && view.intents || []).map((x) => x.text + "/" + x.polarity).sort().join("|");
  const constraint = (view && view.constraints || []).map((x) => x.text).join("|");
  ok("页面读的是同一份状态", intent === "也确认不想留在这行业/dont|我想离职/want" && constraint === "钱够半年" && (view.facts || []).length === 0 && (view.unknowns || []).length === 0 && (view.inferences || []).length === 0, JSON.stringify(view));
  const shown = await labels(resign);
  ok("贴纸只来自当前事实和意愿", shown.slice().sort().join("|") === ["我想离职", "钱够半年", "也确认不想留在这行业"].sort().join("|"), shown.join("|"));
  await resign.ctx.close();
  ok("这轮没有发出任何网页请求", NET.length === 0, NET.slice(0, 4).join(" "));
  await b.close();
  fs.writeFileSync(path.join(OUT, "examples20.txt"), EXAMPLES.join("\n\n") + "\n");
  fs.writeFileSync(path.join(OUT, "result20.txt"), R.map((x) => x.join("\t")).join("\n") + "\n");
  const bad = R.filter((x) => x[0] === "FAIL");
  console.log(bad.length ? "FAILED " + bad.length + "/" + R.length : "ALL_PASS " + R.length);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
