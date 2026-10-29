/* v0.0.14 自测（Playwright + /usr/bin/google-chrome，375×812）。
   跑法：node selftest14.js [offline|fallback|kw|voice|online|all]   截图 → /workspace/lingcun/v0.0.14_selftest/ */
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../page/index.html');
const OUT = '/workspace/lingcun/v0.0.14_selftest'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] || 'all';
const R = []; const ok = (name, cond, info) => { R.push([cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : String(info)]); console.log(cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : info); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOCK_SR = () => {
  class MockSR { constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; window.__srMade = (window.__srMade || 0) + 1; }
    start() { this._on = true; const say = window.__srText || '最近工作有点累，想早点睡。'; const a = say.slice(0, Math.ceil(say.length / 2));
      const res = (txt, fin) => { const r = [{ transcript: txt }]; r.isFinal = fin; return r; };
      this._t1 = setTimeout(() => { if (this._on && this.onresult) this.onresult({ results: [res(a, false)] }); }, 400);
      this._t2 = setTimeout(() => { if (this._on && this.onresult) this.onresult({ results: [res(say, true)] }); }, 900); }
    stop() { this._on = false; setTimeout(() => this.onend && this.onend(), 60); }
    abort() { this._on = false; clearTimeout(this._t1); clearTimeout(this._t2); } }
  window.webkitSpeechRecognition = MockSR; window.SpeechRecognition = MockSR;
};
async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] }); }
async function page(b, q, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (o.sr === 'mock') await ctx.addInitScript(MOCK_SR);
  if (o.sr === 'none') await ctx.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; window.webkitSpeechRecognition = undefined; window.SpeechRecognition = undefined; });
  const p = await ctx.newPage(); p.errs = []; p.posts = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push('console: ' + m.text()); });
  p.on('request', r => { if (/workers\.dev/.test(r.url()) && r.method() === 'POST') { let ty = ''; try { ty = (JSON.parse(r.postData()).messages[0].content.match(/任务类型：(\w+)/) || [])[1] || '?'; } catch (e) {} p.posts.push({ ty, t: Date.now() }); } });
  await p.goto(URL + (q || '')); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(250);
  if (o.offline) await ctx.setOffline(true);
  p.ctx = ctx; return p;
}
const st = p => p.evaluate(() => { const S = window.__lingcun.state(); const x = S.projects[S.cur] || {}; return { stage: S.stage, cat: x.cat, lc: x.lc, lib: x.lib, borrow: x.borrow, aiN: x.aiN || 0, out: x.out, plan: x.plan, saved: x.saved }; });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
const cardText = p => p.$eval('#deck .q.cur', e => e.innerText.replace(/\n+/g, ' | '));
async function enter(p, act, goal, pre) {
  if (pre) await shot(p, pre + '_00_home');
  await p.click('[data-act="' + act + '"]'); await sleep(150); await p.click('#pk-start'); await sleep(350);
  if (pre) await shot(p, pre + '_01_idea');
  if (await p.$('#vz-type')) { await p.click('#vz-type'); await sleep(150); }
  await p.fill('#pk-idea', goal); await sleep(100); if (pre) await shot(p, pre + '_01b_typed');
  await p.click('#pk-go'); await sleep(500);
}
async function cards(p, picks, pre) {
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(await cardText(p)); if (pre) await shot(p, pre + '_0' + (i + 2) + '_q' + (i + 1));
    await p.click('#deck .q.cur label.choice:not(.skip) >> nth=' + (picks[i] || 0)); await sleep(650);
  }
  return seen;
}
async function finish(p, pre) {
  await sleep(300); if (pre) await shot(p, pre + '_06_ready');
  const panel = (await p.$eval('#cr-panel', e => e.innerText)).replace(/\n+/g, ' | ');
  const t0 = Date.now(); await p.click('#mat-go');
  for (let i = 0; i < 150; i++) { if ((await st(p)).stage === 'check') break; await sleep(100); }
  const waitMs = Date.now() - t0; await sleep(400); if (pre) await shot(p, pre + '_07_step');
  const check = (await p.$eval('#b-check', e => e.innerText)).replace(/\n+/g, ' | ');
  return { panel, waitMs, check };
}
async function land(p, pre) {
  await p.click('#ck-next'); await sleep(500); if (pre) await shot(p, pre + '_08_confirm');
  const bx = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await sleep(1600); await p.mouse.up();
  for (let i = 0; i < 60 && !(await p.$('#land')); i++) await sleep(100);
  await sleep(1200); if (pre) await shot(p, pre + '_09_land');
  const s = await st(p); return { landed: !!(await p.$('#land')), saved: s.saved };
}

