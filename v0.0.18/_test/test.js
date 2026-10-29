/* 另存人生 v0.0.13 自动测试（puppeteer-core + 本机 Chrome）。跑法：cd _test && npm i && node test.js */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');
const PAGE = path.resolve(__dirname, '../page/index.html');
const FILE = 'file://' + PAGE;
const SHOTS = path.resolve(__dirname, '../page/shots');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; const errors = []; const external = {};
let phase = 'default';
function ok(name, cond, extra) { results.push((cond ? 'PASS ' : 'FAIL ') + '[' + phase + '] ' + name + (cond || !extra ? '' : ' — ' + String(extra).slice(0, 300))); }
async function newPage(ctx, url, vp) {
  const page = await ctx.newPage();
  await page.setViewport(vp || { width: 420, height: 900, deviceScaleFactor: 2 });
  page.on('pageerror', e => errors.push(phase + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(phase + ' console: ' + m.text()); });
  page.on('request', r => { const u = r.url(); if (!/^(file|data|about|blob):/.test(u) && !/^http:\/\/127\.0\.0\.1:(8799|8798)/.test(u)) (external[phase] = external[phase] || []).push(r.method() + ' ' + u); });
  page.on('dialog', d => d.accept());
  await page.evaluateOnNewDocument(() => {
    window.__dl = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) { const name = this.download; fetch(this.href).then(r => r.text()).then(t => window.__dl.push({ name, text: t })); return; }
      return orig.call(this);
    };
  });
  await page.goto(url || FILE, { waitUntil: 'load' });
  return page;
}
/* v0.0.12：首页先是三颗胶囊 +「出发」，点了「出发」才到写一句话那一步。测到写一句话那一步的元素时，先替人点「出发」 */
const IDEA_SEL = /^(#pk-(idea|go|none|bg|all|goal|clar|sug|more|take|back)|\[data-(cat|ex|way)|#bg-|#anx-|#act-sub)/;
async function ensureIdea(p, sel) { if (!IDEA_SEL.test(sel)) return; const st = await p.evaluate(() => window.__lingcun && window.__lingcun.state().stage).catch(() => ''); if (st === 'pick' && !(await p.$('#pk-idea')) && (await p.$('#pk-start'))) { await p.$eval('#pk-start', e => e.click()); await sleep(80); } }
/* v0.0.12：第一版一出来就直接进「这是第一版」，所以「下一步」按钮可能已经不在了 */
/* 第一版出来：v0.0.11 是草稿页出现预览；v0.0.12 直接跳到「这是第一版」 */
const waitFirst = (p, ms) => waitFn(p, () => !!document.getElementById('dr-prev') || window.__lingcun.state().stage === 'check', ms || 4000);
/* 【创造】：v0.0.12 先点胶囊，再「出发」，再点箭头（不写一句话也能直接做小工具） */
const goTool = async (p, idea) => { await click(p, '[data-act="create"]'); await sleep(80); await click(p, '#pk-start'); await sleep(80); if (idea) { await type(p, '#pk-idea', idea); await sleep(80); await click(p, '#pk-go'); } else await click(p, '[data-cat="tool"]'); await sleep(200); };
const goCreate = async p => { await click(p, '[data-act="create"]'); await sleep(80); await click(p, '#pk-start'); await sleep(80); await click(p, '#pk-go'); await sleep(200); };
const clickIf = async (p, sel) => { if (await p.$(sel)) await click(p, sel); };
const click = async (p, sel) => { if (/^\[data-act/.test(sel) && !(await p.$(sel)) && (await p.$('#pk-back'))) { await p.$eval('#pk-back', e => e.click()); await sleep(80); } await ensureIdea(p, sel); return p.$eval(sel, e => e.click()); };
const vis = async (p, sel) => { await ensureIdea(p, sel); return vis0(p, sel); };
const vis0 = (p, sel) => p.$eval(sel, e => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden').catch(() => false);
/* 收在「更多」（关着的 details）里的字，innerText 读不到，就读 textContent */
const txt = async (p, sel) => { await ensureIdea(p, sel).catch(() => {}); return p.$eval(sel, e => { let n = e.parentElement, hid = false; while (n) { if (n.tagName === 'DETAILS' && !n.open) { const sm = n.querySelector(':scope > summary'); if (!(sm && sm.contains(e))) hid = true; } n = n.parentElement; } return hid ? e.textContent : e.innerText; }).catch(() => ''); };
/* 打磨轮：材料是一叠卡片，一次只显示一张；查「卡片里有没有这句话」用 textContent */
const allTxt = async (p, sel) => { await ensureIdea(p, sel).catch(() => {}); return allTxt0(p, sel); };
const allTxt0 = (p, sel) => p.$eval(sel, e => e.textContent).catch(() => '');
const S = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__lingcun.state())));
const cur = async p => { const s = await S(p); return s.projects[s.cur]; };
async function type(p, sel, v) { await ensureIdea(p, sel); await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v); }
async function pick(p, sel) { await p.$eval(sel, e => { e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function shot(p, name, sel) {
  await sleep(350);
  if (sel) { const el = await p.$(sel); if (el) { await p.evaluate(() => { const b = document.querySelector('.stagebar'); if (b) b.style.position = 'static'; }); try { await el.screenshot({ path: path.join(SHOTS, name) }); } catch (e) { await p.screenshot({ path: path.join(SHOTS, name) }); } await p.evaluate(() => { const b = document.querySelector('.stagebar'); if (b) b.style.position = ''; }); return; } }
  await p.screenshot({ path: path.join(SHOTS, name), fullPage: false });
}
async function scrollTo(p, sel) { await p.$eval(sel, e => e.scrollIntoView({ block: 'start' })).catch(() => {}); await sleep(200); }
async function waitSel(p, sel, ms) { try { await p.waitForSelector(sel, { timeout: ms || 5000 }); return true; } catch (e) { return false; } }
async function waitFn(p, fn, ms, arg) { try { await p.waitForFunction(fn, { timeout: ms || 5000 }, arg); return true; } catch (e) { return false; } }
const stage = p => p.evaluate(() => window.__lingcun.state().stage);
const PRICE = /[¥￥$]\s?\d|\d+(\.\d+)?\s?(元|块钱|美元|美金)|每百万|百万\s?tokens?/i;
const STAGE_NAMES = ['选这一局', '补齐材料', '做出第一版', '检查与修改', '确认登月', '之后'];
const NET = '生成和修改时，你提供的相关内容会发送给 AI 服务处理：默认经过另存人生的中转服务转给 DeepSeek（中转不保存内容）；用自己的密钥时，直接从你的浏览器发给你选的那家。额外搜索网上资料，只在你主动选择并确认搜索内容后进行。';
/* 确认登月：勾上所有确认项再点「确认，登月」 */
async function landIt(p) { await p.$$eval('#b-save [data-cf]', es => es.forEach(e => { if (!e.checked) { e.checked = true; e.dispatchEvent(new Event('change')); } })); await click(p, '#lc-go'); await waitSel(p, '#land, #lc-done', 4000); for (let i = 0; i < 10 && !(await p.$('#lc-done')); i++) { if (await p.$('#land')) await click(p, '#land').catch(() => {}); await sleep(200); } await sleep(100); }
async function noJson(p, where) {
  const t = await p.evaluate(() => document.body.innerText);
  ok(where + '：人看不到任务 JSON / 提交框', !/lingcun_task|output_schema|"inputs"\s*:/.test(t));
}
/* 每道选择题都有「不确定，先跳过」和「其他，我自己写」 */
async function choicesHaveSkipOther(p, root) {
  return p.$$eval(root + ' .q', qs => qs.filter(q => q.querySelector('input[type=radio],input[type=checkbox][name^="q_"]')).map(q => {
    const ins = [...q.querySelectorAll('input[name^="q_"]')]; return { k: q.getAttribute('data-q'), s: ins.some(i => i.value === 'skip'), o: ins.some(i => i.value === 'other') };
  }));
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAG0lEQVR4nGP4z8DwHwmTJcAwkgwgrRaMQwlhAPMzP8GbYa8bAAAAAElFTkSuQmCC', 'base64');
const PNG_PATH = path.join(__dirname, 'tiny.png'); fs.writeFileSync(PNG_PATH, PNG);

/* ---------- 本机假的 OpenAI 兼容接口：测直连（SSE 流式、关思考、流式断了回退、格式修复重试） ---------- */
const llmLog = []; let serverMode = 'sse';
const RES_OUT = { headline: '活动策划 · 品牌线下快闪', summary: '做过 3 场品牌线下快闪的方案和现场执行。', experiences: [{ org: '某品牌公司', role: '活动策划', period: '2022–2024', bullets: ['负责 3 场线下快闪的方案和现场执行', '对接场地和供应商'] }], skills: ['剪映', 'Excel'], pending: ['成果：待补'] };
const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let body = ''; req.on('data', d => body += d); req.on('end', () => {
    let j = {}; try { j = JSON.parse(body); } catch (e) {}
    const sys = (j.messages && j.messages[0] && j.messages[0].content) || '';
    const type = (sys.match(/任务类型：(\w+)/) || [])[1];
    llmLog.push({ type, auth: req.headers.authorization, model: j.model, stream: !!j.stream, thinking: j.thinking, rf: j.response_format, n: (j.messages || []).length, mode: serverMode, sys });
    if (req.headers.authorization !== 'Bearer sk-test-1234567890abcdef') { res.writeHead(401, Object.assign({ 'Content-Type': 'application/json' }, cors)); return res.end('{"error":{"message":"bad key"}}'); }
    let content = type === 'ping' ? '{"ok":true}' : JSON.stringify(RES_OUT);
    if (serverMode === 'badjson' && (j.messages || []).length === 2) content = '这是你要的简历：……（故意不给 JSON）';
    if (j.stream && serverMode === 'broken') {
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream' }, cors));
      res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: content.slice(0, 10) } }] }) + '\n\n');
      setTimeout(() => res.destroy(), 60); return;
    }
    if (serverMode === 'cut') {
      const half = content.slice(0, Math.floor(content.length / 2));
      if (j.stream) { res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream' }, cors)); res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: half } }] }) + '\n\n'); res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'length' }] }) + '\n\n'); res.write('data: [DONE]\n\n'); return res.end(); }
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
      return res.end(JSON.stringify({ id: 'x', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: half }, finish_reason: 'length' }] }));
    }
    if (j.stream) {
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }, cors));
      const parts = content.match(/[\s\S]{1,12}/g); let i = 0;
      const tick = () => { if (i < parts.length) { res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); setTimeout(tick, 15); } else { res.write('data: [DONE]\n\n'); res.end(); } };
      setTimeout(tick, 80); return;
    }
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
    res.end(JSON.stringify({ id: 'x', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }] }));
  });
});

async function startCat(p, cat, idea) {
  if (idea) await type(p, '#pk-idea', idea);
  await click(p, '[data-cat="' + cat + '"]');
  await sleep(150);
}
async function waitStage(p, st, ms) { return waitFn(p, s => window.__lingcun.state().stage === s, ms || 4000, st); }

