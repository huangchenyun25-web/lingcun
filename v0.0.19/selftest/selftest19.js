/* v0.0.19 自测。像素蓝奶油 + 留下与放下拖拽 + 8 张 / 换一批。
   node selftest19.js
   需要 playwright-core 与 /usr/bin/google-chrome。断网。 */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const URL = "file://" + path.resolve(__dirname, "../page/index.html");
const OUT = __dirname;
const R = [];
const ok = (name, cond, info) => {
  R.push([cond ? "PASS" : "FAIL", name, info === undefined ? "" : String(info)]);
  console.log(cond ? "PASS" : "FAIL", name, info === undefined ? "" : info);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function parseRgb(s) {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s || "");
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function contrast(a, b) {
  if (!a || !b) return 0;
  const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const la = L(a), lb = L(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
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
    acceptDownloads: true,
    reducedMotion: o.reduced ? "reduce" : "no-preference"
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
async function enterIdea(p) {
  await p.click("#pk-start");
  await sleep(150);
  if (await p.$("#pk-type")) await p.click("#pk-type");
  await sleep(40);
}
async function toMaterial(p, idea) {
  await enterIdea(p);
  await p.fill("#pk-idea", idea || "办过线下活动策划，负责现场和讲故事");
  await p.click("#pk-go");
  await sleep(250);
}
async function labels(p) {
  return p.$$eval(".sticker-label", (els) => els.map((e) => e.textContent));
}
async function openSticker(p, label) {
  await p.click('.v19-sticker[data-label="' + label + '"] .sticker-btn', { force: true });
  await sleep(50);
}
async function placeTap(p, label, set) {
  await openSticker(p, label);
  await p.click(set === "leave" ? ".v19-act-leave" : ".v19-act-take");
  await sleep(80);
}

(async () => {
  const build = execSync("sh ../_build/build.sh nofonts", { cwd: __dirname, encoding: "utf8" });
  ok("构建 BUILD_OK", /BUILD_OK/.test(build) && /PALETTE_OK/.test(build), build.trim().split("\n").slice(-3).join(" | "));

  const html = fs.readFileSync(path.join(__dirname, "../page/index.html"), "utf8");
  ok("无旧色板", !/#F3F0F9|#C9B8F5|#231C45|#2A2152/i.test(html));
  ok("无旧 rgba", !/rgba?\(\s*243\s*,\s*240\s*,\s*249|rgba?\(\s*201\s*,\s*184\s*,\s*245|rgba?\(\s*35\s*,\s*28\s*,\s*69|rgba?\(\s*42\s*,\s*33\s*,\s*82/i.test(html));
  ok("无毛玻璃无 blur()", !/backdrop-filter/i.test(html) && !/blur\s*\(/i.test(html));
  ["--bg:#5E72B5", "--bg-d:#4A5C9B", "--cream:#F7F0DF", "--cream-d:#E9DDBF", "--cream-hi:#FFFBF1", "--ink:#232B55"].forEach((t) => {
    ok("色板记号 " + t, html.indexOf(t) >= 0);
  });

  const b = await launch();

  const probe = await page(b, { mobile: true });
  const cand = await probe.evaluate(() => {
    const api = window.__lingcun19;
    const normal = api.buildCandidates({ idea: "办过线下活动策划，负责现场和讲故事" });
    const weak = api.buildCandidates({ idea: "嗯嗯嗯嗯嗯嗯" });
    const empty = api.buildCandidates({ idea: "" });
    const uniq = (a) => a.length === new Set(a).size;
    const short = (a) => a.every((w) => w.length >= 2 && w.length <= 8);
    return {
      n: normal.length, w: weak.length, e: empty.length,
      nu: uniq(normal), wu: uniq(weak), eu: uniq(empty),
      ns: short(normal), ws: short(weak), es: short(empty),
      userFirst: normal.indexOf("现场观察") === 0 && normal.indexOf("现场观察") < normal.indexOf("表达"),
      hasDir: normal.indexOf("表达") > 8
    };
  });
  ok("普通输入候选 ≥16 且不重复", cand.n >= 16 && cand.nu && cand.ns, JSON.stringify(cand));
  ok("弱输入候选 ≥16", cand.w >= 16 && cand.wu && cand.ws, String(cand.w));
  ok("空输入候选 ≥16", cand.e >= 16 && cand.eu && cand.es, String(cand.e));
  ok("用户的词排在方向词前面", cand.userFirst && cand.hasDir);
  await probe.ctx.close();

  async function contrastOf(p, sel) {
    return p.$eval(sel, (el) => {
      function rgb(s) {
        const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s || "");
        if (!m) return null;
        const a = m[4] === undefined ? 1 : Number(m[4]);
        return { c: [Number(m[1]), Number(m[2]), Number(m[3])], a: a };
      }
      let node = el, bg = null;
      while (node) {
        const g = rgb(getComputedStyle(node).backgroundColor);
        if (g && g.a > 0.9) { bg = g.c; break; }
        node = node.parentElement;
      }
      const fg = rgb(getComputedStyle(el).color);
      return { fg: fg && fg.c, bg: bg, fs: parseFloat(getComputedStyle(el).fontSize) };
    });
  }

  const phone = await page(b, { mobile: true, viewport: { width: 390, height: 844 } });
  await shot(phone, "手机_首页");
  const homeC = await contrastOf(phone, "#h-pick");
  ok("首页标题对比度", contrast(homeC.fg, homeC.bg) >= 4.5, JSON.stringify(homeC));
  await toMaterial(phone);
  ok("进入时 8 张贴纸", (await phone.$$(".v19-sticker")).length === 8);
  ok("下一步起初禁用", await phone.$eval("#frag-go", (e) => e.disabled));
  const slots = await phone.evaluate(() => {
    const els = Array.from(document.querySelectorAll(".v19-sticker"));
    const rs = els.map((e) => e.getBoundingClientRect());
    let overlap = false;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j];
      if (a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2) overlap = true;
    }
    const wide = rs.every((r) => r.left >= -1 && r.right <= window.innerWidth + 1);
    return { n: rs.length, overlap: overlap, wide: wide, w: window.innerWidth };
  });
  ok("8 张不重叠且不超出手机宽", slots.n === 8 && !slots.overlap && slots.wide, JSON.stringify(slots));
  await shot(phone, "手机_留下_idle");

  const touch = await phone.$eval(".sticker-btn", (e) => getComputedStyle(e).touchAction);
  ok("贴纸 touch-action none", touch === "none", touch);

  const dragLabel = "反复汇报";
  const box = await phone.locator('.v19-sticker[data-label="' + dragLabel + '"] .sticker-btn').boundingBox();
  await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await phone.mouse.down();
  await phone.mouse.move(box.x + 36, box.y + 28, { steps: 6 });
  await sleep(80);
  const mid = await phone.evaluate(() => {
    const el = document.querySelector(".v19-sticker.is-lifted");
    return {
      op: el ? getComputedStyle(el).opacity : "",
      lock: document.documentElement.classList.contains("v19-dragging")
    };
  });
  ok("拖动时原贴纸变淡", Number(mid.op) > 0.2 && Number(mid.op) < 0.45, mid.op);
  ok("拖动时页面不滚动", mid.lock);
  await phone.mouse.move(12, 80, { steps: 4 });
  await phone.mouse.up();
  await sleep(280);
  const back = await phone.evaluate((label) => {
    const el = document.querySelector('.v19-sticker[data-label="' + label + '"]');
    const chip = document.querySelector('.v19-chip[data-label="' + label + '"]');
    return { there: !!el, op: el ? getComputedStyle(el).opacity : "", chip: !!chip, lock: document.documentElement.classList.contains("v19-dragging") };
  }, dragLabel);
  ok("松在外面会回到原位", back.there && !back.chip && Number(back.op) > 0.9 && !back.lock, JSON.stringify(back));

  const bay = await phone.locator("#bay-take").boundingBox();
  const again = await phone.locator('.v19-sticker[data-label="' + dragLabel + '"] .sticker-btn').boundingBox();
  await phone.mouse.move(again.x + again.width / 2, again.y + again.height / 2);
  await phone.mouse.down();
  await phone.mouse.move(bay.x + bay.width / 2, bay.y + bay.height / 2, { steps: 8 });
  await sleep(60);
  const over = await phone.$eval("#bay-take", (e) => e.classList.contains("is-over"));
  ok("拖到背包时背包高亮", over);
  await shot(phone, "手机_留下_拖拽中");
  const beforeDrop = await labels(phone);
  await phone.mouse.up();
  await sleep(150);
  const afterDrop = await labels(phone);
  ok("放进背包后补上一张", afterDrop.length === 8 && afterDrop.indexOf(dragLabel) < 0 && beforeDrop.indexOf(dragLabel) >= 0, afterDrop.join(","));
  ok("背包里有刚放下的词", (await text(phone, "#tray-take")).indexOf(dragLabel) >= 0);

  await phone.click('.v19-chip[data-label="' + dragLabel + '"]');
  await sleep(80);
  ok("点小标签回到对话框", (await labels(phone)).indexOf(dragLabel) >= 0 && (await phone.$$("#tray-take .v19-chip")).length === 0);

  await placeTap(phone, "活动策划", "leave");
  ok("只放下时下一步可点", !(await phone.$eval("#frag-go", (e) => e.disabled)));
  await phone.click("#frag-go");
  await sleep(60);
  ok("空背包提示并留在这一屏", /至少带走一条/.test(await text(phone, "#frag-err")) && await phone.$eval("body", (el) => el.classList.contains("scr-material")));

  await phone.focus('.v19-sticker[data-label="讲故事"] .sticker-btn');
  await phone.keyboard.press("Enter");
  await sleep(80);
  ok("键盘打开带走放下取消", await phone.$eval("#v19-actions", (e) => !e.hidden) && /带走/.test(await text(phone, "#v19-actions")) && /放下/.test(await text(phone, "#v19-actions")) && /取消/.test(await text(phone, "#v19-actions")));
  await phone.keyboard.press("Enter");
  await sleep(100);
  ok("键盘确认放进背包", (await text(phone, "#tray-take")).indexOf("讲故事") >= 0);

  await openSticker(phone, "现场观察");
  await phone.click(".v19-act-cancel");
  await sleep(40);
  ok("取消不放进背包", (await text(phone, "#tray-take")).indexOf("现场观察") < 0 && await phone.$eval("#v19-actions", (e) => e.hidden));
  await placeTap(phone, "现场观察", "take");

  await phone.click("#frag-more");
  await sleep(40);
  await phone.fill("#v19-more-in", "  赶不完的会  ");
  await phone.click("#v19-add");
  await sleep(80);
  ok("更多可以加词", (await labels(phone)).indexOf("赶不完的会") >= 0);
  await phone.click("#frag-more");
  await phone.fill("#v19-more-in", "赶不完的会");
  await phone.click("#v19-add");
  await sleep(40);
  ok("自己的词不重复", (await labels(phone)).filter((w) => w === "赶不完的会").length === 1);
  await phone.evaluate(() => { const t = document.getElementById("toast"); if (t) { t.classList.remove("show"); t.textContent = ""; } });
  await phone.click("#frag-more");
  await phone.fill("#v19-more-in", "夜班");
  await phone.click("#v19-add-leave");
  await sleep(80);
  ok("更多可以直接放进纸箱", (await text(phone, "#tray-leave")).indexOf("夜班") >= 0);

  const placedBefore = await phone.$eval("#frag-bags", (e) => e.innerText);
  const bubbleBefore = await labels(phone);
  await phone.click("#frag-swap");
  await sleep(80);
  const bubbleAfter = await labels(phone);
  const placedAfter = await phone.$eval("#frag-bags", (e) => e.innerText);
  ok("换一批留下已放下的", placedBefore === placedAfter && /讲故事/.test(placedAfter) && /活动策划/.test(placedAfter));
  ok("换一批换掉还在对话框里的", bubbleAfter.join("|") !== bubbleBefore.join("|") && bubbleAfter.every((w) => bubbleBefore.indexOf(w) < 0), bubbleAfter.join(","));
  await shot(phone, "手机_留下_换一批");
  await shot(phone, "手机_留下_放下后");

  await phone.evaluate(() => { window.__lingcun19.redraw(); });
  await sleep(40);
  ok("重画后小标签还在", /讲故事/.test(await text(phone, "#tray-take")) && /活动策划/.test(await text(phone, "#tray-leave")));

  await phone.click("#frag-go");
  await sleep(200);
  await shot(phone, "手机_好奇方向");
  const dirC = await contrastOf(phone, ".dirlead");
  ok("方向说明对比度", contrast(dirC.fg, dirC.bg) >= 4.5, JSON.stringify(dirC));
  await phone.click('[data-dir="tech"]');
  await sleep(40);
  await phone.click("#dir-go");
  await sleep(200);
  await shot(phone, "手机_一条尝试");
  ok("尝试用上带走的词", /现场观察|讲故事/.test(await text(phone, "#try-line")));
  const tryC = await contrastOf(phone, ".tryline");
  ok("尝试正文对比度", contrast(tryC.fg, tryC.bg) >= 4.5, JSON.stringify(tryC));
  await phone.click("#try-yes");
  await sleep(250);
  await shot(phone, "手机_另存成功");
  await phone.click("#ok-share");
  await sleep(150);
  await shot(phone, "手机_分享");
  const img = await phone.evaluate(() => {
    const c = window.__lingcun19.card();
    const x = c.getContext("2d");
    const edge = x.getImageData(8, 8, 1, 1).data;
    const paper = x.getImageData(120, 120, 1, 1).data;
    return { edge: [edge[0], edge[1], edge[2]], paper: [paper[0], paper[1], paper[2]] };
  });
  ok("分享图是蓝底奶油面", img.edge[0] === 94 && img.edge[1] === 114 && img.edge[2] === 181 && img.paper[0] === 247 && img.paper[1] === 240 && img.paper[2] === 223, JSON.stringify(img));
  await phone.click("#share-back");
  await sleep(80);
  await phone.click("#ok-map");
  await sleep(150);
  ok("星图打得开", /已留下|月球/.test(await text(phone, "#bag-body")));
  await shot(phone, "手机_星图");
  await phone.click("#bag-close");
  await sleep(80);
  await phone.click("#menu-btn");
  await sleep(80);
  await shot(phone, "手机_菜单");
  await phone.click("#ai-chip");
  await sleep(80);
  await shot(phone, "手机_设置");
  ok("手机全程无报错", phone.errs.length === 0, phone.errs.join(" | "));
  await phone.ctx.close();

  const desk = await page(b, { mobile: false, viewport: { width: 1280, height: 720 } });
  await shot(desk, "桌面_首页");
  ok("桌面首页主按钮在首屏", await desk.$eval("#pk-start", (e) => {
    const r = e.getBoundingClientRect();
    return r.top >= -2 && r.bottom <= window.innerHeight + 2;
  }));
  await enterIdea(desk);
  const cols = await desk.evaluate(() => {
    const l = document.querySelector(".pk-l").getBoundingClientRect();
    const r = document.querySelector(".pk-r").getBoundingClientRect();
    return { gap: r.x - (l.x + l.width), lw: l.width, rw: r.width };
  });
  ok("桌面带上过去仍是两栏", cols.gap > 40 && cols.lw > 200 && cols.rw > 200, JSON.stringify(cols));
  await desk.fill("#pk-idea", "办过线下活动策划，负责现场和讲故事");
  await desk.click("#pk-go");
  await sleep(250);
  await shot(desk, "桌面_留下_idle");
  ok("桌面也是 8 张", (await desk.$$(".v19-sticker")).length === 8);
  const dbox = await desk.locator('.v19-sticker[data-label="反复汇报"] .sticker-btn').boundingBox();
  const dbay = await desk.locator("#bay-leave").boundingBox();
  await desk.mouse.move(dbox.x + dbox.width / 2, dbox.y + dbox.height / 2);
  await desk.mouse.down();
  await desk.mouse.move(dbay.x + dbay.width / 2, dbay.y + 30, { steps: 8 });
  await sleep(40);
  await shot(desk, "桌面_留下_拖拽中");
  await desk.mouse.up();
  await sleep(120);
  await placeTap(desk, "现场观察", "take");
  await placeTap(desk, "讲故事", "take");
  await shot(desk, "桌面_留下_放下后");
  await desk.click("#frag-swap");
  await sleep(80);
  await shot(desk, "桌面_留下_换一批");
  ok("桌面换一批后带走还在", /现场观察/.test(await text(desk, "#tray-take")));
  await desk.click("#frag-go");
  await sleep(180);
  await shot(desk, "桌面_好奇方向");
  await desk.click('[data-dir="tech"]');
  await desk.click("#dir-go");
  await sleep(180);
  await shot(desk, "桌面_一条尝试");
  await desk.click("#try-yes");
  await sleep(200);
  await shot(desk, "桌面_另存成功");
  await desk.click("#ok-share");
  await sleep(120);
  await shot(desk, "桌面_分享");
  ok("桌面全程无报错", desk.errs.length === 0, desk.errs.join(" | "));
  await desk.ctx.close();

  const still = await page(b, { mobile: true, reduced: true });
  await toMaterial(still, "办过线下活动策划，负责现场和讲故事");
  const anim = await still.$eval(".tilt", (el) => getComputedStyle(el).animationName);
  ok("减少动态效果时贴纸不浮动", anim === "none", anim);
  await still.ctx.close();

  const preview = path.join(OUT, "box-states.html");
  fs.writeFileSync(preview, '<!doctype html><meta charset="utf-8"><title>箱</title><body style="margin:0;background:#5E72B5;display:flex;gap:28px;padding:28px;font-family:sans-serif">' +
    ["b-box.svg|默认", "b-box-active.svg|靠近", "b-box-done.svg|放下了"].map((s) => {
      const [f, n] = s.split("|");
      return '<div style="text-align:center"><img src="../page/icons/' + f + '" width="128" height="128" style="image-rendering:pixelated"><div style="color:#fff;margin-top:8px">' + n + "</div></div>";
    }).join("") + "</body>");
  const iconPage = await (await b.newContext({ viewport: { width: 640, height: 280 } })).newPage();
  await iconPage.goto("file://" + preview);
  await iconPage.screenshot({ path: path.join(OUT, "箱图标三态.png") });
  ok("箱图标三态已截图", fs.existsSync(path.join(OUT, "箱图标三态.png")));
  await iconPage.context().close();

  await b.close();
  const bad = R.filter((x) => x[0] === "FAIL");
  fs.writeFileSync(path.join(OUT, "result19.txt"), R.map((x) => x.join("\t")).join("\n") + "\n");
  console.log(bad.length ? "FAILED " + bad.length + "/" + R.length : "ALL_PASS " + R.length);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