async function offlineRuns(b) {
  const runs = [
    { act: 'create', goal: '我想做一个游戏', pre: 'off_create', picks: [0, 0, 0, 0], want: { lc: '创造', lib: 'game' }, step: /第一个场景/, label: /发生.*给谁.*形式.*草样/s, total: /合计/ },
    { act: 'learn', goal: '零基础学日语', pre: 'off_learn', picks: [1, 0, 1, 0], want: { lc: '学习技能', lib: 'japanese' }, step: /あいうえお/, label: /用处.*起点.*节奏.*小关卡/s, total: /第一阶段/ },
    { act: 'career', goal: '想转行做产品经理', pre: 'off_career', picks: [2, 3, 0, 1], want: { lc: '转行', lib: 'to_pm' }, step: /App/, label: /方向.*手里有.*补什么.*证明/s, total: /准备期/ }
  ];
  for (const r of runs) {
    const p = await page(b, '', { offline: true });
    await enter(p, r.act, r.goal, r.pre);
    const s0 = await st(p); ok(r.pre + ' 匹配到 ' + r.want.lib, s0.lc === r.want.lc && s0.lib === r.want.lib, JSON.stringify([s0.lc, s0.lib]));
    const seen = await cards(p, r.picks, r.pre);
    ok(r.pre + ' 四张卡都是库里的选项（含 ①）', seen.every(t => /其他，我自己写/.test(t)) && !/（按你的话）/.test(seen[0]), seen[0].slice(0, 60));
    const f = await finish(p, r.pre);
    ok(r.pre + ' 材料齐了：五段路线 + ' + r.total, (f.panel.match(/约|次/g) || []).length >= 5 && r.total.test(f.panel), f.panel.slice(0, 160));
    ok(r.pre + ' 断网时「出第一步」很快（<2.5s）', f.waitMs < 2500, f.waitMs + 'ms');
    ok(r.pre + ' 第一步来自库', r.step.test(f.check), f.check.slice(0, 120));
    ok(r.pre + ' 第一步页有摘星标准', /摘星/.test(f.check));
    ok(r.pre + ' 框架短标签', r.label.test(f.check));
    ok(r.pre + ' 路线收起', !(await p.$eval('#cr-later', e => e.open)));
    const l = await land(p, r.pre);
    ok(r.pre + ' 断网走到登月', l.landed && l.saved, JSON.stringify(l));
    ok(r.pre + ' 没有页面报错', !p.errs.length, p.errs.join(' / '));
    ok(r.pre + ' 页面上没有价格数字 / 做成承诺', !/[¥￥$]\s*\d|\d+\s*元|保证做成|一定做成|做成一件/.test(await p.evaluate(() => document.body.innerText)));
    await p.ctx.close();
  }
  /* 版本切换：② 选「有基础」→ 第一步换成有基础版；转行「有相关经历」→ 改简历那一版 */
  const v = [
    { act: 'learn', goal: '零基础学日语', picks: [0, 1, 0, 0], step: /わたしは/, n: '学习 ② 选「学过一点」→ 认得假名版第一步' },
    { act: 'career', goal: '想转行做产品经理', picks: [0, 0, 0, 0], step: /简历/, n: '转行 ② 选「运营经历」→ 有相关经历版第一步' }
  ];
  for (const r of v) {
    const p = await page(b, '?relay=off'); await enter(p, r.act, r.goal); await cards(p, r.picks); const f = await finish(p);
    ok(r.n, r.step.test(f.check), f.check.slice(0, 90)); await p.ctx.close();
  }
}
async function fallbackRuns(b) {
  /* 对不上任何条目 → 该类兜底；创造兜底按 ④ 取第一步；「学做X」借创造库 */
  let p = await page(b, '?relay=off'); await enter(p, 'create', '我想做点新东西', 'fb_create');
  let s = await st(p); ok('创造兜底：「我想做点新东西」→ create_generic', s.lib === 'create_generic', s.lib);
  await cards(p, [1, 1, 1, 2], 'fb_create'); let f = await finish(p, 'fb_create');
  ok('创造兜底：④ 选「找三个人聊一次」→ 对应第一步', /列出三个想问的人/.test(f.check), f.check.slice(0, 80));
  const l = await land(p, 'fb_create'); ok('创造兜底走到登月', l.landed); await p.ctx.close();
  p = await page(b, '?relay=off'); await enter(p, 'learn', '我想学一门很冷门的手艺');
  s = await st(p); ok('学习兜底 → learn_generic', s.lib === 'learn_generic' && !s.borrow, JSON.stringify([s.lib, s.borrow]));
  await cards(p, [0, 0, 0, 0]); f = await finish(p); ok('学习兜底有第一步和摘星', /入门教程/.test(f.check) && /摘星/.test(f.check)); await p.ctx.close();
  p = await page(b, '?relay=off'); await enter(p, 'learn', '想学做游戏');
  s = await st(p); ok('「学做游戏」留在学习、借创造的 game', s.lc === '学习技能' && s.borrow === 'game', JSON.stringify([s.lc, s.lib, s.borrow]));
  const c1 = await cardText(p); ok('「学做游戏」卡片仍是学习的四问', /学会以后/.test(c1), c1.slice(0, 40));
  await cards(p, [0, 0, 0, 0]); f = await finish(p); ok('「学做游戏」第一步借自游戏条目，合计标「第一阶段」', /第一个场景/.test(f.check) && /第一阶段/.test(f.check), f.check.slice(0, 90)); await p.ctx.close();
  p = await page(b, '?relay=off'); await enter(p, 'create', '想转去做游戏策划');
  s = await st(p); ok('选了创造但说「转去做游戏策划」→ 转行', s.lc === '转行' && s.lib === 'to_game_designer', JSON.stringify([s.lc, s.lib])); await p.ctx.close();
  p = await page(b, '?relay=off'); await enter(p, 'create', '做一个记账的小网页');
  s = await st(p); ok('创造里明说小网页 → 照旧走小工具', s.cat === 'tool', s.cat); await p.ctx.close();
}
async function kwChecks(b) {
  const p = await page(b, '?relay=off');
  const cases = [
    ['我想思考一下人生', '', '创造', null, '「思考」不命中「考」'],
    ['参考别人做一个网站', '', '创造', 'website', '「参考」不命中「考」'],
    ['开心地办一场聚会', '', '创造', 'event', '「开心」不算「开」'],
    ['想考研', '', '学习技能', 'kaoyan', '考研 → 学习'],
    ['我想去歌德学院学德语', 'learn', '学习技能', 'german', '「歌德」不命中「歌」'],
    ['做一个宏大的世界观', 'create', '创造', 'create_generic', '「宏大」不命中「宏」'],
    ['学校社团办一次市集', 'create', '创造', null, '「学校」不当学习'],
    ['想转去做游戏策划', '', '转行', 'to_game_designer', '转去做X → 转行'],
    ['我想学日语', '', '学习技能', 'japanese', '没选大类时按提示词判'],
    ['我想做一个线上 NFT 展览', 'create', '创造', 'online_exhibition', 'NFT 展'],
    ['想学冥想', 'learn', '学习技能', 'yoga', '冥想 → 瑜伽/拉伸'],
    ['I want to learn Python', 'learn', '学习技能', 'python', '英文关键词按单词边界']
  ];
  for (const [t, act, lc, id, n] of cases) {
    const m = await p.evaluate(([t, act]) => window.__lingcunLib.match(t, act), [t, act]);
    ok('关键词：' + n + '（' + t + '）', m.lc === lc && (id === null || m.id === id), JSON.stringify(m));
  }
  ok('库条目数 80', (await p.evaluate(() => window.__lingcunLib.size)) === 80);
  await p.ctx.close();
}
async function voiceChecks(b) {
  let p = await page(b, '', { sr: 'mock' });
  await p.click('[data-act="create"]'); await p.click('#pk-start'); await sleep(400);
  ok('语音：默认就是按住说话', !!(await p.$('#vz')) && (await p.$eval('#vz-say', e => e.textContent)) === '按住，说说最近的事');
  ok('语音：「打字」小入口在', !!(await p.$('#vz-type')));
  await shot(p, 'voice_1_default');
  const bx = await (await p.$('#vz-btn')).boundingBox(); const cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
  /* 按一下就松开 → 不算 */
  await p.mouse.move(cx, cy); await p.mouse.down(); await sleep(120); await p.mouse.up(); await sleep(300);
  ok('语音：按一下马上松开不算录音', (await p.evaluate(() => window.__lingcunLib.voice().st)) === 'idle');
  await p.mouse.down(); await sleep(2200);
  ok('语音：按住时进入录音中', (await p.evaluate(() => window.__lingcunLib.voice().st)) === 'rec');
  ok('语音：显示剩余秒数', /0:2[78]/.test(await p.$eval('#vz-time', e => e.textContent)), await p.$eval('#vz-time', e => e.textContent));
  await shot(p, 'voice_2_recording');
  await sleep(24300);
  const near = await p.evaluate(() => [window.__lingcunLib.voice().st, document.querySelector('#vz-say').textContent, document.querySelector('#vz-time').textContent]);
  ok('语音：最后 5 秒温和提醒（快说完了）', near[0] === 'near' && near[1] === '快说完了', JSON.stringify(near));
  const red = await p.evaluate(() => { const c = [...document.querySelectorAll('#vz *')].map(e => getComputedStyle(e).color + getComputedStyle(e).fill + getComputedStyle(e).stroke).join(' '); return /rgb\(2[0-9]{2}, ?[0-9]{1,2}, ?[0-9]{1,2}\)/.test(c); });
  ok('语音：提醒不用红色', !red);
  await shot(p, 'voice_4_near');
  await sleep(4500);
  const v1 = await p.evaluate(() => window.__lingcunLib.voice());
  ok('语音：到 30 秒自动结束，转出文字', v1.st === 'done' && /早点睡/.test(v1.text), JSON.stringify(v1));
  await p.mouse.up(); await sleep(400);
  ok('语音：录完后文字在可修改的玻璃卡片里', await p.$eval('#vz-card', e => getComputedStyle(e).display !== 'none' && e.classList.contains('gl')) && (await p.$eval('#vz-text', e => e.value)).includes('早点睡'));
  ok('语音：重听 / 重来 / 就这样', (await p.$$eval('#vz-acts button', a => a.map(x => x.textContent).join('/'))) === '重听/重来/就这样');
  ok('语音：录下了声音可以重听（MediaRecorder）', (await p.evaluate(() => window.__lingcunLib.voice().url)));
  await shot(p, 'voice_3_done');
  await p.click('#vz-redo'); await sleep(200);
  ok('语音：重来 → 回到按住说话', (await p.evaluate(() => window.__lingcunLib.voice().st)) === 'idle');
  /* 短一点的一段：按住 2 秒，松开 → 改一个字 → 就这样 → 进入卡片 */
  await p.evaluate(() => { window.__srText = '我想做一个游戏'; });
  await p.mouse.move(cx, cy); await p.mouse.down(); await sleep(2000); await p.mouse.up(); await sleep(600);
  const v2 = await p.evaluate(() => window.__lingcunLib.voice()); ok('语音：松手结束', v2.st === 'done' && v2.text === '我想做一个游戏', JSON.stringify(v2));
  await p.fill('#vz-text', '我想做一个小游戏'); await p.click('#vz-ok'); await sleep(600);
  const s = await st(p); ok('语音：就这样 → 用改过的文字开局', s.stage === 'material' && s.lib === 'game' && (await p.evaluate(() => window.__lingcun.state().projects[0].idea)) === '我想做一个小游戏', JSON.stringify([s.stage, s.lib]));
  ok('语音：没有页面报错', !p.errs.length, p.errs.join(' / '));
  await p.ctx.close();
  /* 不支持语音识别（例如部分微信内置浏览器）→ 一句提示 + 打字 */
  p = await page(b, '?relay=off', { sr: 'none' });
  await p.click('[data-act="learn"]'); await p.click('#pk-start'); await sleep(300);
  ok('不支持语音：直接给打字框', !(await p.$('#vz')) && await p.isVisible('#pk-idea'));
  ok('不支持语音：一句提示', /还不能语音输入/.test(await p.textContent('#b-pick')));
  await shot(p, 'voice_5_unsupported');
  await p.fill('#pk-idea', '零基础学韩语'); await p.click('#pk-go'); await sleep(400);
  ok('不支持语音：打字照样开局', (await st(p)).lib === 'korean'); await p.ctx.close();
}
async function onlineRun(b) {
  const p = await page(b, '');
  const mode = await p.evaluate(() => window.lingcunAI.mode()); ok('联网：默认走免费中转', mode === 'relay', mode);
  await enter(p, 'create', '我想办一场线下活动', 'on_event');
  for (let i = 0; i < 70 && !(await p.evaluate(() => { const x = window.__lingcun.state().projects[0]; return !!x.lopts || (x.aiDone && window.lingcunAI.timings.some(t => t.type === 'lib_options' && t.ok !== null)); })); i++) await sleep(100);
  await sleep(300);
  const c1 = await cardText(p);
  const lo = await p.evaluate(() => window.__lingcun.state().projects[0].lopts);
  ok('联网：① 选项按原话润色过（或等不到就用库）', true, (lo ? 'AI: ' : 'LIB: ') + c1.slice(0, 120));
  await cards(p, [0, 0, 0, 0], 'on_event');
  for (let i = 0; i < 90; i++) { const s = await st(p); if (s.plan && s.plan.src === 'ai') break; if (i > 85) break; await sleep(100); }
  const f = await finish(p, 'on_event');
  const s = await st(p);
  ok('联网：材料齐了路线仍是五段、时长和库一致', s.plan.route.length === 5 && s.plan.route.map(r => r.time).join('/') === '约 3 天/约 2 天/约 1 周/1 个周末/约 3 天', s.plan.route.map(r => r.step + '|' + r.tool + '|' + r.time).join(' ; '));
  ok('联网：第一步拿到了', !!s.out.first_step, s.out.first_step + '（' + s.out.src + '）');
  ok('联网：一局 AI 调用 ≤ 3 次', p.posts.length <= 3, p.posts.map(x => x.ty).join(','));
  const tm = await p.evaluate(() => window.lingcunAI.timings.map(t => ({ type: t.type, ok: t.ok, ms: t.full_ms })));
  console.log('timings', JSON.stringify(tm)); console.log('panel', f.panel); console.log('check', f.check);
  fs.writeFileSync(path.join(OUT, 'online_run.json'), JSON.stringify({ posts: p.posts.map(x => x.ty), timings: tm, lopts: lo, plan: s.plan, out: s.out, panel: f.panel, check: f.check }, null, 1));
  const l = await land(p, 'on_event'); ok('联网：走到登月', l.landed);
  ok('联网：没有页面报错', !p.errs.length, p.errs.join(' / '));
  await p.ctx.close();
}
(async () => {
  const b = await launch();
  try {
    if (ONLY === 'all' || ONLY === 'offline') await offlineRuns(b);
    if (ONLY === 'all' || ONLY === 'fallback') await fallbackRuns(b);
    if (ONLY === 'all' || ONLY === 'kw') await kwChecks(b);
    if (ONLY === 'all' || ONLY === 'voice') await voiceChecks(b);
    if (ONLY === 'all' || ONLY === 'online') await onlineRun(b);
  } catch (e) { ok('脚本没有中断', false, e.stack); }
  await b.close();
  const pass = R.filter(r => r[0] === 'PASS').length;
  fs.writeFileSync(path.join(OUT, 'result_' + ONLY + '.txt'), R.map(r => r.join('\t')).join('\n') + '\n' + pass + '/' + R.length + '\n');
  console.log(pass + '/' + R.length);
})();
