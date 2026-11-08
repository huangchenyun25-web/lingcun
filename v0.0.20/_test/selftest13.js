/* v0.0.13 自测：390×844，?ai=mock，【创造】→「我想做一个游戏」走一遍 7 屏（对照 design_next/create_v1）并截图 */
const puppeteer = require('puppeteer-core'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || '/workspace/lingcun/v0.0.13_selftest'; fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.resolve(__dirname, '../page/index.html') + '?ai=mock&mockdelay=' + (process.env.MD || 1500);
const sleep = ms => new Promise(r => setTimeout(r, ms)); const errs = []; const A = [];
const chk = (n, v, x) => { A.push((v ? 'PASS ' : 'FAIL ') + n + (v || !x ? '' : ' — ' + x)); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL, { waitUntil: 'load' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready); await sleep(500);
  const shot = async n => { await sleep(450); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(100); await p.screenshot({ path: path.join(OUT, n) }); console.log('shot', n); };
  const c = s => p.$eval(s, e => e.click());
  await c('[data-act="create"]'); await sleep(200); await c('#pk-start'); await sleep(300);
  await p.$eval('#pk-idea', e => { e.value = '我想做一个游戏'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await shot('create_01_idea.png');
  await c('#pk-go'); await sleep(300);
  await shot('create_02a_concept_loading.png');
  for (let i = 0; i < 40 && await p.$('#deck .q.cwait'); i++) await sleep(150);
  await sleep(300);
  const cp = await p.evaluate(() => { const S = window.__lingcun.state(); return S.projects[S.cur]; });
  chk('【创造】+「我想做一个游戏」→ 创造这一类（不是小工具）', cp.cat === 'create' && cp.theme === 'create', cp.cat);
  const names = ['02_concept', '03_feel', '04_type', '05_show'];
  for (let i = 0; i < 4; i++) {
    const q = await p.evaluate(() => { const c = document.querySelector('#deck .q.cur'); return c && { id: c.getAttribute('data-q'), lbl: (c.querySelector('.clbl') || {}).textContent, qt: c.querySelector('.qt').textContent, opts: [...c.querySelectorAll('label.choice:not(.skip) span:first-of-type')].map(x => x.textContent) }; });
    console.log(JSON.stringify(q));
    await p.evaluate(() => { const i = document.querySelector('#deck .q.cur input[value="0"]'); i.checked = true; });
    await shot('create_' + names[i] + '.png');
    if (i === 0) chk('概念卡：AI 按原话写的 4 个选项 + 其他', q.id === 'c_concept' && q.opts.length === 5 && q.opts[0].includes('猫'), JSON.stringify(q.opts));
    if (i === 2) chk('类型卡：游戏时带参照', await p.evaluate(() => document.querySelectorAll('#deck .q.cur .ref').length === 4));
    await p.evaluate(() => { const i = document.querySelector('#deck .q.cur input[value="0"]'); i.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(700);
  }
  await shot('create_06a_ready_loading.png');
  for (let i = 0; i < 40 && !(await p.$('#cr-route .craxis')); i++) await sleep(150);
  await sleep(300);
  chk('材料齐了：目标 / 路线 / 希望它帮你做什么，按钮「出第一步」', await p.evaluate(() => { const t = document.getElementById('cr-panel').innerText; return /目标/.test(t) && /路线/.test(t) && /希望它帮你做什么/.test(t) && document.querySelectorAll('#cr-route .craxis li').length === 4 && document.getElementById('mat-go').textContent === '出第一步' && !document.getElementById('mat-more'); }));
  chk('材料齐了：没有「打开它」「带走」「怎样算做成」「原话」「换一类做」', await p.evaluate(() => !/打开它|带走|怎样算做成|你的原话|换一类做/.test(document.getElementById('b-material').textContent)));
  await shot('create_06_ready.png');
  await c('#mat-go'); await sleep(500);
  chk('等待页标出当前模式', await p.evaluate(() => !!document.querySelector('#dr-slot [data-modetag]')));
  await shot('create_wait.png');
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => window.__lingcun.state().stage) === 'check') break; await sleep(250); }
  await sleep(400);
  chk('第一步：主角 + 时间/材料 + 框架 + 收起的路线', await p.evaluate(() => !!document.getElementById('cr-first') && document.querySelectorAll('#cr-step .gai').length >= 2 && document.querySelectorAll('#cr-fw .fr').length === 4 && !document.getElementById('cr-later').open && /4|四/.test(document.querySelector('#cr-later summary').textContent)));
  chk('输出没有 html', await p.evaluate(() => { const S = window.__lingcun.state(); return S.projects[S.cur].out.html === undefined; }));
  await shot('create_07_step.png');
  await c('#ck-next'); await sleep(500);
  const bb = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(1600); await p.mouse.up(); await sleep(3600);
  chk('就它了 → 按住确认 → 登月', await p.evaluate(() => { const S = window.__lingcun.state(); return S.projects[S.cur].landed; }));
  await shot('create_08_land.png');
  console.log(A.join('\n')); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
  await b.close();
  process.exit(A.some(x => x.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
