/* v0.0.18 自测。断网走完一局 + 桌面/手机首屏。
   node selftest18.js
   需要 playwright-core 与 /usr/bin/google-chrome */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const URL = "file://" + path.resolve(__dirname, "../page/index.html");
const OUT = path.join(__dirname);
fs.mkdirSync(OUT, { recursive: true });
const R = [];
const ok = (name, cond, info) => {
  R.push([cond ? "PASS" : "FAIL", name, info === undefined ? "" : String(info)]);
  console.log(cond ? "PASS" : "FAIL", name, info === undefined ? "" : info);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BAD = /存档|另存档|大突破|创造|学习技能|转行|四问|想做个什么|确认登月|按住确认/;

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
    acceptDownloads: true
  });
  const p = await ctx.newPage();
  p.errs = [];
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
const body = (p) => p.evaluate(() => document.body.innerText);
const inView = async (p, sel) => p.$eval(sel, (e) => {
  const r = e.getBoundingClientRect();
  return r.width > 8 && r.top >= -2 && r.bottom <= window.innerHeight + 2 && r.left >= -2 && r.right <= window.innerWidth + 2;
});

async function flow(p, tag) {
  ok(tag + " 首页主句", /如果保留过去的经验/.test(await text(p, "#h-pick")) && /花几分钟，给自己留一个新方向/.test(await body(p)));
  ok(tag + " 主按钮", (await text(p, "#pk-start")).trim() === "开始这一版");
  ok(tag + " 首页无胶囊无存档", !(await p.$("[data-act]")) && !/存档|创造|学习|转行/.test(await text(p, "#s-pick")));
  ok(tag + " 首页主按钮在首屏", await inView(p, "#pk-start"));
  await p.click("#pk-start");
  await sleep(200);
  if (tag === "桌面") {
    await shot(p, "desk_idea");
    const cols = await p.evaluate(() => {
      const l = document.querySelector(".pk-l").getBoundingClientRect();
      const r = document.querySelector(".pk-r").getBoundingClientRect();
      return { lx: l.x, rx: r.x, lw: l.width, rw: r.width };
    });
    ok("桌面带上过去左右两栏", cols.rx > cols.lx + 200 && cols.lw > 200 && cols.rw > 200, JSON.stringify(cols));
    ok("桌面打字在首屏", await inView(p, "#pk-type"));
  }
  ok(tag + " 带上过去双入口", (await p.$eval("#pk-seg", (e) => e.innerText)).includes("做过的事") && (await p.$eval("#pk-seg", (e) => e.innerText)).includes("想改的事"));
  ok(tag + " 默认做过的事", /办过线下活动策划/.test(await text(p, "#pk-exchips")));
  await p.click('[data-kind="want"]');
  await sleep(100);
  ok(tag + " 想改的事换例子", /想开始跑步/.test(await text(p, "#pk-exchips")) && !/办过线下活动策划/.test(await text(p, "#pk-exchips")));
  await p.click('[data-kind="did"]');
  await sleep(80);
  if (await p.$("#pk-type")) await p.click("#pk-type");
  await sleep(80);
  await p.fill("#pk-idea", "太短");
  await p.click("#pk-go");
  await sleep(120);
  ok(tag + " 太短不进下一屏", /多说一点具体的事/.test(await text(p, "#pk-err")) && await p.$eval("body", (b) => b.classList.contains("scr-idea")));
  await p.click('[data-exi="0"]');
  await sleep(120);
  ok(tag + " 例子填进输入框", /办过线下活动策划/.test(await p.$eval("#pk-idea", (e) => e.value)));
  await p.click("#pk-go");
  await sleep(250);
  ok(tag + " 进入留下与放下", /哪些想带走/.test(await text(p, "#h-material")) && !!(await p.$("#frag-go")));
  ok(tag + " 无四问骨架", !(await p.$("#deck")) && !/想做个什么|今天能拿出多久/.test(await text(p, "#s-material")));
  const chips = await p.$$eval(".frag .fn", (els) => els.map((e) => e.textContent));
  ok(tag + " 拆出带走候选", chips.indexOf("现场观察") >= 0 && chips.indexOf("讲故事") >= 0, chips.join(","));
  ok(tag + " 没带走不能选好", await p.$eval("#frag-go", (e) => e.disabled));
  await p.click(".frag .chipbtn.is-drop");
  await sleep(80);
  ok(tag + " 只放下仍不能完成", await p.$eval("#frag-go", (e) => e.disabled) && /至少带走一条|还没有/.test(await text(p, "#b-material")));
  await p.click('.chipbtn.is-keep[data-f="现场观察"]');
  await p.click('.chipbtn.is-keep[data-f="讲故事"]');
  await sleep(100);
  const bag = await text(p, "#frag-bags");
  ok(tag + " 背包写入带走", /背包/.test(bag) && /现场观察/.test(bag) && /讲故事/.test(bag));
  ok(tag + " 选好了在首屏", await inView(p, "#frag-go"));
  await p.click("#frag-go");
  await sleep(200);
  ok(tag + " 好奇方向六项", (await p.$$eval("#dir-chips button", (els) => els.map((e) => e.textContent))).join(",") === "表达,科技,身体,手作与现场,工作方式,其他");
  ok(tag + " 方向屏无旧大类", !/创造|学习|转行/.test(await text(p, "#s-draft")));
  ok(tag + " 未选不能继续", await p.$eval("#dir-go", (e) => e.disabled));
  await p.click('[data-dir="other"]');
  await sleep(80);
  ok(tag + " 其他要自填", await p.$eval("#dir-go", (e) => e.disabled));
  await p.fill("#dir-custom", "照料");
  await sleep(50);
  ok(tag + " 自填后可继续", !(await p.$eval("#dir-go", (e) => e.disabled)));
  await p.click('[data-dir="tech"]');
  await sleep(80);
  ok(tag + " 方向按钮在首屏", await inView(p, "#dir-go"));
  await p.click("#dir-go");
  await sleep(300);
  const line1 = await text(p, "#try-line");
  ok(tag + " 只有一条我想试试", /我想试试/.test(await text(p, "#b-check")) && /现场观察/.test(line1) && (await p.$$("#try-line")).length === 1);
  ok(tag + " 依据含带走和方向", /带走/.test(await text(p, "#try-basis")) && /科技/.test(await text(p, "#try-basis")));
  ok(tag + " 有点想试在首屏", await inView(p, "#try-yes"));
  const ed = await p.$eval("#en-ed", (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { h: r.height, w: r.width, bg: s.backgroundColor, fs: parseFloat(s.fontSize) };
  });
  ok(tag + " H1 改是小控件", ed.h <= 28 && ed.h >= 16 && ed.w <= 76 && ed.fs <= 12 && !/rgb\(42,\s*33,\s*82\)/.test(ed.bg), JSON.stringify(ed));
  await shot(p, tag + "_attempt");
  await p.click("#try-no");
  await sleep(150);
  const line2 = await text(p, "#try-line");
  ok(tag + " 不像我会换一句", line2 !== line1 && /已换一条/.test(await text(p, "#try-kicker")));
  await p.click("#try-no");
  await sleep(150);
  ok(tag + " 两次不像给出路", /换个方向|带走/.test(await text(p, "#try-stuck")) && (await text(p, "#try-no")).trim() === "换方向");
  await p.click("#try-edit");
  await sleep(80);
  await p.fill("#try-in", "用现场观察，写三句普通人怎么用一个小工具。");
  await p.click("#try-ai");
  await sleep(80);
  ok(tag + " 改一句失败有提示", /没能顺这句|还留着/.test(await text(p, "#try-err")));
  ok(tag + " 失败不清空", /用现场观察/.test(await p.$eval("#try-in", (e) => e.value)));
  await p.click("#try-use");
  await sleep(120);
  ok(tag + " 本地改句生效", /用现场观察，写三句/.test(await text(p, "#try-line")));
  await p.click("#try-yes");
  await sleep(250);
  ok(tag + " 一点即另存成功", /另存成功/.test(await text(p, "#ok-screen")) && /愿意尝试的方向/.test(await text(p, "#ok-screen")));
  ok(tag + " 无大突破无按住", !(await p.$("#lc-go")) && !/大突破|按住确认|登月/.test(await text(p, "#b-save")));
  const kaitu = await p.$eval("#kaitu", (e) => ({ t: e.innerText, tag: e.tagName, href: e.getAttribute("href"), onclick: !!e.onclick }));
  ok(tag + " 开图只是说明句", kaitu.tag === "P" && !kaitu.href && /去开图制定第一次尝试/.test(kaitu.t));
  ok(tag + " 开图不是按钮", (await p.$$eval("button, a", (els) => els.filter((e) => /开图|制定第一次尝试/.test(e.innerText)).map((e) => e.tagName + ":" + e.innerText))).length === 0);
  await shot(p, tag + "_ok");
  await p.click("#ok-share");
  await sleep(200);
  ok(tag + " 分享卡三字段和主问", /我想带走/.test(await text(p, "#share-card")) && /我想放下/.test(await text(p, "#share-card")) && /我想试试/.test(await text(p, "#share-card")) && /你会带走什么？/.test(await text(p, "#share-card")));
  const mini = await p.$eval("#share-card .mini", (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return { h: r.height, w: r.width, bg: s.backgroundColor };
  });
  ok(tag + " 分享编辑也是小控件", mini.h <= 28 && mini.w <= 76 && !/rgb\(42,\s*33,\s*82\)/.test(mini.bg), JSON.stringify(mini));
  await p.click('[data-hide="take"]');
  await sleep(120);
  const card = await text(p, "#share-card");
  const plain = await p.evaluate(() => window.__lingcun18.sharePlain());
  ok(tag + " 隐藏后卡片和文字都没有带走", !/我想带走/.test(card) && !/我想带走/.test(plain) && /我想试试/.test(plain) && /你会带走什么？/.test(plain));
  await p.click("#sc-share");
  await sleep(150);
  const copied = await p.$eval("#sc-text", (e) => e.value);
  ok(tag + " 可复制文字", /你会带走什么？/.test(copied) && !/github\.com/.test(copied));
  await shot(p, tag + "_share");
  await p.click("#share-back");
  await sleep(100);
  await p.click("#ok-map");
  await sleep(150);
  const map = await text(p, "#bag-body");
  ok(tag + " 星图记下这一版", /已留下|月球/.test(map) && !/存档/.test(map));
  ok(tag + " 星图不把背包当项目名", !/创造/.test(await p.$eval(".bc-n", (e) => e.textContent)));
  ok(tag + " 无页面报错", p.errs.length === 0, p.errs.join(" | "));
}