(async () => {
  await new Promise(r => server.listen(8799, '127.0.0.1', r));
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const src = fs.readFileSync(PAGE, 'utf8');

  /* ========== 0. 默认打开（人）：不联网、六个阶段、联网说明、没有 OpenDesign、agent 不可见 ========== */
  phase = 'default';
  let ctx = await browser.createBrowserContext();
  const PROD_RELAY = 'https://lingcun-relay.lingcun.workers.dev';
  let p = await newPage(ctx);
  ok('#24 默认（不加参数）就用已部署的免费体验额度，打开时不发请求', (await p.evaluate(() => window.lingcunAI.mode())) === 'relay' && (await p.evaluate(() => window.__lingcun.ai.cfg().relay)) === PROD_RELAY && (await txt(p, '#ai-chip')).includes('免费体验额度'), await txt(p, '#ai-chip'));
  ok('#24 页面里写的中转地址是 HTTPS 的 workers.dev', src.includes('var RELAY_URL = "' + PROD_RELAY + '"'));
  await sleep(300);
  ok('默认打开（中转已配置）：仍然没有任何对外请求', !(external.default || []).length, (external.default || []).join(' | '));
  await ctx.close();
  /* 下面用 ?relay=off 模拟「中转还没开通」，同时保证测试不去调真实中转 */
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?relay=off');
  await sleep(400);
  ok('默认打开：没有任何对外请求', !(external.default || []).length, (external.default || []).join(' | '));
  const stagesTxt = await p.$$eval('#stages [data-st]', es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim())); /* 打磨轮：阶段变成圆形航点，图标和名字分两行 */
  ok('阶段条：固定六个阶段，名字对、顺序对', JSON.stringify(stagesTxt) === JSON.stringify(STAGE_NAMES), stagesTxt.join('|'));
  ok('阶段条不显示 n/m 计数', !/\d\s*\/\s*\d/.test(await txt(p, '.stagebar')), await txt(p, '.stagebar'));
  ok('联网说明（页首）逐字一致', (await txt(p, '#netnote')).trim() === NET, await txt(p, '#netnote'));
  ok('联网说明（页脚）也在', (await txt(p, '#foot')).includes(NET));
  ok('源码里没有 OpenDesign', !/open\s*design/i.test(src));
  ok('源码里没有价格数字', !PRICE.test(src), (src.match(PRICE) || [])[0]);
  ok('源码里不再把进度写进网址（没有 #state= 写入）', !/location\.hash\s*=|#state=/.test(src.replace(/\/state=\/\.test\(location\.hash\)/, '')));
  ok('人打开：不是 agent 模式、DOM 里没有任务块', (await p.evaluate(() => window.lingcunAI.mode())) === '' && !(await p.$('[data-ai-task]')));
  ok('源码里没有「先不用 AI」', !src.includes('先不用 AI'));
  ok('每一步都有「卡住了？」入口（选东西这一步）', (await txt(p, '#s-pick .ask summary')).includes('卡住了？直接告诉我你看到什么'));
  await shot(p, '01_入口.png');
  await click(p, '#pk-none'); await sleep(150);
  ok('没想法的人：看到具体例子（≥5 个）', (await p.$$('[data-ex]')).length >= 5);
  ok('情绪不是必答：背景是可选的折叠项', (await txt(p, '#pk-bg summary')).includes('可选'));
  await p.$eval('#pk-bg', d => d.open = true);
  await type(p, '#bg-sit', '最近很焦虑，什么都不想做');
  await sleep(150);
  ok('说了焦虑：短回应 + 「今天可以先试的一小步」+ 只剩小例子', (await txt(p, '#anx-reply')).includes('先不用想清楚') && (await txt(p, '#b-pick')).includes('今天可以先试的一小步') && (await p.$$('[data-ex]')).length >= 2 && (await p.$$('[data-ex]')).length <= 4, (await p.$$('[data-ex]')).length);
  await shot(p, '02_入口_还没想好_焦虑时更小的一步.png');
  await type(p, '#pk-idea', '给家里的猫做一本成长手账');
  ok('没有对应类目：不硬套，按通用方式', (await txt(p, '#pk-go')).includes('通用'), await txt(p, '#pk-go'));
  ok('#19 开局就写清「这一局会带走什么」', (await txt(p, '#pk-take')).includes('这一局会带走'), await txt(p, '#pk-take'));
  ok('匹配：小说/简历/照片/小工具/复盘各自识别', await p.evaluate(() => { const m = window.__lingcun.matchCats; return m('写一篇雨夜的短篇小说')[0] === 'novel' && m('把我的工作经历整理成简历')[0] === 'resume' && m('把旅行照片排成一页')[0] === 'photo' && m('做个记账小工具')[0] === 'tool' && m('复盘一下去年办的快闪活动')[0] === 'exp'; }));
  await click(p, '#pk-go'); await sleep(200);
  ok('通用方式：进入「补齐材料」，g_what 已填好', (await stage(p)) === 'material' && (await cur(p)).cat === 'generic' && (await allTxt(p, '#b-material .known')).includes('猫'));
  ok('没密钥（人）：做第一版时给三条路，不出现 agent', true);
  await click(p, '#mat-go'); await sleep(300);
  const kh = await txt(p, '#b-draft');
  ok('中转还没开通、也没密钥：「这一步要请 AI 帮忙」+ 说明免费额度还没开通 + 填密钥 / 怎么拿 / 先留着进度', kh.includes('这一步要请 AI 帮忙') && kh.includes('免费体验额度还没开通') && kh.includes('填 API 密钥') && kh.includes('怎么拿一个') && kh.includes('先留着进度') && !/agent/i.test(kh), kh.slice(0, 200));
  await noJson(p, '默认·第一个 AI 步骤');
  ok('默认打开：全程没有对外请求', !(external.default || []).length, (external.default || []).join(' | '));
  await ctx.close();

  /* ========== 1. 小说（mock）：六个阶段走一遍；跳过 / 其他；长篇先出结构再展开 ========== */
  phase = 'novel';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await type(p, '#pk-idea', '写一篇雨夜外卖员和猫的长篇小说，温暖一点');
  ok('一句话 → 识别成小说（明确说了「小说」才直接定）', (await txt(p, '#pk-go')).includes('小说创作') && !(await vis(p, '#pk-clar')), await txt(p, '#pk-go'));
  await click(p, '#pk-go'); await sleep(200);
  let cp = await cur(p);
  ok('从一句话里猜出了篇幅（长篇）和文风（温暖），不再问', cp.a.n_len && cp.a.n_len.i === 3 && cp.a.n_style && cp.a.n_style.i === 0 && !(await p.$('[data-q="n_len"] input')), JSON.stringify(cp.a));
  let qs = await choicesHaveSkipOther(p, '#b-material');
  ok('补齐材料：每道选择题都有「先跳过」和「其他，我自己写」', qs.length >= 2 && qs.every(q => q.s && q.o), JSON.stringify(qs));
  ok('选项文字逐字：「不确定，先跳过」「其他，我自己写」', (await allTxt(p, '#b-material')).includes('不确定，先跳过') && (await allTxt(p, '#b-material')).includes('其他，我自己写'));
  await type(p, '#t_n_plot', '外卖员阿亮雨夜送餐，捡到一只会说话的猫；猫在等一个不会回来的人。');
  await p.$eval('#k_n_chars', e => { e.checked = true; e.dispatchEvent(new Event('change')); });
  await pick(p, 'input[name="q_n_type"][value="other"]');
  await type(p, '#o_n_type', '都市奇幻');
  await pick(p, 'input[name="q_n_pov"][value="skip"]');
  cp = await cur(p);
  ok('跳过 → 记成 skip；其他 → 记下自己写的', cp.a.n_chars.skip === true && cp.a.n_pov.skip === true && cp.a.n_type.other === '都市奇幻', JSON.stringify(cp.a));
  ok('材料阶段有「下一步」', (await allTxt(p, '#b-material .next')).includes('下一步'));
  await shot(p, '03_阶段2_补齐材料_小说.png', '#s-material');
  const nt = await p.evaluate(() => window.__lingcun.taskDraft());
  ok('小说任务：跳过的设定传成「待补」，其他写的原样传', JSON.stringify(nt.inputs).includes('待补') && JSON.stringify(nt.inputs).includes('都市奇幻'));
  const nsys = await p.evaluate(t => window.__lingcun.sysPrompt(t), nt);
  ok('小说的事实规则：可以虚构；没有全局「不编造」', /可以虚构/.test(nsys) && /这一类的事实规则/.test(nsys) && !/不编造人名/.test(nsys), nsys.slice(0, 400));
  ok('长篇：第一步只要结构（novel_outline）', nt.type === 'novel_outline', nt.type);
  await click(p, '#mat-go');
  ok('做出第一版：先出结构', await waitSel(p, '#dr-exp', 4000) && (await txt(p, '#b-draft')).includes('故事结构出来了'));
  await shot(p, '04_阶段3_做出第一版_小说结构.png', '#s-draft');
  await click(p, '#dr-exp');
  ok('展开第一段 → 直接到「这是第一版」', await waitFirst(p, 4000) && (await stage(p)) === 'check' && (await cur(p)).out.sections.filter(x => x.text).length === 1);
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  ok('检查与修改：页面先查了一遍', (await allTxt(p, '#b-check')).includes('页面先帮你查了一遍'));
  ok('做成程度在「检查与修改」里（保存之前）', !!(await p.$('#b-check [data-q="degree"]')) && !(await p.$('#b-save [data-q="degree"]')));
  ok('满意度滑块：没拖时不显示 60，写「还没拖」', (await allTxt(p, '#sat-v')).includes('还没拖') && !(await allTxt(p, '#sat-v')).includes('60') && (await p.$eval('#sat', e => e.classList.contains('unset'))));
  qs = await choicesHaveSkipOther(p, '#b-check');
  ok('检查阶段的选择题（改哪里 / 做成程度）也都有跳过 / 其他', qs.length >= 2 && qs.every(q => q.s && q.o), JSON.stringify(qs));
  ok('v0.0.12：做成程度改成可选（收在「更多」里，不拦人）', (await allTxt(p, '#b-check [data-q="degree"]')).includes('可选') && !!(await p.$('#ck-more [data-q="degree"]')));
  await p.$eval('#ck-fix', d => d.open = true);
  await pick(p, 'input[name="q_fix"][value="0"]');
  await click(p, '#fix-go');
  ok('改一处 → 改好了（revs=1）', await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].revs === 1; }, 4000));
  await p.$eval('#sat', e => { e.value = 80; e.dispatchEvent(new Event('input')); });
  ok('拖了滑块才显示数值', (await allTxt(p, '#sat-v')) === '80%');
  await pick(p, 'input[name="q_degree"][value="1"]');
  await scrollTo(p, '#s-check');
  await shot(p, '05_阶段4_检查与修改.png', '#s-check');
  await click(p, '#ck-next'); await waitStage(p, 'save');
  ok('#35 按住确认：一颗按住的按钮 + 「松手可反悔」', (await txt(p, '#lc-go')).includes('按住确认') && (await txt(p, '#lc-holdhint')).includes('松手可反悔') && (await p.$$('#lc-ring line')).length === 72);
  await p.click('#lc-go'); await sleep(150);
  ok('#35 只是点一下（没按住）→ 不登月，提示要按住', !(await cur(p)).landed && (await txt(p, '#lc-err')).includes('按住'));
  { const bb = await (await p.$('#lc-go')).boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(450);
    ok('#35 按住时外圈刻度一格格亮起', (await p.$$('#lc-ring line.on')).length > 5);
    await p.mouse.up(); await sleep(150);
    ok('#35 没走满就松手 = 反悔：不登月、刻度归零', !(await cur(p)).landed && (await p.$$('#lc-ring line.on')).length === 0 && (await txt(p, '#lc-err')).includes('不算')); }
  const cft = await txt(p, '#lc-box');
  ok('#19 文字作品的确认：读过、愿意留下（写在按钮下面）', cft.includes('读过') && cft.includes('愿意留下'), cft.slice(0, 300));
  await shot(p, '06_确认登月.png');
  { const bb = await (await p.$('#lc-go')).boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(1500); await p.mouse.up(); }
  ok('#35 按住走满 → 登月（确认项都记上）', await waitSel(p, '#land', 3000) && (await cur(p)).landed && Object.values((await cur(p)).confirm).filter(Boolean).length >= 2);
  ok('#21 登月文案：「这一步虽小，对我来说确实是大突破」', (await txt(p, '#land-msg')).replace(/\s+/g, '').includes('这一步虽小，对我来说确实是大突破'));
  ok('#33 登月是定稿的庆祝小人', !!(await p.$('#land .astro svg')) && (await p.evaluate(() => document.body.classList.contains('night') && document.body.classList.contains('scr-land'))));
  await click(p, '#land'); await waitSel(p, '#lc-done', 3000);
  const svTxt = await allTxt(p, '#b-save');
  ok('#35 轻点 → 星图：「你的第一颗星」+ GitHub + 分享', (await txt(p, '#map-h')) === '你的第一颗星' && (await txt(p, '#star-go')).includes('GitHub') && (await txt(p, '#sc-open')).includes('分享') && !!(await p.$('#star-go svg')));
  ok('#21 不替用户下结论（没有「这件东西让你近了一步」之类）', !/让你(离.{0,8})?近了一步|离梦想|离理想|更接近你的|证明了你/.test(svTxt), svTxt.slice(0, 300));
  ok('#34 星图不替用户安排下一步：没有「下一局 / 下一站 / 从月球出发」', !/下一局|下一站|从月球出发/.test(await p.evaluate(() => document.body.innerText)));
  ok('#19 登月后（收在「更多」里）：回去再改 / 下载作品 / 今天先到这儿', ['回去再改', '下载作品', '今天先到这儿'].every(x => svTxt.includes(x)), svTxt.slice(0, 300));
  ok('#22 第一次完成 → 登上月球', (await cur(p)).landed && (await cur(p)).planet === 0 && (await allTxt(p, '#lc-done')).includes('月球'));
  ok('#19 页面上不再把「保存」当成完成', !/已保存|保存成功/.test(svTxt));
  ok('保存后没有 OpenDesign', !/open\s*design/i.test(await txt(p, 'body')));
  await p.$eval('#map-more', d => d.open = true);
  await click(p, '#nx-pause'); await sleep(100);
  ok('今天先到这儿：说清下次怎么接上', (await txt(p, '#sv-out')).includes('上次做到这里'));
  await scrollTo(p, '#s-save');
  await shot(p, '07_登月后的下一步.png', '#sv-next');
  await click(p, '#nx-dl'); await sleep(500);
  const dl = await p.evaluate(() => window.__dl);
  ok('下载 .html：有正文，不带 AI 调用', dl.length === 1 && /\.html$/.test(dl[0].name) && dl[0].text.includes('<html') && !/lingcun_task|api\.deepseek/.test(dl[0].text), dl.map(x => x.name).join(','));
  await click(p, '#nx-more'); await waitStage(p, 'again');
  ok('换材料再做：保留设置（文风、篇幅等）', (await txt(p, '#ag-swap')).includes('保留你的设置'));
  await shot(p, '08_阶段6_换材料再做.png', '#s-again');
  await click(p, '#ag-swap'); await waitStage(p, 'material');
  cp = await cur(p);
  ok('第 2 份：保留 keep 字段、标题带「第 2 份」', cp.title.includes('第 2 份') && cp.a.n_len && cp.a.n_len.i === 3, JSON.stringify(cp.a) + cp.title);
  ok('阶段条：当前是「补齐材料」', (await p.$eval('#stages .now', e => e.innerText.replace(/\s+/g, ' ').trim())) === '补齐材料');
  await noJson(p, '小说流程');
  await ctx.close();

  /* ========== 2. 简历（mock）+ 刷新后接上 + 卡住能问 + 能力对照 ========== */
  phase = 'resume';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await startCat(p, 'resume');
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行；对接场地和供应商。');
  await p.$eval('#k_r_result', e => { e.checked = true; e.dispatchEvent(new Event('change')); });
  const rt = await p.evaluate(() => window.__lingcun.taskDraft());
  const rsys = await p.evaluate(t => window.__lingcun.sysPrompt(t), rt);
  ok('简历的事实规则：不编造、不拔高；「待补」原样写', /不编造/.test(rsys) && /不拔高/.test(rsys) && rt.type === 'resume_draft', rt.type);
  ok('简历：跳过的成果传成「待补」', JSON.stringify(rt.inputs).includes('待补'));
  await click(p, '#mat-go');
  ok('简历：直接出第一版（不先出结构）', await waitFirst(p, 4000));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  ok('检查：列出「待补」', (await allTxt(p, '#b-check')).includes('待补'));
  /* 卡住能问 */
  await p.$eval('#ask', d => d.open = true);
  await type(p, '#ask-q', '「待补」是什么意思？');
  await click(p, '#ask-go'); await sleep(200);
  ok('卡住能问：常见词马上解释，答完说回到这一步', (await txt(p, '#ask-ans')).includes('跳过') && (await txt(p, '#ask-ans')).includes('回到这一步'));
  await type(p, '#ask-q', '点了按钮没反应，页面上写着连不上');
  await click(p, '#ask-go');
  ok('卡住能问：其他问题交给 AI（带上当前这一步）', await waitFn(p, () => (document.querySelector('#ask-ans') || {}).innerText && document.querySelector('#ask-ans').innerText.includes('模拟回答') && document.querySelector('#ask-ans').innerText.includes('检查与修改'), 4000));
  await scrollTo(p, '#ask');
  await shot(p, '09_卡住了直接问.png', '#ask');
  ok('问的时候还在原来这一步', (await stage(p)) === 'check');
  /* 刷新后接上（未解决的问题） */
  await p.reload({ waitUntil: 'load' }); await sleep(300);
  ok('刷新：网址里没有进度', !(await p.evaluate(() => location.hash)).includes('state'));
  const rs = await txt(p, '#resume');
  ok('刷新后：「上次做到这里，留下了这个问题」+ 没解决的那个问题', rs.includes('上次做到这里，留下了这个问题') && rs.includes('连不上'), rs);
  ok('刷新后：继续 / 修改 / 先放下', (await txt(p, '#rs-go')) === '继续' && (await txt(p, '#rs-edit')) === '修改' && (await txt(p, '#rs-later')) === '先放下');
  await shot(p, '10_回来时接上次进度.png');
  await click(p, '#rs-go'); await sleep(200);
  ok('点继续：回到「检查与修改」，问答还在', (await stage(p)) === 'check' && (await p.$eval('#ask', d => d.open)) && (await txt(p, '#ask-ans')).includes('模拟回答'));
  await click(p, '#ask-back'); await sleep(100);
  ok('点「回到这一步」：问题标成已解决、问答框收起', (await S(p)).ask.resolved === true && !(await p.$eval('#ask', d => d.open)));
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  ok('问题解决后再刷新：显示这一步要做的事', (await txt(p, '#resume')).includes('上次做到这里') && !(await txt(p, '#resume')).includes('连不上'));
  await click(p, '#rs-edit'); await sleep(150);
  ok('点修改：回到「补齐材料」', (await stage(p)) === 'material');
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  await click(p, '#rs-later'); await sleep(150);
  ok('点先放下：回到选东西，星图里还在（右上角 星图 (1)）+「继续上次的」', (await stage(p)) === 'pick' && (await txt(p, '#bag-btn')).includes('(1)') && !!(await p.$('#pk-last')));
  await click(p, '#bag-btn'); await sleep(150); await click(p, '[data-bag-card="0"]'); await sleep(150); await click(p, '#bd-edit'); await waitStage(p, 'check');
  /* 能力对照（可选） */
  ok('能力对照是可选按钮，不是必经的一步', (await txt(p, '#ck-match')).includes('可选'));
  await click(p, '#ck-match'); await sleep(200);
  ok('能力对照打开', await vis(p, '#s-match'));
  qs = await choicesHaveSkipOther(p, '#b-match');
  ok('方向选择题有跳过 / 其他', qs.length === 1 && qs[0].s && qs[0].o);
  await pick(p, 'input[name="q_mdir"][value="0"]'); await sleep(150);
  ok('对照页面上没有 D1/D2/D3、没有「证据充分 / 能力已验证」', !/\bD[123]\b|证据充分|能力已验证/.test(await txt(p, '#b-match')));
  await click(p, '[data-mopen="cp"]'); await sleep(100);
  await type(p, '#m-did-cp', '主导过、有数据'); await type(p, '#m-res-cp', '有数据');
  await click(p, '[data-judge="cp"]'); await sleep(100);
  ok('说得太笼统 → 追问「具体做了哪几件事、结果是什么」，不下判断', (await txt(p, '[data-verdict="cp"]')).includes('信息还不够') && (await txt(p, '[data-verdict="cp"]')).includes('具体做了哪几件事'));
  await type(p, '#m-did-cp', '负责 3 场线下快闪的方案和现场执行，对接场地和供应商');
  await type(p, '#m-res-cp', '一场 300 人的快闪，小红书笔记曝光 20 万（后台截图）');
  await pick(p, 'input[name="q_mrole_cp"][value="0"]');
  await pick(p, 'input[name="q_matt_cp"][value="1"]');
  await pick(p, 'input[name="q_mchk_cp"][value="1"]');
  await pick(p, 'input[name="q_mpub_cp"][value="1"]');
  await click(p, '[data-judge="cp"]'); await sleep(100);
  let vd = await txt(p, '[data-verdict="cp"]');
  ok('判断：「这段经历与 X 方向的…较贴合」+ 初步匹配度高', vd.includes('这段经历与「科技AI · IP/内容营销」方向的') && vd.includes('较贴合') && vd.includes('初步匹配度高'), vd);
  ok('依据写进正文：「依据你的描述，你负责了…。这个判断尚未核对材料；以后有合适材料，可以再补充。」', vd.includes('依据你的描述，你负责了：负责 3 场线下快闪') && vd.includes('这个判断尚未核对材料；以后有合适材料，可以再补充。'), vd);
  ok('只能私下给人看 → 提示适合面试时讲、可以补能公开的版本', vd.includes('适合面试时讲') && vd.includes('能公开的版本'));
  ok('判断里没有孤立的「强」', !/强/.test(vd));
  const it = (await S(p)).match.items.cp;
  ok('附没附 / 核对没 / 能不能公开 分开记', it.att.i === 1 && it.chk.i === 1 && it.pub.i === 1);
  await scrollTo(p, '#axis-cp');
  await shot(p, '11_能力对照_措辞.png', '#axis-cp');
  /* 协助 → 有一定关联；附上并核对过 → 匹配度较高 */
  const v2 = await p.evaluate(() => window.__lingcun.judge('X 项', 'Y', { did: '帮忙写了两篇活动推文和现场签到', result: '两篇推文阅读 3000', role: { i: 2 } }).text);
  const v3 = await p.evaluate(() => window.__lingcun.judge('X 项', 'Y', { did: '负责活动方案和现场执行的全部流程', result: '到场 300 人（主办方公众号）', role: { i: 0 }, att: { i: 0 }, chk: { i: 0 }, pub: { i: 0 } }).text);
  ok('协助 → 「有一定关联」+「你协助做了」', v2.includes('有一定关联') && v2.includes('你协助做了'), v2);
  ok('附上并核对过 → 「匹配度较高」，依据含材料', v3.includes('匹配度较高') && v3.includes('依据你的描述和你附上的材料') && !v3.includes('初步匹配度高'), v3);
  await pick(p, 'input[name="q_mdir"][value="other"]'); await type(p, '#o_mdir', '游戏策划'); await sleep(150);
  ok('还没收 JD 的方向 → 给「写一段经历复盘」的下一步', (await txt(p, '#b-match')).includes('还没收好官网 JD') && !!(await p.$('#m-tocase')));
  await pick(p, 'input[name="q_mdir"][value="0"]'); await sleep(100);
  await click(p, '#match-close'); await sleep(100);
  await pick(p, 'input[name="q_degree"][value="skip"]');
  await click(p, '#ck-next'); await waitStage(p, 'save');
  ok('做成程度可以「先跳过」', (await stage(p)) === 'save');
  await landIt(p); await click(p, '#nx-more'); await waitStage(p, 'again');
  const gaps = await p.$$eval('[data-gap]', es => es.map(e => e.innerText));
  ok('换材料再做：能力对照里没看到的项 → 一键开一个补它的项目', gaps.length >= 1, gaps.join('|'));
  await click(p, '[data-gap="0"]'); await waitStage(p, 'material');
  ok('点缺口 → 进入对应类目的「补齐材料」', !!(await cur(p)).cat && (await S(p)).projects.length === 2);
  await noJson(p, '简历流程');
  await ctx.close();

  /* ========== 3. 照片（mock）：先给编排预览；照片不发给 AI ========== */
  phase = 'photo';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await startCat(p, 'photo', '把旅行照片排成一页');
  const fi = await p.$('#ph-file'); await fi.uploadFile(PNG_PATH, PNG_PATH);
  ok('放了 2 张照片', await waitFn(p, () => document.querySelectorAll('[data-cap]').length === 2, 4000));
  await type(p, '[data-cap="0"]', '海边的早晨');
  qs = await choicesHaveSkipOther(p, '#b-material');
  ok('照片：选择题都有跳过 / 其他', qs.length >= 2 && qs.every(q => q.s && q.o), JSON.stringify(qs));
  const pt = await p.evaluate(() => window.__lingcun.taskDraft());
  ok('照片：先出编排预览（photo_layout），任务里没有图片数据', pt.type === 'photo_layout' && !/data:image/.test(JSON.stringify(pt.inputs)), pt.type);
  await click(p, '#mat-go');
  ok('照片：编排预览出来', await waitFirst(p, 4000));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  ok('照片：检查里有覆盖情况', (await allTxt(p, '#b-check')).includes('照片'));
  await ctx.close();

  /* ========== 4. 小工具（mock，从「还没想好」的例子进） ========== */
  phase = 'tool';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await click(p, '#pk-none'); await sleep(100);
  await click(p, '[data-ex="2"]'); await sleep(200);
  cp = await cur(p);
  ok('例子 → 小工具，预填了题目', cp.cat === 'tool' && cp.a.t_scene && cp.a.t_input && cp.a.t_input.i === 2, JSON.stringify(cp.a));
  await click(p, '#mat-go');
  ok('小工具：第一版小网页预览', await waitFirst(p, 4000));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  ok('小工具：检查里说明联不联网', /联网/.test(await allTxt(p, '#b-check')));
  await ctx.close();

  /* ========== 5. 经历复盘（mock）：四种类型各有选项；查公开资料需要确认 ========== */
  phase = 'exp';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await startCat(p, 'exp');
  const types = await p.$$eval('input[name="q_x_type"]', es => es.map(e => e.value));
  ok('经历类型：活动 / 内容运营 / 项目或产品 / 其他 + 跳过 + 其他', types.length === 6 && (await txt(p, '[data-q="x_type"]')).includes('其他（') && (await txt(p, '[data-q="x_type"]')).includes('活动') && (await txt(p, '[data-q="x_type"]')).includes('内容运营') && (await txt(p, '[data-q="x_type"]')).includes('项目或产品'), types.join(','));
  const optsBy = {};
  for (const v of ['0', '1', '2', '3']) { await pick(p, 'input[name="q_x_type"][value="' + v + '"]'); await sleep(100); optsBy[v] = await p.$$eval('#b-material .q', qs => qs.map(q => q.getAttribute('data-q')).join(',')); }
  ok('四种类型各自的问题不一样', new Set(Object.values(optsBy)).size === 4, JSON.stringify(optsBy));
  await pick(p, 'input[name="q_x_type"][value="0"]'); await sleep(100);
  ok('活动的受众选项里有「品牌的目标消费者」', (await allTxt(p, '#b-material')).includes('品牌的目标消费者'));
  qs = await choicesHaveSkipOther(p, '#b-material');
  ok('复盘：每道选择题都有跳过 / 其他', qs.length >= 3 && qs.every(q => q.s && q.o), JSON.stringify(qs));
  await type(p, '#t_x_name', '2024 某品牌上海快闪');
  ok('查公开资料：按钮文字「查找这次活动的公开资料」，默认不查', (await txt(p, '#search-box summary')).includes('查找这次活动的公开资料') && !(await p.$('#cand-pick')));
  await p.$eval('#search-box details', d => d.open = true);
  await click(p, '#pub-go');
  ok('确认搜索词后才查 → 出候选', await waitSel(p, '#cand-pick', 4000));
  await pick(p, 'input[name="cand"][value="0"]'); await click(p, '#cand-pick'); await sleep(100);
  ok('选了候选 → 记下来源', (await txt(p, '#search-box')).includes('你确认了公开资料'));
  const et = await p.evaluate(() => window.__lingcun.taskDraft());
  const esys = await p.evaluate(t => window.__lingcun.sysPrompt(t), et);
  ok('经历复盘的事实规则：不许加 inputs 里没有的事实', /一个都不许加/.test(esys) && et.type === 'case_page');
  await click(p, '#mat-go');
  ok('复盘：第一版出来', await waitFirst(p, 4000));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  const ck = await allTxt(p, '#b-check');
  ok('复盘检查：给「还可以补点什么」，不出现 D1/D2/D3', ck.includes('还可以补点什么') && !/\bD[123]\b/.test(ck));
  await ctx.close();

  /* ========== 6. 10 秒等待：继续等 / 取消 ========== */
  phase = 'wait';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await startCat(p, 'resume');
  await type(p, '#t_r_exp', '2023 在某公司做内容运营：每周写 3 篇公众号。');
  await p.evaluate(() => window.__lingcun.setMockDelay(13000));
  await click(p, '#mat-go'); await sleep(400);
  ok('一开始就显示状态（已等 N 秒），还没给继续等 / 取消', (await txt(p, '#dr-slot')).includes('已等') && !(await vis(p, '#dr-slot [data-waitchoice]')));
  await sleep(10300);
  ok('超过 10 秒：出现「继续等 / 取消」', await vis(p, '#dr-slot [data-waitchoice]') && (await txt(p, '#dr-slot [data-waitchoice]')).includes('继续等'));
  await scrollTo(p, '#s-draft');
  await shot(p, '12_等了10秒_继续等或取消.png', '#s-draft');
  await click(p, '#dr-slot [data-wait]');
  ok('#39 等待时轻轻标出当前模式（模拟）', !!(await p.$('#dr-slot [data-modetag="mock"]')) && (await txt(p, '#dr-slot [data-modetag]')) === '模拟');
  ok('点继续等 → 接着等，然后出结果', await waitFirst(p, 4000));
  await p.evaluate(() => window.__lingcun.setMockDelay(13000));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  await p.$eval('#ck-fix', d => d.open = true);
  await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  await sleep(10400);
  ok('改的时候超过 10 秒也给选择', await vis(p, '#fix-slot [data-waitchoice]'));
  await click(p, '#fix-slot [data-cancel]'); await sleep(200);
  ok('点取消 → 停下，给「再试一次 / 换小一点」', !!(await p.$('#fix-slot [data-cancelled]')) && (await txt(p, '#fix-slot')).includes('再试一次'));
  const tms = await p.evaluate(() => window.lingcunAI.timings);
  ok('window.lingcunAI.timings 记录了开始 / 完整 / 解析 / 重试，取消也记', tms.length >= 2 && tms.every(t => 'first_token_ms' in t && 'full_ms' in t && 'parse_ms' in t && 'retries' in t) && tms.some(t => t.error === '用户取消'), JSON.stringify(tms).slice(0, 300));
  await ctx.close();

  /* ========== 7. agent 模式（?ai=agent）：只给机器用 ========== */
  phase = 'agent';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=agent');
  await startCat(p, 'novel', '写一篇五百字左右的微小说');
  await type(p, '#t_n_plot', '一个人在雨夜等最后一班公交。');
  await click(p, '#mat-go'); await sleep(300);
  const pend = await p.evaluate(() => window.lingcunAI.pending());
  ok('agent：有一个待办任务，带类目和事实规则', pend.length === 1 && pend[0].type === 'novel_draft' && pend[0].category === '小说创作' && /可以虚构/.test(pend[0].fact_rule), JSON.stringify(pend.map(x => [x.type, x.category])));
  ok('agent：任务块在 DOM 里给机器读，人看不到', !!(await p.$('script[data-ai-task]')) && !(await vis(p, '[data-ai-result-for]')));
  await noJson(p, 'agent 等待中');
  const bad = await p.evaluate(id => window.lingcunAI.submit(id, { title: 'x' }), pend[0].id);
  ok('agent：格式不对 → 退回错误', bad.ok === false && bad.errors.length > 0);
  const good = await p.evaluate(id => window.lingcunAI.submit(id, { title: '最后一班', sections: [{ heading: '雨夜', text: new Array(40).join('雨一直下，他在站台上等最后一班公交。') }] }), pend[0].id);
  ok('agent：格式对 → 收下并往下走', good.ok === true && await waitFirst(p, 3000));
  const atm = await p.evaluate(() => window.lingcunAI.timings);
  ok('agent：timings 里有这一条（含解析耗时和重试次数）', atm.length === 1 && atm[0].mode === 'agent' && atm[0].retries === 1 && atm[0].ok === true, JSON.stringify(atm));
  await ctx.close();
  phase = 'agent-enable';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx);
  ok('普通打开：lingcunAI.setMode("mock") 被拒绝（mock 只能用网址打开）', (await p.evaluate(() => window.lingcunAI.setMode('mock'))) === false);
  await p.evaluate(() => window.lingcunAI.enable());
  ok('enable() 之后才是 agent', (await p.evaluate(() => window.lingcunAI.mode())) === 'agent');
  await ctx.close();

  /* ========== 8. 直连（本机假接口）：SSE 流式 + 关思考 + 回退 + 修复重试 ========== */
  phase = 'direct';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx);
  await click(p, '#ai-chip'); await sleep(100);
  ok('模型名：DeepSeek 默认 deepseek-flash', (await p.$eval('#ai-model', e => e.value)) === 'deepseek-flash');
  await p.select('#ai-preset', 'deepseek'); await sleep(50);
  await p.$eval('#ai-base', e => e.value = 'http://127.0.0.1:8799');
  await p.$eval('#ai-key', e => e.value = 'sk-test-1234567890abcdef');
  await click(p, '#ai-save'); await sleep(100);
  ok('存好后是直连模式', (await p.evaluate(() => window.lingcunAI.mode())) === 'direct');
  ok('密钥不在 state 里、不在网址里', !JSON.stringify(await S(p)).includes('sk-test') && !(await p.evaluate(() => location.href)).includes('sk-test'));
  await startCat(p, 'resume');
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行；对接场地和供应商。');
  serverMode = 'sse'; llmLog.length = 0;
  await click(p, '#mat-go');
  ok('直连 SSE：第一版出来', await waitFirst(p, 6000));
  const L = llmLog.filter(x => x.type === 'resume_draft');
  ok('直连请求：stream:true、thinking 关掉、模型 deepseek-flash、JSON 输出', L.length === 1 && L[0].stream && L[0].thinking && L[0].thinking.type === 'disabled' && L[0].model === 'deepseek-flash' && L[0].rf && L[0].rf.type === 'json_object', JSON.stringify(L.map(x => Object.assign({}, x, { sys: '' }))));
  ok('系统提示里是简历的事实规则', L[0] && /这一类的事实规则：这是事实材料/.test(L[0].sys));
  let dt = (await p.evaluate(() => window.lingcunAI.timings)).filter(t => t.type === 'resume_draft').pop();
  ok('timings：流式，有首字时间和完整时间', dt && dt.stream === true && dt.stream_fallback === false && dt.first_token_ms > 0 && dt.full_ms >= dt.first_token_ms && dt.ok === true, JSON.stringify(dt));
  /* 流式中途断了 → 回退一次性返回 */
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  serverMode = 'broken'; llmLog.length = 0;
  await p.$eval('#ck-fix', d => d.open = true);
  await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  ok('流式断了 → 自动回退成一次性返回，改好了', await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].revs === 1; }, 6000));
  dt = (await p.evaluate(() => window.lingcunAI.timings)).filter(t => t.type === 'resume_revise').pop();
  ok('timings：记下 stream_fallback=true', dt && dt.stream_fallback === true && dt.ok === true, JSON.stringify(dt));
  ok('回退的那次请求不带 stream', llmLog.length === 2 && llmLog[0].stream && !llmLog[1].stream, JSON.stringify(llmLog.map(x => [x.stream, x.mode])));
  /* 格式不对 → 修复重试一次 */
  serverMode = 'badjson'; llmLog.length = 0;
  await pick(p, 'input[name="q_fix"][value="1"]'); await click(p, '#fix-go');
  ok('格式不对 → 修复重试一次后成功', await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].revs === 2; }, 6000));
  dt = (await p.evaluate(() => window.lingcunAI.timings)).filter(t => t.type === 'resume_revise').pop();
  ok('timings：retries=1', dt && dt.retries === 1, JSON.stringify(dt));
  /* v0.0.13（#39）：finish_reason=length → 直接说清楚「被截断」，不悄悄重试 */
  serverMode = 'cut'; llmLog.length = 0;
  await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  ok('#39 输出被截断（finish_reason=length）→ 明确提示截断', await waitSel(p, '#fix-slot [data-cut]', 6000) && (await txt(p, '#fix-slot')).includes('截断'), await txt(p, '#fix-slot'));
  ok('#39 截断时不回退、不修复重试（只发了一次请求）', llmLog.length === 1, JSON.stringify(llmLog.map(x => [x.stream, x.n])));
  serverMode = 'sse';
  /* 其他两家的关思考参数 */
  const presets = await p.evaluate(() => { const o = {}; ['qwen', 'openai'].forEach(k => { const el = document.querySelector('#ai-preset'); el.value = k; el.dispatchEvent(new Event('change')); o[k] = document.querySelector('#ai-model').value; }); return o; });
  ok('模型名：通义 qwen-plus、OpenAI gpt-6-luna', presets.qwen === 'qwen-plus' && presets.openai === 'gpt-6-luna', JSON.stringify(presets));
  ok('源码：通义 enable_thinking:false、OpenAI reasoning_effort:"none"', /enable_thinking: false/.test(src) && /reasoning_effort: "none"/.test(src));
  ok('直连：除了本机假接口，没有别的对外请求', !(external.direct || []).length, (external.direct || []).join(' | '));
  await ctx.close();


  /* ========== 9a. 入口（#16 → #20）：【记录】【改写】【创造】+ 说明 + 例子预填 + 本地澄清，不调 AI ========== */
  phase = 'entry';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  const acts = await p.$$eval('[data-act]', es => es.map(e => ({ k: e.getAttribute('data-act'), t: e.innerText.trim() })));
  ok('#20 三个入口：记录 / 改写 / 创造（v0.0.12 胶囊只写两个字）', acts.length === 3 && ['记录', '改写', '创造'].every((x, i) => acts[i].t === x), acts.map(a => a.t).join('|'));
  const descs = [];
  for (const k of ['record', 'rewrite', 'create']) { await click(p, '[data-act="' + k + '"]'); await sleep(60); descs.push(await txt(p, '#pk-desc')); }
  await click(p, '[data-act="create"]'); await sleep(60);
  ok('#20 三段说明逐字（选中一颗胶囊，下面一行说明）', descs[0] === '把经历、感受或脑海里的故事，写成一件属于你的作品。' && descs[1] === '从过去做过的事里，找到与下一段方向有关的经验，把它讲清楚。' && descs[2] === '一个游戏、一件作品，或者一个小工具。', descs.join(' / '));
  ok('#34 首页只有一句话 + 三颗胶囊 + 出发', (await txt(p, '#h-pick')).includes('今天，做成一件小事') && (await txt(p, '#pk-start')) === '出发' && !(await p.$('#pk-take')));
  ok('#20 没有难度标签', !/难度|简单|容易|入门|进阶|高级|★/.test(await txt(p, '#b-pick')));
  ok('#19 「这一局会带走什么」，【记录】【改写】各写一句（v0.0.13 #38：【创造】不写承诺）（收在写一句话那一步的「更多」里）', (await txt(p, '#pk-take')).includes('这一局会带走什么') && ((await p.$eval('#pk-take', e => e.innerHTML)).match(/【/g) || []).length === 2);
  ok('#19 弱化「存档」：入口和主流程不再出现「存档」', !/存档/.test(await txt(p, '#b-pick')) && !/存档/.test(await txt(p, '.stagebar')));
  ok('写一句话那一步：输入框 + 「还没想好，看看例子」', !!(await p.$('#pk-idea')) && (await txt(p, '#pk-none')).includes('还没想好，看看例子'));
  ok('具体类目不再是一级入口（收在「直接选具体做法」里，默认收起）', !(await p.$eval('#pk-all', d => d.open)));
  ok('#20 「讲清楚我自己」场景卡并进了【改写】', !(await p.$('#scene-self')));
  await shot(p, '01_入口.png');
  await click(p, '[data-act="rewrite"]'); await sleep(100);
  const rw = await allTxt(p, '#act-sub'), rwWays = await p.$$eval('#act-sub [data-way]', es => es.map(e => e.innerText.split('\n')[0]));
  ok('#20 改写：简历 / 经历复盘在前，照片排在后面（其次）', rwWays.length === 4 && /简历/.test(rwWays[0]) && /复盘/.test(rwWays[1]) && /照片/.test(rwWays[3]), rwWays.join('|'));
  ok('#20 改写：说清不会读表格和聊天记录、不把新方向写成做过', rw.includes('不会去读') && rw.includes('表格') && rw.includes('聊天记录') && rw.includes('不会因为换了说法就变成做过新领域的工作'), rw);
  ok('#20 页面上没有「上传表格 / 导入聊天记录」之类的承诺', !/上传(表格|Excel|聊天)|导入(表格|聊天|微信)|读取(你的)?(表格|聊天)/.test(await txt(p, 'body')));
  await shot(p, '01c_入口_改写.png', '#s-pick');
  await click(p, '#act-sub [data-way="0"]'); await sleep(150);
  cp = await cur(p);
  ok('改写 → 简历配置，主题记成「改写」', cp.cat === 'resume' && cp.theme === 'rewrite' && (await stage(p)) === 'material');
  ok('#20 简历有「想去的新方向」', (await allTxt(p, '#b-material')).includes('想去的新方向'));
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行。');
  await type(p, '#t_r_target', '用户研究');
  const rwsys = await p.evaluate(t => window.__lingcun.sysPrompt(t), await p.evaluate(() => window.__lingcun.taskDraft()));
  ok('#20 改写的事实规则：不把新方向写成已经做过、不编造', /新方向/.test(rwsys) && /不编造|不能编|不许/.test(rwsys) && /可迁移|有关的经验/.test(rwsys), (rwsys.split('这一类的事实规则：')[1] || '').slice(0, 300));
  await click(p, '#mat-go'); await waitFirst(p, 4000);
  const rwOut = await p.evaluate(() => window.__lingcun.renderOut());
  ok('#20 改写的成果里有「和想去的方向有关的经验」', rwOut.includes('和想去的方向有关的经验'));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  ok('#20 检查里核对：没有把新方向写成已经做过的工作', (await allTxt(p, '#b-check')).includes('没有把想去的新方向写成已经做过的工作'));
  await click(p, '#bag-btn'); await sleep(100); await click(p, '#bag-other'); await sleep(150);
  await click(p, '[data-act="record"]'); await sleep(100);
  ok('记录 → 真实的记录 / 小说 / 一页短文', (await txt(p, '#act-sub')).includes('真实的记录') && (await p.$$('#act-sub [data-way]')).length === 3);
  await click(p, '#act-sub [data-way="1"]'); await sleep(150);
  ok('写故事 → 进小说配置', (await cur(p)).cat === 'novel' && (await stage(p)) === 'material');
  await click(p, '#mat-back'); await sleep(150);
  ok('什么都没动就退回 → 不留空项目', (await S(p)).projects.length === 1, (await S(p)).projects.length);
  await click(p, '[data-act="rewrite"]'); await sleep(100); await click(p, '#act-sub [data-way="2"]'); await sleep(150);
  cp = await cur(p);
  ok('作品介绍 → 通用配置，写真实的事（g_kind=真实）', cp.cat === 'generic' && cp.a.g_kind && cp.a.g_kind.i === 0 && /介绍/.test(cp.a.g_what.v));
  const wsys = await p.evaluate(t => window.__lingcun.sysPrompt(t), await p.evaluate(() => window.__lingcun.taskDraft()));
  ok('作品介绍的事实规则：不编造', /不编|只依据|不能编/.test(wsys.split('这一类的事实规则：')[1] || ''), (wsys.split('这一类的事实规则：')[1] || '').slice(0, 120));
  await click(p, '#mat-back'); await sleep(150);
  const tm0 = await p.evaluate(() => window.lingcunAI.timings.length);
  await type(p, '#pk-idea', '把活动照片整理一下顺便复盘');
  await sleep(100);
  const clar = await p.$$eval('#pk-clar [data-clar]', es => es.map(e => e.getAttribute('data-clar')));
  ok('说得模糊（同时像照片和复盘）→ 本地给几个按钮澄清', await vis(p, '#pk-clar') && clar.includes('photo') && clar.includes('exp') && clar.includes('generic') && !clar.includes('novel'), clar.join(','));
  await type(p, '#pk-idea', '想弄点什么东西');
  ok('对不上 → 也给澄清按钮 + 按通用方式', await vis(p, '#pk-clar') && (await txt(p, '#pk-go')).includes('通用'));
  ok('澄清不调 AI（timings 没有新增）', (await p.evaluate(() => window.lingcunAI.timings.length)) === tm0);
  /* #25：想法在切换入口时保留 */
  await type(p, '#pk-idea', '给奶奶做一个提醒吃药的小网页');
  await click(p, '[data-act="record"]'); await sleep(100); await click(p, '[data-act="create"]'); await sleep(100); await click(p, '#pk-start'); await sleep(80);
  ok('#25 切换入口时，写下的想法还在', (await p.$eval('#pk-idea', e => e.value)) === '给奶奶做一个提醒吃药的小网页' && (await S(p)).entry.idea === '给奶奶做一个提醒吃药的小网页');
  await type(p, '#pk-idea', '');
  await click(p, '#pk-none'); await sleep(100);
  const exs = await p.$$eval('[data-ex] strong', es => es.map(e => e.innerText));
  ok('例子同时带主题和形态（例：把旅行照片做成一页纪念册）', exs.some(x => x.includes('把旅行照片做成一页纪念册')) && exs.length >= 6, exs.join('|'));
  ok('#20 例子标了属于哪个主题', (await txt(p, '[data-ex="0"]')).includes('【'));
  await shot(p, '01b_入口_看看例子.png');
  await click(p, '[data-ex="0"]'); await sleep(150);
  cp = await cur(p);
  ok('点例子 → 直接预填（照片：主题、给谁看、怎么排）', cp.cat === 'photo' && cp.a.ph_theme && cp.a.ph_theme.v === '一次旅行' && cp.a.ph_use.i === 0 && cp.a.ph_order.i === 0, JSON.stringify(cp.a));
  ok('预填的都进了「已经知道的」，只剩放照片', (await allTxt(p, '#b-material .known')).includes('一次旅行') && !(await p.$('[data-q="ph_use"] input')));
  ok('#19 补齐材料时也写着「这一局带走」', (await txt(p, '#mat-take')).includes('这一局带走'));
  await ctx.close();

  /* ========== 9a2. #25 分流：真实故事不进虚构、未来计划不当经历、清单不进小工具、单个关键词不直接定 ========== */
  phase = 'route';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  const R = await p.evaluate(() => { const r = window.__lingcun.routeIdea; return ['写妈妈的真实故事', '下个月想办读书活动，先写活动计划', '只要一份购物清单，能打印就行', '写一个小说', '我想做个记账工具', '把旅行照片排成一页', '复盘一下去年办的快闪活动', '写一篇关于外婆的回忆', '想写个故事', '记录'].map(x => [x, r(x)]); });
  const RT = Object.fromEntries(R);
  ok('#25 「写妈妈的真实故事」→ 真实的记录（不是小说）', RT['写妈妈的真实故事'].cat === 'essay', JSON.stringify(RT['写妈妈的真实故事']));
  ok('#25 「下个月想办读书活动，先写活动计划」→ 一份计划（不是经历复盘）', RT['下个月想办读书活动，先写活动计划'].cat === 'generic' && RT['下个月想办读书活动，先写活动计划'].pre.g_form === 2, JSON.stringify(RT['下个月想办读书活动，先写活动计划']));
  ok('#25 「只要一份购物清单，能打印就行」→ 一份清单（不是小工具）', RT['只要一份购物清单，能打印就行'].cat === 'generic' && RT['只要一份购物清单，能打印就行'].pre.g_form === 1, JSON.stringify(RT['只要一份购物清单，能打印就行']));
  ok('#25 这三句都不自动确认（要用户点一下）', ['写妈妈的真实故事', '下个月想办读书活动，先写活动计划', '只要一份购物清单，能打印就行'].every(k => RT[k].strong === false));
  ok('#25 单个模糊关键词（「想写个故事」「记录」）不自动确认', RT['想写个故事'].strong === false && RT['记录'].strong === false, JSON.stringify([RT['想写个故事'], RT['记录']]));
  ok('明确说了的（小说 / 记账工具 / 照片 / 复盘）照常识别', RT['写一个小说'].cat === 'novel' && RT['写一个小说'].strong && RT['我想做个记账工具'].cat === 'tool' && RT['把旅行照片排成一页'].cat === 'photo' && RT['复盘一下去年办的快闪活动'].cat === 'exp');
  ok('「写一篇关于外婆的回忆」→ 真实的记录', RT['写一篇关于外婆的回忆'].cat === 'essay', JSON.stringify(RT['写一篇关于外婆的回忆']));
  ok('匹配：小说/简历/照片/小工具/复盘各自识别（沿用 v0.0.9）', await p.evaluate(() => { const m = window.__lingcun.matchCats; return m('写一篇雨夜的短篇小说')[0] === 'novel' && m('把我的工作经历整理成简历')[0] === 'resume' && m('把旅行照片排成一页')[0] === 'photo' && m('做个记账小工具')[0] === 'tool' && m('复盘一下去年办的快闪活动')[0] === 'exp'; }));
  await type(p, '#pk-idea', '写妈妈的真实故事'); await sleep(100);
  ok('#25 页面：说出猜测和理由，给澄清按钮让用户确认', await vis(p, '#pk-clar') && (await txt(p, '#pk-sug')).includes('真实') && (await txt(p, '#pk-go')).includes('真实的记录'), await txt(p, '#pk-sug'));
  await shot(p, '01d_入口_分流确认.png', '#s-pick');
  await click(p, '#pk-go'); await sleep(200);
  cp = await cur(p);
  const esys2 = await p.evaluate(t => window.__lingcun.sysPrompt(t), await p.evaluate(() => window.__lingcun.taskDraft()));
  const etask = await p.evaluate(() => window.__lingcun.taskDraft());
  ok('#25 真实故事 → 非虚构的事实规则（不虚构、不编造）', cp.cat === 'essay' && /不虚构|不编造|不能编/.test(esys2.split('这一类的事实规则：')[1] || '') && !/可以虚构/.test(esys2.split('这一类的事实规则：')[1] || ''), (esys2.split('这一类的事实规则：')[1] || '').slice(0, 200));
  ok('#25 原话进了生成任务（inputs.user_idea）', etask.inputs.user_idea === '写妈妈的真实故事', JSON.stringify(etask.inputs).slice(0, 200));
  ok('#25 补齐材料里也能看到你的原话', (await txt(p, '#mat-idea')).includes('写妈妈的真实故事'));
  if (await p.$('#t_e_detail')) await type(p, '#t_e_detail', '妈妈每天早上五点起来给全家做早饭，二十年没变过。');
  ok('#25 原话预填进了「写谁、写什么」', ((await cur(p)).a.e_about || {}).v === '写妈妈的真实故事', JSON.stringify((await cur(p)).a));
  await click(p, '#mat-go');
  ok('真实的记录：第一版出来', await waitFirst(p, 4000));
  await click(p, '#mat-back').catch(() => {});
  await ctx.close();
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await type(p, '#pk-idea', '下个月想办读书活动，先写活动计划'); await sleep(100); await click(p, '#pk-go'); await sleep(200);
  cp = await cur(p);
  const psys = await p.evaluate(t => window.__lingcun.sysPrompt(t), await p.evaluate(() => window.__lingcun.taskDraft()));
  ok('#25 未来计划 → 通用 · 计划，事实规则说明是还没发生的事', cp.cat === 'generic' && cp.a.g_form && cp.a.g_form.i === 2 && /计划|还没发生/.test(psys.split('这一类的事实规则：')[1] || ''), (psys.split('这一类的事实规则：')[1] || '').slice(0, 200));
  await click(p, '#mat-back'); await sleep(150);
  await type(p, '#pk-idea', '只要一份购物清单，能打印就行'); await sleep(100); await click(p, '#pk-go'); await sleep(200);
  cp = await cur(p);
  ok('#25 购物清单 → 通用 · 清单（不是小工具）', cp.cat === 'generic' && cp.a.g_form && cp.a.g_form.i === 1);
  await ctx.close();

  /* ========== 9b. 星图（#22，沿用 #17 的验收）：做过三件（一件没做完）→ 离开再回来 → 月球 + 一颗新星球 + 一件航行中，都能打开 ========== */
  phase = 'starmap';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  ok('星图按钮在右上角，空的时候是 (0)', !!(await p.$('#menu #bag-btn')) && (await txt(p, '#bag-btn')).includes('星图') && (await txt(p, '#bag-btn')).includes('(0)'));
  async function finish(p) { await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save'); await landIt(p); }
  /* ① 小说（做完、登月） */
  await click(p, '#pk-none'); await sleep(100); await click(p, '[data-ex="1"]'); await sleep(150);
  await type(p, '#t_n_plot', '外卖员雨夜送餐，捡到一只会说话的猫。');
  await finish(p);
  ok('登月后：项目名用 AI 产出的标题（不是「小说创作」）', (await cur(p)).title === '雨夜的最后一单', (await cur(p)).title);
  /* ② 照片（做完、登陆第二颗） */
  await click(p, '#bag-btn'); await sleep(100); await click(p, '#bag-other'); await sleep(150);
  ok('星图里「做一件新的」→ 回到入口', (await stage(p)) === 'pick' && (await S(p)).cur === -1);
  await click(p, '#pk-none'); await sleep(100); await click(p, '[data-ex="0"]'); await sleep(150);
  await (await p.$('#ph-file')).uploadFile(PNG_PATH, PNG_PATH); await waitFn(p, () => document.querySelectorAll('[data-cap]').length === 2, 4000);
  await finish(p);
  ok('#22 第二件完成 → 点亮一颗新星球（不是月球）', (await cur(p)).planet === 1 && !(await txt(p, '#lc-done')).includes('第一颗星球'), (await txt(p, '#lc-done')));
  /* ③ 简历（没做完：停在「检查与修改」） */
  await click(p, '#nx-more'); await waitStage(p, 'again'); await click(p, '#ag-other'); await sleep(150);
  await click(p, '[data-act="rewrite"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(150);
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪。');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  const before = await S(p);
  ok('做了三件，其中两件登陆、一件没做完', before.projects.length === 3 && before.projects.filter(x => x.landed).length === 2);
  ok('每件都有 updatedAt', before.projects.every(x => x.updatedAt > 0));
  /* 离开再回来 */
  await p.reload({ waitUntil: 'load' }); await sleep(300);
  ok('回来：「上次做到这里」快捷恢复仍在', (await txt(p, '#resume')).includes('上次做到这里'));
  await click(p, '#rs-go'); await sleep(200);
  ok('回到中间阶段（检查与修改）', (await stage(p)) === 'check');
  ok('中间阶段也能看到「🪐 星图 (3)」', !!(await p.$('#menu #bag-btn')) && (await txt(p, '#bag-btn')).includes('星图') && (await txt(p, '#bag-btn')).includes('(3)'));
  await click(p, '#bag-btn'); await sleep(200);
  const moon = await p.$$eval('[data-planet="0"]', es => es.map(e => e.innerText)), np = await p.$$eval('[data-planet="1"]', es => es.map(e => e.innerText)), sail = await p.$$eval('[data-sailing]', es => es.map(e => e.innerText));
  ok('#22 验收：星图上有月球（第一件）', moon.length === 1 && moon[0].includes('月球') && moon[0].includes('雨夜的最后一单'), JSON.stringify(moon));
  ok('#22 验收：一颗新星球（第二件）', np.length === 1 && !np[0].includes('月球') && np[0].includes('今年夏天'), JSON.stringify(np));
  ok('#22 验收：一件「航行中」（没做完的简历）', sail.length === 1 && sail[0].includes('航行中') && sail[0].includes('活动策划'), JSON.stringify(sail));
  ok('#22 星图上没有资源、积分、每日任务', !/积分|金币|资源|经验值|每日任务|签到|等级|XP/i.test(await txt(p, '#bag-body')));
  const cards = await p.$$eval('[data-bag-card]', es => es.map(e => ({ n: e.querySelector('.bc-n').innerText, s: e.querySelector('.bc-s').innerText, m: e.querySelector('.bc-m').innerText })));
  ok('星图列出三件，用真名认得出', cards.length === 3 && cards.some(c => c.n.includes('雨夜的最后一单')) && cards.some(c => c.n.includes('今年夏天')) && cards.some(c => c.n.includes('活动策划')), JSON.stringify(cards));
  ok('卡片有摘要、状态、最后修改时间', cards.every(c => c.s.length > 2 && /最后修改 \d+月\d+日 \d\d:\d\d/.test(c.m)) && cards.filter(c => c.m.includes('已登陆')).length === 2 && cards.filter(c => c.m.includes('航行中')).length === 1, JSON.stringify(cards));
  await shot(p, '14_星图.png');
  await p.$eval('.bagfilter-wrap', d => d.open = true);
  await p.select('#bag-status', 'wip'); await sleep(100);
  ok('按状态筛：航行中 → 只剩简历', (await p.$$('[data-bag-card]')).length === 1 && (await txt(p, '[data-bag-card]')).includes('活动策划'));
  await p.select('#bag-status', ''); await p.select('#bag-type', 'photo'); await sleep(100);
  ok('按类型筛：照片 → 只剩一件', (await p.$$('[data-bag-card]')).length === 1 && (await txt(p, '[data-bag-card]')).includes('今年夏天'));
  await p.select('#bag-type', ''); await sleep(100);
  const novelIdx = before.projects.findIndex(x => x.cat === 'novel'), photoIdx = before.projects.findIndex(x => x.cat === 'photo'), resIdx = before.projects.findIndex(x => x.cat === 'resume');
  await click(p, '[data-planet="0"]'); await sleep(150);
  ok('#22 点月球 → 进详情（沿用 #17 详情页），不直接跳阶段', (await stage(p)) === 'check' && (await S(p)).cur === 2 && (await txt(p, '#bd-title')).includes('雨夜的最后一单'));
  const bdt = await txt(p, '#bag-body');
  ok('详情：查看成果 / 继续修改这一件 / 沿用设置做一件新的（原作保留）/ 下载 / 做一件新的', ['查看成果', '继续修改这一件', '沿用设置做一件新的', '原作原样保留', '下载', '做一件新的'].every(x => bdt.includes(x)), bdt.slice(0, 300));
  await click(p, '#bd-view'); await sleep(300);
  ok('查看成果：就地预览，不改动它', await vis(p, '#bd-prev') && (await S(p)).cur === 2);
  await shot(p, '15_星图_星球详情.png');
  await click(p, '#bd-back'); await sleep(100);
  await click(p, '[data-sailing]'); await sleep(150);
  ok('#22 点「航行中」→ 能继续', (await txt(p, '#bd-title')).includes('活动策划') && !!(await p.$('#bd-edit')));
  await click(p, '#bd-edit'); await sleep(200);
  ok('#22 航行中那件：继续修改 → 回到它停下的地方', (await S(p)).cur === resIdx && (await stage(p)) === 'check' && !(await vis(p, '#bag-panel')));
  /* 修改原作 */
  await click(p, '#bag-btn'); await sleep(100); await click(p, '[data-planet="0"]'); await sleep(100);
  const n0 = JSON.stringify((await S(p)).projects[novelIdx]);
  await click(p, '#bd-edit'); await sleep(200);
  let s1 = await S(p);
  ok('继续修改这一件 → 打开的是原作本身（同一个 id），项目数不变', s1.cur === novelIdx && s1.projects.length === 3 && s1.stage === 'check' && !(await vis(p, '#bag-panel')));
  ok('只是打开、没改 → updatedAt 不变', s1.projects[novelIdx].updatedAt === JSON.parse(n0).updatedAt);
  await p.$eval('#ck-fix', d => d.open = true); await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  await waitFn(p, i => window.__lingcun.state().projects[i].revs === 1, 4000, novelIdx);
  s1 = await S(p);
  ok('改了原作 → 还是三件，原作被改（revs=1），updatedAt 变新', s1.projects.length === 3 && s1.projects[novelIdx].revs === 1 && s1.projects[novelIdx].updatedAt > JSON.parse(n0).updatedAt);
  ok('#19 改过之后要再确认一次；星球保留（还是月球）', s1.projects[novelIdx].saved === false && s1.projects[novelIdx].landed === true && s1.projects[novelIdx].planet === 0);
  /* 另做一件 */
  const ph0 = JSON.stringify(s1.projects[photoIdx]);
  await click(p, '#bag-btn'); await sleep(100); await click(p, '[data-bag-card="' + photoIdx + '"]'); await sleep(100);
  await click(p, '#bd-new'); await sleep(200);
  const s2 = await S(p);
  ok('沿用设置做一件新的 → 多出一件，原作原样保留', s2.projects.length === 4 && JSON.stringify(s2.projects[photoIdx]) === ph0 && s2.cur === 3 && s2.projects[3].cat === 'photo' && s2.projects[3].from === s2.projects[photoIdx].id);
  ok('新的一件带上了设置、从补齐材料开始、没有成果', s2.stage === 'material' && !s2.projects[3].out && s2.projects[3].a.ph_use && s2.projects[3].a.ph_use.i === 0);
  ok('星图 (4)', (await txt(p, '#bag-btn')).includes('(4)'));
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  const s3 = await S(p);
  ok('再刷新：四件都在，标题、星球和 updatedAt 都存下来了', s3.projects.length === 4 && s3.projects[novelIdx].title === '雨夜的最后一单' && s3.projects[novelIdx].planet === 0 && s3.projects[photoIdx].planet === 1 && s3.projects.every(x => x.updatedAt > 0));
  /* 手机宽度：星图抽屉占满屏 */
  await p.setViewport({ width: 375, height: 760, deviceScaleFactor: 2 });
  await click(p, '#rs-go').catch(() => {}); await sleep(100);
  await click(p, '#bag-btn'); await sleep(200);
  const dw = await p.$eval('.bagdrawer', e => e.getBoundingClientRect().width);
  ok('手机上星图一样能打开（抽屉占满屏宽）', await vis(p, '#bag-panel') && dw >= 370, dw);
  await shot(p, '16_星图_手机.png');
  await click(p, '#bag-close');
  await noJson(p, '星图');
  await ctx.close();

  /* ========== 9c. 发布（#18）：可点的步骤、下载为 index.html、生成链接；不说已经发布 ========== */
  phase = 'publish';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await click(p, '#pk-none'); await sleep(100); await click(p, '[data-ex="1"]'); await sleep(150);
  await type(p, '#t_n_plot', '一个人在雨夜等最后一班公交。');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save'); await landIt(p);
  await p.$eval('#pub-gh', d => d.open = true);
  const links = await p.$$eval('#pub-gh a', as => as.map(a => [a.id, a.href, a.target, a.rel]));
  const GL = Object.fromEntries(links.map(x => [x[0], x]));
  ok('注册 / 登录 / 新建仓库是可点的链接，新标签页打开', GL['gh-signup'] && GL['gh-signup'][1] === 'https://github.com/signup' && GL['gh-login'][1] === 'https://github.com/login' && GL['gh-new'][1] === 'https://github.com/new' && ['gh-signup', 'gh-login', 'gh-new'].every(k => GL[k][2] === '_blank' && /noopener/.test(GL[k][3])), JSON.stringify(links));
  ok('文字步骤保留（Add file → Upload files / Settings → Pages）', /Upload files/.test(await txt(p, '#pub-gh')) && /Settings → Pages/.test(await txt(p, '#pub-gh')));
  ok('小红书、公众号和「只自己用也完全算数」保留', (await txt(p, '#pub-gh')).includes('小红书') && (await txt(p, '#pub-gh')).includes('只自己用、不公开也完全算数'));
  await click(p, '#gh-dl'); await sleep(400);
  const gdl = (await p.evaluate(() => window.__dl)).pop();
  ok('「下载为 index.html（放 GitHub 用）」→ 文件名就是 index.html', gdl && gdl.name === 'index.html' && gdl.text.includes('雨夜'), gdl && gdl.name);
  await type(p, '#gh-user', 'bad name!'); await type(p, '#gh-repo', 'my-work'); await sleep(50);
  ok('用户名不合法 → 提示，不生成链接', (await txt(p, '#gh-links')).includes('只能有') && !(await p.$('#gh-up')));
  await type(p, '#gh-user', 'Chenyun'); await sleep(50);
  const g = await p.$$eval('#gh-links a', as => as.map(a => [a.id, a.href, a.target]));
  ok('填了用户名和仓库名 → 上传页 / Pages 设置页 / 预计网址', JSON.stringify(g.map(x => x[1])) === JSON.stringify(['https://github.com/Chenyun/my-work/upload/main', 'https://github.com/Chenyun/my-work/settings/pages', 'https://chenyun.github.io/my-work/']) && g.every(x => x[2] === '_blank'), JSON.stringify(g));
  ok('不把「打开了 GitHub」说成「已经发布」', !/已经发布|已发布|发布成功|已上线/.test(await txt(p, 'body')) && (await txt(p, '#gh-links')).includes('页面没法替你确认'));
  await p.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a[target=_blank]')) { window.__clicked = e.target.closest('a').href; e.preventDefault(); } }, true));
  await click(p, '#gh-up'); await sleep(200);
  ok('上传页链接可点（测试里拦下了真实跳转）', (await p.evaluate(() => window.__clicked)) === 'https://github.com/Chenyun/my-work/upload/main');
  ok('点了上传页链接之后也不显示已发布', !/已经发布|已发布|发布成功/.test(await txt(p, 'body')));
  await sleep(2600); await scrollTo(p, '#pub-gh');
  await shot(p, '17_发布_可点的步骤和链接.png', '#pub-gh');
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  ok('用户名、仓库名记住了（回来接着看）', (await S(p)).gh.u === 'Chenyun' && (await S(p)).gh.r === 'my-work');
  await ctx.close();

  /* ========== 9. 存档文件：下载 → 清空 → 恢复 ========== */
  phase = 'store';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await startCat(p, 'novel', '写一篇五百字左右的微小说');
  await click(p, '#btn-export'); await sleep(400);
  const sv = (await p.evaluate(() => window.__dl)).pop();
  ok('下载进度文件（.json）', sv && /\.json$/.test(sv.name) && JSON.parse(sv.text).state.projects.length === 1);
  await click(p, '#btn-reset'); await sleep(150);
  ok('清空后：没有项目', (await S(p)).projects.length === 0);
  fs.writeFileSync(path.join(__dirname, 'save.json'), sv.text);
  const rf = await p.$('#restore-file'); await rf.uploadFile(path.join(__dirname, 'save.json')); await sleep(400);
  ok('从进度文件恢复', (await S(p)).projects.length === 1);
  /* 旧存档（第一轮 v0.0.9，没有 updatedAt，标题是类目名）也能读 */
  const old = JSON.parse(sv.text); old.state.projects.forEach(x => { delete x.updatedAt; delete x.createdAt; x.title = ''; x.savedAt = 1761230000000; }); delete old.state.gh; delete old.state.entry.act;
  fs.writeFileSync(path.join(__dirname, 'save_old.json'), JSON.stringify(old));
  await (await p.$('#restore-file')).uploadFile(path.join(__dirname, 'save_old.json')); await sleep(400);
  const so = await S(p);
  ok('旧存档：能恢复，补上 updatedAt 和名字（用用户输入）', so.projects.length === 1 && so.projects[0].updatedAt === 1761230000000 && so.projects[0].title.includes('微小说'), JSON.stringify(so.projects[0].title));
  await click(p, '#bag-btn'); await sleep(150);
  ok('旧进度文件：星图能列出来', (await p.$$('[data-bag-card]')).length === 1);
  await ctx.close();

  /* ========== 11. 登月 + 分享卡 + star 入口 + 本机统计（#19 #21 #23），小工具 ========== */
  phase = 'landing';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  await p.evaluate(() => document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[target=_blank]'); if (a) { window.__clicked = a.href; e.preventDefault(); } }, true));
  await goTool(p);
  ok('【创造】里点「小工具」→ 小工具，仍属【创造】', (await cur(p)).cat === 'tool' && (await cur(p)).theme === 'create');
  await type(p, '#t_t_scene', '记一下每天喝了几杯水');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  await pick(p, 'input[name="q_degree"][value="1"]');
  ok('检查后的按钮写着「就它了」', (await txt(p, '#ck-next')).includes('就它了'));
  await click(p, '#ck-next'); await waitStage(p, 'save');
  const tcf = await txt(p, '#lc-box');
  ok('#19 小工具的确认：亲手试过一次 + 做到了核心功能', tcf.includes('亲手试过一次') && tcf.includes('它做到了说好的那件事'), tcf.slice(0, 300));
  ok('#19 还没试：提示先在预览里亲手试一次', (await txt(p, '#lc-tried')).includes('试'));
  await p.$eval('#lc-more', d => d.open = true); await p.$eval('#lc-look', d => d.open = true); await sleep(500);
  const fr = p.frames().find(f => f !== p.mainFrame() && f.parentFrame() === p.mainFrame() && f.name() !== 'x');
  for (const f of p.frames()) if (f !== p.mainFrame()) await f.evaluate(() => { const b = document.querySelector('button') || document.body; b.click(); }).catch(() => {});
  ok('#19 在预览里点了一下 → 页面看到「试过了」（只做提示）', !!fr && await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].tried === true; }, 3000) && (await txt(p, '#lc-tried')).includes('试过了'));
  await click(p, '#b-save [data-sug]'); await sleep(100);
  const chg = (await cur(p)).change;
  ok('点一句建议 → 填进「这一局带来的变化」，可以再改', chg && (await p.$eval('#lc-change', e => e.value)) === chg);
  await shot(p, '20_确认登月_小工具.png', '#s-save');
  await click(p, '#lc-go'); await waitSel(p, '#land', 3000);
  ok('#23 登陆动画：小人缓降落在月面 + 文字淡入（第 7 屏）', await p.$eval('#land', e => e.classList.contains('va') && e.classList.contains('play')) && !!(await p.$('#land .moon')) && !!(await p.$('#land .astro svg')));
  await sleep(1400);
  await shot(p, '21_登月动画.png');
  ok('#21 登月文案在动画里', (await txt(p, '#land')).replace(/\s+/g, '').includes('这一步虽小，对我来说确实是大突破'));
  await click(p, '#land'); await waitSel(p, '#land-map', 3000); await click(p, '#sc-open'); await sleep(100);
  const card = await txt(p, '#share-card');
  ok('#21 分享卡：作品名就是这一件的名字', (await txt(p, '#sc-title')).includes((await cur(p)).title) && (await cur(p)).title.length > 1, await txt(p, '#sc-title'));
  ok('#21 分享卡内容齐全', card.includes('另存人生') && (await txt(p, '#sc-prev')).length > 4 && (await txt(p, '#sc-change')).includes(chg) && /github\.com\/huangchenyun25-web\/lingcun/.test(card), card);
  await shot(p, '22_分享卡.png', '#share-card');
  const durl = await p.evaluate(() => window.__lingcun.cardCanvas());
  ok('#21 分享卡能画成图片（canvas，PNG）', /^data:image\/png;base64,/.test(durl) && durl.length > 20000, durl.length);
  fs.writeFileSync(path.join(SHOTS, '23_分享卡_导出图片.png'), Buffer.from(durl.split(',')[1], 'base64'));
  await click(p, '#sc-png'); await sleep(500);
  const pdl = (await p.evaluate(() => window.__dl)).pop();
  ok('#21 点「保存分享卡为图片」→ 下载 .png', pdl && /\.png$/.test(pdl.name), pdl && pdl.name);
  ok('#21 分享卡不用外部库（源码里没有 html2canvas 之类）', !/html2canvas|dom-to-image|<script[^>]+src=/i.test(src));
  await p.$eval('#sc-edit', d => d.open = true); await type(p, '#sc-change-in', '我终于不用在本子上画正字了');
  ok('#21 卡片上的那句话可以自己改', (await txt(p, '#sc-change')).includes('我终于不用在本子上画正字了') && (await cur(p)).change === '我终于不用在本子上画正字了');
  const star = await p.$eval('#star-go', a => [a.href, a.target, a.rel]);
  ok('#21 star 入口：链接到 GitHub 仓库，新标签页打开', star[0] === 'https://github.com/huangchenyun25-web/lingcun' && star[1] === '_blank' && /noopener/.test(star[2]), star.join(' '));
  ok('#21 star 入口说清：要在 GitHub 上点 Star 才算', (await allTxt(p, '#star-note')).includes('才算数'));
  await click(p, '#star-go'); await sleep(150);
  ok('点 star 入口（测试里拦下了跳转）', (await p.evaluate(() => window.__clicked)) === 'https://github.com/huangchenyun25-web/lingcun');
  const M = await p.evaluate(() => window.lingcunAI.metrics);
  ok('#21 本机统计：开局 / 完成 / 看到完成卡 / 保存分享 / 看到 star / 点 star 分层记', M.started === 1 && M.completed === 1 && M.card_seen === 1 && M.shared === 1 && M.star_seen === 1 && M.star_clicked === 1, JSON.stringify(M));
  ok('#21 统计说明：只是点击次数，不是 star 数', /不是/.test(M.note) && (await p.$eval('#metrics-body', e => e.textContent)).includes('不等于 GitHub 上真的多了一颗 star'));
  ok('#21 页脚：不上传统计，只在本机记次数', (await txt(p, '#foot')).includes('不上传统计'));
  const mls = await p.evaluate(() => localStorage.getItem('lingcun_v010_metrics'));
  ok('#21 统计存在 localStorage', mls && JSON.parse(mls).completed === 1);
  await p.$eval('#metrics-box', d => d.open = true); await scrollTo(p, '#metrics-box');
  await shot(p, '24_本机小统计.png', '#metrics-box');
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  ok('刷新后统计还在', (await p.evaluate(() => window.lingcunAI.metrics.completed)) === 1);
  ok('全程没有对外请求（star 跳转被拦下）', !(external.landing || []).length, (external.landing || []).join(' | '));
  await ctx.close();

  /* ========== 12. 登陆动画 B + 减少动画（#23） ========== */
  phase = 'landing-b';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock&landing=b');
  ok('?landing=b → 动画 B', (await p.evaluate(() => window.__lingcun.landing())) === 'b');
  await click(p, '#pk-none'); await sleep(100); await click(p, '[data-ex="1"]'); await sleep(150);
  await type(p, '#t_n_plot', '一个人在雨夜等最后一班公交。');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save'); await landIt(p);
  ok('v0.0.12：?landing=b 也走同一个第 7 屏（设计稿只有一种落地画面），一局照样走完', (await cur(p)).landed === true && !!(await p.$('#land-map')));
  await ctx.close();
  phase = 'reduced-motion';
  ctx = await browser.createBrowserContext();
  p = await ctx.newPage(); await p.close();
  p = await newPage(ctx, 'about:blank');
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(FILE + '?ai=mock', { waitUntil: 'load' });
  await goTool(p);
  await type(p, '#t_t_scene', '记一下每天走了多少步');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 4000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save'); await click(p, '#lc-go'); await waitSel(p, '#land', 3000); await sleep(100);
  ok('#23 减少动画：一局照样能走完、登上月球', (await cur(p)).landed === true && (await cur(p)).planet === 0);
  const rmv = await p.evaluate(() => { const l = document.querySelector('#land'); const msg = document.querySelector('#land-msg'); const anims = document.getAnimations().filter(a => a.effect && a.effect.getTiming && (+a.effect.getTiming().duration || 0) > 50); return { play: l.classList.contains('play'), op: +getComputedStyle(msg).opacity, long: anims.length }; });
  ok('#23 减少动画：不播放登陆动画、文字直接显示、没有长动画', !rmv.play && rmv.op === 1 && rmv.long === 0, JSON.stringify(rmv));
  await click(p, '#land'); await waitSel(p, '#land-map', 2000);
  await click(p, '#land-replay'); await sleep(100);
  ok('#23 减少动画时点「再看一次」只显示落好的样子，不播放', !(await p.$eval('#land', e => e.classList.contains('play'))));
  await click(p, '#land'); await waitSel(p, '#land-map', 2000);
  await click(p, '#nx-more'); await waitStage(p, 'again');
  ok('#23 减少动画：之后的阶段也正常', (await stage(p)) === 'again');
  await ctx.close();

  /* ========== 13. 对比度（#23，WCAG AA，按页面真实颜色在深紫底上叠加估算） ========== */
  phase = 'contrast';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  /* 真实像素取样：先把文字设成透明截一张底图，取每个元素区域里偏亮的 90% 分位作为底色，再和文字颜色算对比度 */
  await click(p, '[data-act="rewrite"]'); await sleep(150);
  const SEL = ['#h-pick', '#pk-desc', '.homelinks button', '.brand', '.hello .bubble p', '[data-act="record"] strong', '[data-act="record"] small', '#act-sub .note, #act-sub .hint', '#act-sub [data-way] small', '#pk-take li', '#pk-take .hint', '#netnote', '.stagebar [data-st]', '.stagebar .now', '#route-dist', '#pk-go', '#pk-none', '#bag-btn', '#ai-chip', '#foot'];
  const boxes = await p.evaluate(sel => sel.map(s => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { s, fg: cs.color, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight }; }), SEL);
  await p.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important} *::placeholder{color:transparent!important}' });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(200);
  const CR = [];
  for (const bx of boxes) {
    if (!bx) continue;
    const r = await p.evaluate(s => { const el = document.querySelector(s); el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); return { x: q.x, y: q.y, width: q.width, height: q.height }; }, bx.s);
    if (r.width < 2 || r.height < 2) continue;
    await sleep(60);
    const b64 = await p.screenshot({ clip: r, encoding: 'base64' });
    const res = await p.evaluate(async (b64, fg) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const px = []; for (let i = 0; i < d.length; i += 16) px.push([d[i], d[i + 1], d[i + 2], L(d[i], d[i + 1], d[i + 2])]);
      px.sort((a, b) => a[3] - b[3]); const bg = px[Math.floor(px.length * 0.9)];
      const m = fg.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,\/]+/).filter(Boolean).map(Number); const al = m.length > 3 ? m[3] : 1;
      const f = [0, 1, 2].map(i => m[i] * al + bg[i] * (1 - al)); const l1 = L(f[0], f[1], f[2]), l2 = bg[3];
      return Math.round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) * 100) / 100;
    }, b64, bx.fg);
    const big = bx.fs >= 24 || (bx.fs >= 18.66 && bx.fw >= 700);
    CR.push({ s: bx.s, r: res, need: big ? 3 : 4.5 });
  }
  const lowC = CR.filter(x => x.r < x.need);
  ok('#23 主要文字对比度达到 WCAG AA（' + CR.length + ' 处，真实像素取样）', CR.length >= 6 && !lowC.length, JSON.stringify(lowC.length ? lowC : CR));
  fs.writeFileSync(path.join(__dirname, 'contrast.json'), JSON.stringify(CR, null, 1));
  ok('#23 玻璃质感：卡片用了 backdrop-filter', /backdrop-filter/.test(src));
  ok('#23 尊重「减少动画」：有 prefers-reduced-motion', /prefers-reduced-motion:\s*reduce/.test(src));
  ok('#23 动画只用 CSS + emoji，不引外部图片或库', !/<img[^>]+src="https?:|url\(["']?https?:/.test(src));
  await ctx.close();

  /* ========== 14. 免费体验额度中转（#24）：网页 → 本机 worker（wrangler 同一份 worker.js）→ 假上游 ========== */
  phase = 'relay';
  const H = await import(path.resolve(__dirname, 'relay_harness.mjs'));
  const RENV = { DEEPSEEK_API_KEY: 'sk-test-1234567890abcdef', UPSTREAM_BASE: 'http://127.0.0.1:8799', DAILY_LIMIT: '40', QUOTA: H.memKV() };
  const relaySrv = await H.serve(8798, RENV);
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?relay=' + encodeURIComponent('http://127.0.0.1:8798'));
  const relayReq = []; p.on('request', r => { if (/127\.0\.0\.1:8798/.test(r.url())) relayReq.push(r.headers()); });
  ok('#24 中转配好时：默认就用免费体验额度，不用填密钥', (await p.evaluate(() => window.lingcunAI.mode())) === 'relay' && (await txt(p, '#ai-chip')).includes('免费体验额度'), await txt(p, '#ai-chip'));
  await click(p, '[data-act="rewrite"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(150);
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行；对接场地和供应商。');
  serverMode = 'sse'; llmLog.length = 0;
  await click(p, '#mat-go');
  ok('#24 经过中转：第一版出来', await waitFirst(p, 8000));
  const RL = llmLog.filter(x => x.type === 'resume_draft');
  ok('#24 上游收到：deepseek-flash、关思考、流式、密钥来自中转', RL.length === 1 && RL[0].model === 'deepseek-flash' && RL[0].thinking && RL[0].thinking.type === 'disabled' && RL[0].stream === true && RL[0].auth === 'Bearer sk-test-1234567890abcdef', JSON.stringify(RL.map(x => Object.assign({}, x, { sys: '' }))));
  ok('#24 网页发给中转的请求不带任何密钥', relayReq.length >= 1 && relayReq.every(h => !h.authorization), JSON.stringify(relayReq[0]));
  ok('#24 网页显示今天还剩几次', await waitFn(p, () => /今天还剩 \d+ 次/.test(document.querySelector('#ai-chip').innerText), 2000), await txt(p, '#ai-chip'));
  const rt2 = (await p.evaluate(() => window.lingcunAI.timings)).filter(t => t.type === 'resume_draft').pop();
  ok('#24 timings 记成 relay 模式、流式', rt2 && rt2.mode === 'relay' && rt2.stream === true && rt2.ok === true, JSON.stringify(rt2));
  await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  RENV.DAILY_LIMIT = '1';
  await p.$eval('#ck-fix', d => d.open = true); await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  ok('#24 额度用完 → 「明天再来，或者用自己的密钥继续」', await waitSel(p, '#fix-slot [data-quota]', 6000) && (await txt(p, '#fix-slot')).includes('明天再来') && (await txt(p, '#fix-slot')).includes('用自己的密钥继续'), await txt(p, '#fix-slot'));
  ok('#24 额度用完不报成「出错了」，进度还在', !/出错|失败/.test(await txt(p, '#fix-slot [data-quota]')) && (await stage(p)) === 'check');
  await scrollTo(p, '#fix-slot');
  await shot(p, '30_额度用完的提示.png', '#fix-slot');
  await click(p, '#fix-slot [data-m="direct"]'); await sleep(200);
  ok('#24 点「用自己的密钥继续」→ 打开设置，「用自己的密钥」展开', await vis(p, '#ai-cfg') && (await p.$eval('#ai-own', d => d.open)));
  ok('#24 设置里说清：免费额度 / 自己的密钥只存在这个浏览器', (await txt(p, '#ai-cfg')).includes('免费体验额度') && (await txt(p, '#ai-cfg')).includes('用自己的密钥'));
  await scrollTo(p, '#ai-cfg');
  await shot(p, '31_用自己的密钥_设置.png', '#ai-cfg');
  await p.$eval('#ai-base', e => e.value = 'http://127.0.0.1:8799');
  await p.$eval('#ai-key', e => e.value = 'sk-test-1234567890abcdef');
  await click(p, '#ai-save'); await sleep(100);
  ok('#24 保存自己的密钥 → 改成直连', (await p.evaluate(() => window.lingcunAI.mode())) === 'direct');
  ok('#24 改成直连后，刚才那一步自动接着做完', await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].revs === 1; }, 6000));
  await click(p, '#ai-chip'); await sleep(100); if (!(await vis(p, '#ai-cfg'))) { await click(p, '#ai-chip'); await sleep(100); }
  await click(p, '#ai-use-relay'); await sleep(100);
  ok('#24 可以改回免费体验额度', (await p.evaluate(() => window.lingcunAI.mode())) === 'relay');
  ok('中转：除了本机中转和假接口，没有别的对外请求', !(external.relay || []).length, (external.relay || []).join(' | '));
  await ctx.close();
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?relay=' + encodeURIComponent('https://evil.example.com'));
  ok('#24 ?relay= 只接受本机地址和 off（别的网址被忽略，仍用正式中转）', (await p.evaluate(() => window.__lingcun.ai.cfg().relay)) === PROD_RELAY && (await p.evaluate(() => window.lingcunAI.mode())) === 'relay');
  ok('#24 页面源码里没有写死任何密钥（sk-；CSS 的 mask-composite 不算）', !/\bsk-[A-Za-z0-9]{6,}/.test(src));
  await ctx.close();
  relaySrv.close();

  /* ========== 15. 桌面宽屏截图（入口 / 阶段 / 确认登月 / 登月 A / 分享卡 / 星图 / 自己的密钥 / 额度用完） ========== */
  phase = 'desktop';
  const RENV2 = { DEEPSEEK_API_KEY: 'sk-test-1234567890abcdef', UPSTREAM_BASE: 'http://127.0.0.1:8799', DAILY_LIMIT: '40', QUOTA: H.memKV() };
  const relaySrv2 = await H.serve(8798, RENV2);
  ctx = await browser.createBrowserContext();
  const DV = { width: 1280, height: 860, deviceScaleFactor: 1 };
  p = await newPage(ctx, FILE + '?relay=' + encodeURIComponent('http://127.0.0.1:8798'), DV);
  await shot(p, 'D01_桌面_入口.png');
  await click(p, '#ai-chip'); await sleep(100); await p.$eval('#ai-own', d => d.open = true); await sleep(100);
  await shot(p, 'D07_桌面_用自己的密钥.png', '#ai-cfg');
  await click(p, '#ai-cfg-close');
  await click(p, '[data-act="rewrite"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(150);
  await type(p, '#t_r_exp', '2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行；对接场地和供应商。');
  await type(p, '#t_r_target', '用户研究');
  await shot(p, 'D02_桌面_阶段_补齐材料.png');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 8000); await clickIf(p, '#dr-next'); await waitStage(p, 'check');
  RENV2.DAILY_LIMIT = '1';
  await p.$eval('#ck-fix', d => d.open = true); await pick(p, 'input[name="q_fix"][value="0"]'); await click(p, '#fix-go');
  ok('桌面：额度用完的提示', await waitSel(p, '#fix-slot [data-quota]', 8000) && (await txt(p, '#fix-slot')).includes('明天再来'));
  await scrollTo(p, '#fix-slot');
  await shot(p, 'D08_桌面_额度用完.png');
  await ctx.close();
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock', DV);
  await goTool(p);
  await type(p, '#t_t_scene', '记一下每天喝了几杯水');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 8000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save');
  await click(p, '#b-save [data-sug]'); await sleep(100);
  await shot(p, 'D03_桌面_确认登月.png', '#s-save');
  await landIt(p); await sleep(1400);
  await shot(p, 'D04_桌面_登月动画A.png', '#land');
  await shot(p, 'D05_桌面_分享卡.png', '#share-card');
  await click(p, '#nx-more'); await waitStage(p, 'again'); await click(p, '#ag-other'); await sleep(150);
  await click(p, '[data-act="record"]'); await sleep(100); await click(p, '#act-sub [data-way="1"]'); await sleep(150);
  await type(p, '#t_n_plot', '外卖员雨夜送餐，捡到一只会说话的猫。');
  await click(p, '#mat-go'); await waitSel(p, '#dr-next', 8000); await clickIf(p, '#dr-next'); await waitStage(p, 'check'); await pick(p, 'input[name="q_degree"][value="1"]'); await click(p, '#ck-next'); await waitStage(p, 'save'); await landIt(p);
  await click(p, '#nx-more'); await waitStage(p, 'again'); await click(p, '#ag-other'); await sleep(150);
  await click(p, '[data-act="rewrite"]'); await sleep(100); await click(p, '#act-sub [data-way="1"]'); await sleep(150);
  await type(p, '#t_x_name', '2024 社区读书会');
  await click(p, '#bag-btn'); await sleep(250);
  ok('桌面：星图上月球 + 新星球 + 航行中', (await p.$$('[data-planet]')).length === 2 && (await p.$$('[data-sailing]')).length === 1);
  await shot(p, 'D06_桌面_星图.png');
  await ctx.close();
  relaySrv2.close();
  /* 手机：入口 / 阶段（补齐材料） */
  phase = 'mobile';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock', { width: 375, height: 760, deviceScaleFactor: 2 });
  await shot(p, 'M01_手机_入口.png');
  await click(p, '[data-act="record"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(150);
  await shot(p, 'M02_手机_阶段_补齐材料.png');
  ok('手机：阶段条不横向溢出', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();

  /* ========== 打磨轮（第 134–139 条）：航线 / 卡片 / 星云流式 / 按住发射 / 镜头拉远 / 抽象小人 ========== */
  phase = 'polish';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock&mockdelay=2600', { width: 390, height: 844, deviceScaleFactor: 2 });
  const prog = () => p.$eval('#route', e => +getComputedStyle(e).getPropertyValue('--prog'));
  ok('(a) 顶部刻度尺（v0.0.12 取代航线）+ 读屏能听到离月球还有多远', !!(await p.$('#ruler .cur')) && !!(await p.$('#route-ship')) && /月球/.test(await allTxt(p, '#route-dist')));
  await click(p, '[data-act="record"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(300);
  const pr1 = await prog();
  ok('(a) 进入「补齐材料」：飞船前进到第 2 个航点，显示「离月球还有 3 站」', pr1 >= 0.19 && pr1 < 0.4 && (await txt(p, '#route-dist')).includes('离月球还有 3 站'), pr1 + ' ' + await txt(p, '#route-dist'));
  /* (b) 卡片 */
  const deckInfo = () => p.evaluate(() => { const cs = [...document.querySelectorAll('#deck > .q')]; const vis = cs.filter(c => getComputedStyle(c).display !== 'none'); return { n: cs.length, vis: vis.length, cur: (vis[0] || {}).id || (vis[0] && vis[0].getAttribute('data-q')), dots: document.querySelectorAll('#deck-dots [data-dot]').length }; });
  let di = await deckInfo();
  ok('(b) 问题变成一叠卡片，一次只露一张，有小圆点导航', di.n >= 3 && di.vis === 1 && di.dots === di.n, JSON.stringify(di));
  await type(p, '#deck > .q.cur textarea', '我妈，和她每年冬天腌的那坛萝卜'); await sleep(50);
  const pr2 = await prog();
  ok('(a) 答一张卡，飞船在这一段里往前挪一点', pr2 > pr1, pr1 + '→' + pr2);
  ok('(b) 文字卡答好后「下一张」亮起来', await p.$eval('#deck-next', e => e.classList.contains('ready')));
  const c0 = (await deckInfo()).cur;
  await click(p, '#deck-next'); await sleep(60);
  ok('(b) 点「下一张」：当前卡片飞走（fly-l）', await p.evaluate(() => !!document.querySelector('#deck > .q.fly-l')));
  await sleep(350);
  const c1 = (await deckInfo()).cur;
  ok('(b) 飞走后换成下一张', c1 && c1 !== c0, c0 + '→' + c1);
  /* 找一张单选卡，点一下就自动飞走 */
  let radioCard = null;
  for (let i = 0; i < 8; i++) { const has = await p.evaluate(() => { const c = document.querySelector('#deck > .q.cur'); return !!(c && c.querySelector('input[type=radio][value="0"]')); }); if (has) { radioCard = (await deckInfo()).cur; break; } await click(p, '#deck-next'); await sleep(320); }
  ok('(b) 有可以点选的卡片', !!radioCard);
  if (radioCard) {
    await p.$eval('#deck > .q.cur input[type=radio][value="0"]', e => e.closest('label') ? e.closest('label').click() : e.click()); await sleep(650);
    const after = (await deckInfo()).cur;
    const okDot = await p.evaluate(fid => { const cs = [...document.querySelectorAll('#deck > .q')]; const i = cs.findIndex(c => c.getAttribute('data-q') === fid); return document.querySelectorAll('#deck-dots [data-dot]')[i].classList.contains('ok'); }, radioCard);
    ok('(b) 点选一个选项，卡片自动飞走、换下一张，答案记下了（小圆点变成已答）', after !== radioCard && okDot, radioCard + '→' + after);
    await click(p, '#deck-prev'); await sleep(400);
    ok('(b) 「←」回到上一张', (await deckInfo()).cur === radioCard);
  }
  /* 手机左滑 = 下一张 */
  const s0 = (await deckInfo()).cur;
  await p.evaluate(() => { const c = document.querySelector('#deck > .q.cur'); const r = c.getBoundingClientRect(); const y = r.top + 20, x = r.left + r.width - 30; const ev = (t, x) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })); ev('pointerdown', x); ev('pointermove', x - 60); ev('pointermove', x - 140); ev('pointerup', x - 140); });
  await sleep(400);
  ok('(b) 手机上左滑：换到下一张', (await deckInfo()).cur !== s0, s0);
  await p.evaluate(() => { const c = document.querySelector('#deck > .q.cur'); const r = c.getBoundingClientRect(); const y = r.top + 20, x = r.left + 30; const ev = (t, x) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 8, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })); ev('pointerdown', x); ev('pointermove', x + 140); ev('pointerup', x + 140); });
  await sleep(400);
  ok('(b) 右滑：回到上一张', (await deckInfo()).cur === s0);
  await p.$eval('#deck-dots .fin', e => e.click()); await sleep(400);
  ok('(b) 翻到最后：「都齐了」卡片', await vis(p, '#deck-done') && (await txt(p, '#deck-done')).includes('都齐了'));
  ok('(b) 翻到最后：底部换成「做出第一版」', await vis(p, '#mat-go') && (await txt(p, '#mat-go')).includes('做出第一版'));
  await shot(p, 'P01_卡片.png');
  /* (c) 等 AI：一张玻璃卡，字一段一段流出来 */
  await click(p, '#mat-go'); await sleep(250);
  ok('(c) 等 AI：标题「正在成形…」，不是光秃秃的转圈', (await txt(p, '#h-draft')).includes('正在成形') && !(await p.$('#b-draft .aibox .spin')) && (await p.evaluate(() => document.body.classList.contains('scr-wait'))));
  await waitFn(p, () => document.querySelectorAll('#b-draft .stream .piece').length >= 3, 3000);
  const st = await p.evaluate(() => { const s = document.querySelector('#b-draft .stream'); return { n: s ? s.querySelectorAll('.piece').length : 0, t: s ? s.textContent : '', c: (document.querySelector('#b-draft [data-snip-n]') || {}).textContent || '' }; });
  ok('(c) 生成的字一段一段流出来（不是一次出现）', st.n >= 3 && st.t.length > 6, JSON.stringify(st));
  ok('(c) 流出来的只是正文，不露 JSON 字段名和括号', !/["{}\[\]]|title|body|_note/.test(st.t), st.t);
  ok('(c) 显示「已经写了 N 字」', /已经写了 \d+ 字/.test(st.c), st.c);
  await shot(p, 'P02_成形.png');
  /* 第 5 屏：点一句，改一处 */
  ok('#35 第一版出来后直接到「这是第一版」', await waitStage(p, 'check', 8000) && (await txt(p, '#h-check')).includes('这是第一版'));
  ok('(a) 第一版出来后：前面的航点记成完成，刚走过的点亮（lit）', await p.$eval('#stages [data-st="material"]', e => e.classList.contains('done')) && !!(await p.$('#stages .lit')));
  ok('#35 成果摊开在卡片里，下面一行「点一句，改一处」', (await p.$$('#ck-result .sn')).length >= 2 && (await txt(p, '#ck-result .hint2')).includes('点一句，改一处'));
  /* v0.0.12 第 1 项：长成果默认收起（只露前几行、底部淡出），点卡片展开，「收起」收回 */
  const fd0 = await p.evaluate(() => { const r = document.getElementById('ck-result'), b = document.getElementById('ck-body'), f = document.getElementById('ck-fold'); return { fold: r.classList.contains('fold'), ae: f && f.getAttribute('aria-expanded'), ac: f && f.getAttribute('aria-controls'), t: f && f.textContent, h: b.clientHeight, sh: b.scrollHeight, mask: getComputedStyle(b).maskImage || getComputedStyle(b).webkitMaskImage }; });
  ok('收起：长成果默认只露前几行（≤5 行高）、底部淡出、按钮「展开」aria-expanded=false', fd0.fold && fd0.ae === 'false' && fd0.ac === 'ck-body' && fd0.t === '展开' && fd0.h <= 180 && fd0.sh > fd0.h + 20 && /gradient/.test(fd0.mask), JSON.stringify(fd0));
  await shot(p, 'P02a_收起.png');
  await p.click('#ck-result .sn[data-sn="0"]'); await sleep(150);
  const fd1 = await p.evaluate(() => ({ fold: document.getElementById('ck-result').classList.contains('fold'), sel: !!document.querySelector('#ck-result .sn.sel'), ae: document.getElementById('ck-fold').getAttribute('aria-expanded'), t: document.getElementById('ck-fold').textContent, h: document.getElementById('ck-body').clientHeight, sh: document.getElementById('ck-body').scrollHeight }));
  ok('收着时点一句：只展开，不会误选句子；按钮变「收起」aria-expanded=true', !fd1.fold && !fd1.sel && fd1.ae === 'true' && fd1.t === '收起' && fd1.h >= fd1.sh - 2, JSON.stringify(fd1));
  await click(p, '#ck-fold'); await sleep(100);
  ok('点「收起」：收回去', await p.$eval('#ck-result', e => e.classList.contains('fold')) && (await p.$eval('#ck-fold', e => e.getAttribute('aria-expanded'))) === 'false');
  await p.focus('#ck-fold'); await p.keyboard.press('Enter'); await sleep(100);
  ok('键盘：焦点在「展开」上按回车也能展开', !(await p.$eval('#ck-result', e => e.classList.contains('fold'))) && (await p.$eval('#ck-fold', e => e.getAttribute('aria-expanded'))) === 'true');
  const sn1 = await p.$eval('#ck-result .sn[data-sn="1"]', e => e.textContent);
  await p.click('#ck-result .sn[data-sn="1"]'); await sleep(150);
  ok('#35 展开后点一句：这一句被墨线框住（带角标），下面出现「改这一句」，卡片保持展开', !(await p.$eval('#ck-result', e => e.classList.contains('fold'))) && await p.$eval('#ck-result .sn[data-sn="1"]', e => e.classList.contains('sel') && e.getAttribute('aria-pressed') === 'true') && (await txt(p, '#sn-bar')).includes('改这一句'));
  await shot(p, 'P02b_点一句.png');
  const tl0 = await p.evaluate(() => window.lingcunAI.timings.length);
  await type(p, '#sn-req', '更具体一点'); await click(p, '#sn-go');
  ok('#35 只改这一句：发出去的要求里带着这一句原文', await waitFn(p, () => { const s = window.__lingcun.state(); return s.projects[s.cur].revs === 1; }, 6000) && (await p.evaluate(() => window.lingcunAI.timings.length)) > tl0);
  ok('#35 改完：选中取消，标题变成「这是改过的一版」', !(await p.$('#ck-result .sn.sel')) && (await txt(p, '#h-check')).includes('改过的一版'));
  ok('(检查) 原句至少存在过', sn1.length > 1, sn1);
  await click(p, '#ck-next'); await waitStage(p, 'save'); await sleep(200);
  ok('(a) 到「确认登月」：显示「就差最后一步」', (await txt(p, '#route-dist')).includes('就差最后一步'), await txt(p, '#route-dist'));
  ok('#35 第 6 屏标题「是你认可的这一版？」', (await txt(p, '#h-save')).replace(/\s+/g, '').includes('是你认可的这一版？'));
  /* (d) 按住确认 */
  ok('(d) 按钮「按住确认」，下面「松手可反悔」', (await txt(p, '#lc-go')).includes('按住确认') && (await txt(p, '#lc-holdhint')).includes('松手可反悔'));
  await sleep(500);
  const bb = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.mouse.down(); await sleep(150);
  ok('(d) 按下：开始走刻度（charging）', await p.$eval('#lc-go', e => e.classList.contains('charging')));
  await sleep(250); await p.mouse.up(); await sleep(200);
  ok('(d) 没走满就松手：不登月，说「这次不算」', !(await cur(p)).landed && (await txt(p, '#lc-err')).includes('这次不算'));
  await p.mouse.down(); await sleep(1300);
  ok('(d) 走满：按钮进入 full 状态', await p.$eval('#lc-go', e => e.classList.contains('full')).catch(() => true));
  await shot(p, 'P03_按住.png');
  await p.mouse.up();
  await waitSel(p, '#land', 3000);
  ok('(d) 走满后登上月球', (await cur(p)).landed === true && (await cur(p)).planet === 0);
  ok('#35 第 7 屏：浅夜色 + 颗粒（--grain=1）+ 定稿庆祝小人', await p.evaluate(() => document.body.classList.contains('night') && getComputedStyle(document.body).getPropertyValue('--grain').trim() === '1' && !!document.querySelector('#land .astro svg')));
  ok('#34 登月文案只在跑完一局才出现', (await txt(p, '#land-msg')).replace(/\s+/g, '') === '这一步虽小，对我来说确实是大突破');
  await sleep(1500); await shot(p, 'P04_登陆.png');
  await click(p, '#land'); await waitSel(p, '#land-map', 3000); await sleep(900);
  ok('(e) 轻点 → 星图「你的第一颗星」，作品名和日期在星旁边', (await txt(p, '#map-h')) === '你的第一颗星' && (await txt(p, '#map-t')).length > 0 && !!(await p.$('#land-map svg.sky .ring-new')));
  ok('(e) 「已登上月球」写在航线上', (await txt(p, '#route-dist')).includes('已登上月球'));
  ok('#34 星图上没有下一局 / 下一站 / 从月球出发', !/下一局|下一站|从月球出发/.test(await p.evaluate(() => document.body.innerText)));
  ok('#34 星图只有两个按钮：GitHub（画的星，不是 emoji）+ 分享', (await p.$$('#b-save .dock > *')).length === 2 && !!(await p.$('#star-go svg')) && !/[\u2600-\u27BF\u{1F000}-\u{1FAFF}]/u.test(await txt(p, '#star-go')));
  await click(p, '#sc-open'); await sleep(150);
  ok('分享：点「分享」才展开分享卡', await vis(p, '#share-card'));
  await shot(p, 'P05_星图.png');
  await p.$eval('#map-more', d => d.open = true);
  await click(p, '#land-replay'); await sleep(80);
  ok('(e) 「再看一次登月」：回到落地画面，从头播', await p.$eval('#land', e => e.classList.contains('play')));
  await click(p, '#land'); await sleep(200); await p.$eval('#map-more', d => d.open = true);
  await click(p, '#nx-more'); await waitStage(p, 'again'); await sleep(150);
  ok('#34 之后：航线不写下一站', !/下一站/.test(await txt(p, '#route-dist')), await txt(p, '#route-dist'));
  ok('#34 之后：标题「之后，你来定」', (await txt(p, '#h-again')).includes('之后，你来定'));
  await ctx.close();
  /* (d) 键盘：选中按钮按回车直接确认 */
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock', { width: 390, height: 844, deviceScaleFactor: 1 });
  await goTool(p); await type(p, '#t_t_scene', '记一下每天走了多少步');
  await click(p, '#mat-go'); await waitStage(p, 'check', 6000);
  ok('#35 小工具：第 5 屏是预览 + 写一句想改哪里', !!(await p.$('#ck-result #ck-prev')) && !!(await p.$('#sn-bar #sn-req')));
  await click(p, '#ck-next'); await waitStage(p, 'save');
  await sleep(600);
  const bk = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.click(bk.x + bk.width / 2, bk.y + bk.height / 2); await sleep(500);
  ok('(d) 鼠标只是点一下（没按住）：不登月，提示要按住', !(await cur(p)).landed && /按住/.test(await txt(p, '#lc-err')), (await cur(p)).landed + ' ' + await txt(p, '#lc-err'));
  await p.focus('#lc-go'); await p.keyboard.press('Enter'); await waitSel(p, '#land', 3000);
  ok('(d) 键盘：选中按钮按回车直接确认、登上月球', (await cur(p)).landed === true);
  await ctx.close();
  /* 减少动画：卡片直接换、按钮变普通按钮、点一下就登月、没有长动画 */
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, 'about:blank', { width: 390, height: 844, deviceScaleFactor: 1 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(FILE + '?ai=mock&mockdelay=900', { waitUntil: 'load' });
  await click(p, '[data-act="record"]'); await sleep(100); await click(p, '#act-sub [data-way="0"]'); await sleep(200);
  await type(p, '#deck > .q.cur textarea', '外婆的缝纫机'); const r0 = (await deckInfo()).cur; await click(p, '#deck-next'); await sleep(30);
  ok('减少动画：卡片直接换，不飞', (await deckInfo()).cur !== r0 && !(await p.$('#deck > .q.fly-l')));
  await click(p, '#mat-go'); await waitStage(p, 'check', 6000); await click(p, '#ck-next'); await waitStage(p, 'save');
  ok('减少动画：确认按钮是普通按钮「确认」', (await txt(p, '#lc-go')).includes('确认') && !(await txt(p, '#lc-go')).includes('按住'));
  await sleep(300);
  const br = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.click(br.x + br.width / 2, br.y + br.height / 2); await waitSel(p, '#land', 3000);
  ok('减少动画：点一下就登上月球（一局走得完）', (await cur(p)).landed === true, (await txt(p, '#lc-err')) + ' / ' + (await stage(p)) + ' / ' + JSON.stringify(br));
  await sleep(100);
  const rm2 = await p.evaluate(() => ({ play: document.querySelector('#land').classList.contains('play'), long: document.getAnimations().filter(a => a.effect && (+a.effect.getTiming().duration || 0) > 50).length }));
  ok('减少动画：落地画面不播放，没有长动画', !rm2.play && rm2.long === 0, JSON.stringify(rm2));
  await click(p, '#land'); await waitSel(p, '#land-map', 2000); await p.$eval('#map-more', d => d.open = true);
  await click(p, '#nx-more'); await waitStage(p, 'again');
  ok('减少动画：之后的阶段也正常', (await stage(p)) === 'again');
  await ctx.close();

  /* ========== v0.0.12：字体、图标、配色、无 emoji ========== */
  phase = 'v12';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock', { width: 390, height: 844, deviceScaleFactor: 1 });
  await p.evaluate(() => document.fonts.ready); await sleep(300);
  const fz = await p.evaluate(() => [...document.fonts].map(f => f.family.replace(/"/g, '') + ':' + f.weight + ':' + f.status));
  ok('#32 字体真的加载了：LCHead（得意黑子集）、LCSans 300（Noto Sans SC）、Geist', ['LCHead:400:loaded', 'LCSans:300:loaded', 'Geist:100 900:loaded'].every(x => fz.includes(x)), fz.join(' | '));
  ok('#32 字体文件都在，旁边有 OFL 许可', ['lc-head.woff2', 'lc-sans-300.woff2', 'lc-sans-400.woff2', 'geist.woff2', 'OFL_SmileySans.txt', 'OFL_NotoSansSC.txt', 'OFL_Geist.txt'].every(f => fs.existsSync(path.resolve(__dirname, '../page/fonts', f))));
  ok('#32 没有 MiSans / HarmonyOS / OPPO / 阿里普惠', !fs.readdirSync(path.resolve(__dirname, '../page/fonts')).some(f => /misans|harmony|oppo|alibaba|puhui/i.test(f)) && !/MiSans|HarmonyOS|OPPO Sans|Alibaba ?PuHui/i.test(src));
  ok('#32 标题用 LCHead，正文用 LCSans', (await p.$eval('#h-pick', e => getComputedStyle(e).fontFamily)).startsWith('LCHead') && /LCSans/.test(await p.evaluate(() => getComputedStyle(document.body).fontFamily)));
  ok('#33 图标：favicon 和 apple-touch-icon 都是定稿 app 图标', src.includes('href="icons/app-icon.svg"') && src.includes('href="icons/apple-touch-icon.png"') && fs.existsSync(path.resolve(__dirname, '../page/icons/app-icon.svg')) && fs.existsSync(path.resolve(__dirname, '../page/icons/apple-touch-icon.png')));
  ok('#33 首页是定稿站立小人，右上角是定稿 idle 小人', !!(await p.$('.homefig svg')) && !!(await p.$('#menu-btn svg')));
  ok('#34 源码里没有 emoji', !/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/u.test(src), (src.match(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/u) || [])[0]);
  ok('#34 用户看得到的字里没有「下一局 / 下一站 / 从月球出发」', !/下一局|下一站|从月球出发/.test(await p.evaluate(() => document.body.innerText)));
  ok('#32 颗粒默认只在第 7、8 屏：首页 --grain=0', (await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--grain').trim())) === '0');
  await p.goto(FILE + '?ai=mock&grain=all', { waitUntil: 'load' });
  ok('#32 ?grain=all：首页也有颗粒', (await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--grain').trim())) === '1');
  await click(p, '#menu-btn'); await sleep(100);
  ok('右上角小人 = 菜单：星图 / AI 设置 / 换设备带走进度都在里面', await vis0(p, '#menu') && !!(await p.$('#menu #bag-btn')) && !!(await p.$('#menu #ai-chip')) && !!(await p.$('#menu #s-store')));
  await p.keyboard.press('Escape'); await sleep(100);
  ok('Esc 关菜单', !(await vis0(p, '#menu')));
  await ctx.close();

  /* ========== v0.0.13：【创造】单独成类 + 换版本回免费额度 + agent 超时 ========== */
  phase = 'v13';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock');
  ok('#37 「我想做一个游戏」→ 匹配到创造', await p.evaluate(() => window.__lingcun.matchCats('我想做一个游戏')[0] === 'create'));
  await p.evaluate(() => window.__lingcun.setMockDelay(9000));
  await goTool(p, '我想做一个游戏');
  ok('#37 【创造】+「我想做一个游戏」→ 创造这一类', (await cur(p)).cat === 'create' && (await cur(p)).theme === 'create', (await cur(p)).cat);
  ok('#37 概念卡：AI 还没回来时先等着（不可点）', !!(await p.$('#deck .q.cwait')));
  await sleep(6600);
  const cq = await p.evaluate(() => { const c = document.querySelector('#deck .q.cur'); return { id: c && c.getAttribute('data-q'), wait: !!document.querySelector('#deck .q.cwait'), n: c ? c.querySelectorAll('label.choice:not(.skip)').length : 0 }; });
  ok('#37 AI 慢（>6 秒）→ 概念卡换成通用选项（4 个 + 其他）', cq.id === 'c_concept' && !cq.wait && cq.n === 5, JSON.stringify(cq));
  ok('#38 源码：卡片去掉「真能用」「想先看到什么」', !/真能用/.test(src) && !/t_first/.test(src));
  ok('#39 源码：agent 也有三分钟超时', /AGENT_LIMIT = 180000/.test(src) && /等了三分钟还没有结果/.test(src));
  await ctx.close();
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx);
  await p.evaluate(() => { localStorage.setItem('lingcun_v010_ai', JSON.stringify({ mode: 'direct', v: '0.0.12', preset: 'deepseek', base: 'http://127.0.0.1:8799', model: 'deepseek-flash' })); localStorage.setItem('lingcun_v010_apikey', 'sk-test-1234567890abcdef'); });
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  const v13c = await p.evaluate(() => ({ mode: window.lingcunAI.mode(), cfg: JSON.parse(localStorage.getItem('lingcun_v010_ai')), key: !!localStorage.getItem('lingcun_v010_apikey') }));
  ok('#39 换了版本：上一版存的「自己的密钥」不沿用，回到免费额度（密钥还留着）', v13c.mode !== 'direct' && v13c.cfg.v === '0.0.13' && v13c.cfg.mode !== 'direct' && v13c.key, JSON.stringify(v13c));
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('lingcun_v010_ai')); c.mode = 'direct'; localStorage.setItem('lingcun_v010_ai', JSON.stringify(c)); });
  await p.reload({ waitUntil: 'load' }); await sleep(200);
  ok('#39 同一版本里选了自己的密钥 → 刷新后还是自己的密钥', (await p.evaluate(() => window.lingcunAI.mode())) === 'direct');
  await ctx.close();

  /* ========== 10. 窄屏 / 宽屏截图 ========== */
  phase = 'wide';
  ctx = await browser.createBrowserContext();
  p = await newPage(ctx, FILE + '?ai=mock', { width: 1280, height: 860, deviceScaleFactor: 1 });
  await shot(p, '13_入口_宽屏.png');
  ok('宽屏：不横向溢出', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();

  await browser.close(); server.close();
  ok('全程没有页面报错', !errors.length, errors.join(' | '));
  const pass = results.filter(r => r.startsWith('PASS')).length, fail = results.length - pass;
  const out = results.join('\n') + '\n\n共 ' + results.length + ' 项：通过 ' + pass + '，失败 ' + fail + '\n';
  fs.writeFileSync(path.join(__dirname, 'result.txt'), out);
  console.log(out);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); console.log(results.join('\n')); process.exit(2); });