(async () => {
  const b = await launch();
  const phone = await page(b, { mobile: true, viewport: { width: 390, height: 844 } });
  await shot(phone, "phone_home");
  await flow(phone, "手机");
  await phone.ctx.close();

  const desk = await page(b, { mobile: false, viewport: { width: 1280, height: 720 } });
  await shot(desk, "desk_home");
  ok("桌面首页主按钮在首屏", await inView(desk, "#pk-start"));
  await flow(desk, "桌面");
  await desk.ctx.close();

  const weak = await page(b, { mobile: true });
  await weak.click("#pk-start");
  await sleep(150);
  if (await weak.$("#pk-type")) await weak.click("#pk-type");
  await weak.fill("#pk-idea", "嗯嗯嗯嗯嗯嗯");
  await weak.click("#pk-go");
  await sleep(200);
  ok("拆不出给示例和退路", !!(await weak.$("#frag-weak")) && !!(await weak.$("#frag-back")) && !!(await weak.$("#own-take")));
  await weak.click("#frag-back");
  await sleep(150);
  ok("不像我回到带上过去", await weak.$eval("body", (el) => el.classList.contains("scr-idea")));
  ok("弱路径无报错", weak.errs.length === 0, weak.errs.join(" | "));
  await weak.ctx.close();

  const bad = R.filter((x) => x[0] === "FAIL");
  fs.writeFileSync(path.join(OUT, "result_all.txt"), R.map((x) => x.join("\t")).join("\n") + "\n");
  console.log(bad.length ? "FAILED " + bad.length + "/" + R.length : "ALL_PASS " + R.length);
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
