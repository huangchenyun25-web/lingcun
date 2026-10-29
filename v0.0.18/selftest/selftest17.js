/* v0.0.17 自测（Playwright + /usr/bin/google-chrome --no-sandbox --disable-gpu）。沿用 v0.0.16 的 375×812 流程，另加 layout：
   桌面 1280×720 / 1366×768 / 1440×900 / 1920×1080 + 手机 390×844。
   跑法：node selftest17.js [offline|online|layout|all]   截图 → /workspace/lingcun/v0.0.17_selftest/ */
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../page/index.html');
const OUT = '/workspace/lingcun/v0.0.17_selftest'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] || 'all';
const R = []; const ok = (name, cond, info) => { R.push([cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : String(info)]); console.log(cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : info); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PRINCIPLE = /只管第一步|库打底|API 润色|不预设|第二步以后|引流|开图/;
async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] }); }
async function page(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); p.errs = []; p.posts = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|CORS policy|origin 'null'/.test(m.text())) p.errs.push('console: ' + m.text()); });
  p.on('request', r => { if (/workers\.dev/.test(r.url()) && r.method() === 'POST') { let ty = ''; try { ty = (JSON.parse(r.postData()).messages[0].content.match(/任务类型：(\w+)/) || [])[1] || '?'; } catch (e) {} p.posts.push(ty); } });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(250);
  if (o.offline) await ctx.setOffline(true);
  p.ctx = ctx; return p;
}
const st = p => p.evaluate(() => { const S = window.__lingcun.state(); const x = S.projects[S.cur] || {}; return { stage: S.stage, lc: x.lc, lib: x.lib, borrow: x.borrow, out: x.out, plan: x.plan, saved: x.saved, pin: x.pin, id: x.id }; });
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
const cardText = p => p.$eval('#deck .q.cur', e => e.innerText.replace(/\n+/g, ' | '));
const bodyText = p => p.evaluate(() => document.body.innerText);
async function enter(p, act, goal) {
  /* v0.0.16：首页无大类胶囊；act 参数保留兼容，忽略 */
  await p.click('#pk-start'); await sleep(350);
  if (await p.$('#vz-type')) { await p.click('#vz-type'); await sleep(150); }
  await p.fill('#pk-idea', goal); await sleep(100); await p.click('#pk-go'); await sleep(550);
}
/* picks：数字 = 第 n 个选项；'s' = 底部「跳过」 */
async function cards(p, picks, pre) {
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(await cardText(p)); if (pre) await shot(p, pre + '_0' + (i + 2) + '_q' + (i + 1));
    if (picks[i] === 's') await p.click('#mat-skip'); else await p.click('#deck .q.cur label.choice:not(.skip) >> nth=' + picks[i]);
    await sleep(900);
  }
  return seen;
}
async function toStep(p, pre) {
  await sleep(300); if (pre) await shot(p, pre + '_06_ready');
  const panel = (await p.$eval('#cr-panel', e => e.innerText)).replace(/\n+/g, ' | ');
  await p.click('#mat-go'); for (let i = 0; i < 150 && !(await p.$('#cr-first')); i++) await sleep(100);
  await sleep(400); if (pre) await shot(p, pre + '_07_step');
  return { panel, check: (await p.$eval('#b-check', e => e.innerText)).replace(/\n+/g, ' | ') };
}
async function hold(p, pre) {
  if (pre) await shot(p, pre + '_09_confirm');
  const bx = await (await p.$('#lc-go')).boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await sleep(1600); await p.mouse.up();
  for (let i = 0; i < 60 && !(await p.$('#land')); i++) await sleep(100);
  await sleep(1200); if (pre) await shot(p, pre + '_10_land');
  return !!(await p.$('#land'));
}
async function grabIcs(p, sel) { const [dl] = await Promise.all([p.waitForEvent('download'), p.click(sel)]); const fp = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(fp); return { name: dl.suggestedFilename(), text: fs.readFileSync(fp, 'utf8') }; }
function checkIcs(name, t) {
  const lines = t.split('\r\n'); const bad = lines.filter(l => Buffer.byteLength(l, 'utf8') > 75);
  const un = t.replace(/\r\n /g, '');
  ok(name + ' .ics：CRLF 换行、末尾有 CRLF', !/[^\r]\n/.test(t) && t.endsWith('\r\n'));
  ok(name + ' .ics：每行 ≤ 75 字节（折行正确）', !bad.length, bad.length ? bad[0] : lines.length + ' 行');
  ok(name + ' .ics：VCALENDAR / VEVENT / VALARM 成对', ['VCALENDAR', 'VEVENT', 'VALARM'].every(k => un.split('BEGIN:' + k).length === 2 && un.split('END:' + k).length === 2));
  ok(name + ' .ics：VERSION 2.0 + PRODID + UID + DTSTAMP', /\r\nVERSION:2\.0\r\n/.test(un) && /PRODID:/.test(un) && /\r\nUID:\S+@lingcun/.test(un) && /DTSTAMP:\d{8}T\d{6}Z/.test(un));
  ok(name + ' .ics：DTSTART / DTEND 是 UTC 且 END 晚于 START', (() => { const a = /DTSTART:(\d{8}T\d{6}Z)/.exec(un), b2 = /DTEND:(\d{8}T\d{6}Z)/.exec(un); return a && b2 && b2[1] > a[1]; })());
  ok(name + ' .ics：提醒 TRIGGER:-PT30M（ACTION:DISPLAY）', /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[^\r]+\r\nTRIGGER:-PT30M\r\nEND:VALARM/.test(un));
  ok(name + ' .ics：带回到页面的 #done 链接', /#done=\d+/.test(un));
  return un;
}
function noPrice(t) { return !/[¥￥$]|\d+(\.\d+)?\s*(元|块钱|块|美元|rmb)/i.test(t); }

async function offline(b) {
  /* 0. 入口 2A：无三大胶囊；文案；找到我的第一步 */
  {
    const p = await page(b, { offline: true });
    ok('首页无创造/学习/转行胶囊', !(await p.$('[data-act]')));
    ok('首页主按钮「找到我的第一步」', (await p.$eval('#pk-start', e => e.innerText)) === '找到我的第一步');
    ok('首页主句处境', /不想一直这样过/.test(await p.$eval('#h-pick', e => e.innerText)) && /先让一件小事不一样/.test(await bodyText(p)));
    ok('默认静音', await p.evaluate(() => window.__lingcunAudio.muted) === true);
    await shot(p, 'off_home_01');
    await p.click('#pk-start'); await sleep(350);
    if (await p.$('#vz-type')) await p.click('#vz-type');
    ok('问句屏', /哪件事想有点不一样|有点不一样/.test(await p.$eval('#h-pick', e => e.innerText)));
    ok('有例子芯片', (await p.$$('#pk-exchips button')).length >= 4);
    await shot(p, 'off_home_02_idea');
    await p.ctx.close();
  }
  /* 1. 繁花画展：四 bug + exhibition */
  {
    const p = await page(b, { offline: true }); await enter(p, 'create', '办一场《繁花》主题画展活动');
    let s = await st(p); ok('画展 → exhibition（不是 event/共读）', s.lib === 'exhibition', s.lib);
    const seen = await cards(p, [0, 0, 0, 0], 'off_show');
    ok('画展 ① 无「二十个人一起读完一本书」', !/二十个人一起读完一本书/.test(seen[0]), seen[0]);
    const f = await toStep(p, 'off_show');
    ok('画展 第一步是一页方案', /主题|展品|动线|展签|方案/.test(f.check), f.check.slice(0, 100));
    ok('画展 摘星不要求发给别人', !/发给|拿给一个人|别人看过/.test(f.check) && /一页方案写完了|展签|草图|名单/.test(f.check), f.check.slice(0, 120));
    ok('结果三行', /我想改变什么/.test(f.check) && /我先做什么/.test(f.check) && /今天做到哪儿就够了/.test(f.check), f.check.slice(0, 160));
    /* bug3：验收可本地改（有「改」按钮；点开 prompt） */
    ok('画展 验收旁有本地改', !!(await p.$('#tl-star-ed')));
    p.once('dialog', async d => { ok('画展 改验收弹出输入', true, d.message()); await d.accept('一页方案自己写完了'); });
    await p.click('#tl-star-ed'); await sleep(400);
    const starV = await p.$eval('#cr-star-v', e => e.innerText);
    ok('画展 本地改验收句生效', starV === '一页方案自己写完了', starV);
    await p.click('#ck-next'); await sleep(700);
    ok('画展 走到登月', await hold(p, 'off_show'));
    s = await st(p); ok('画展 已登月', !!s.saved, JSON.stringify(s));
    /* bug4：刷新 resume */
    await p.reload(); await sleep(700); await shot(p, 'off_show_11_resume');
    const rs = await p.$eval('#resume', e => e.innerText).catch(() => '');
    ok('画展 登月后刷新不再说「确认登月」', /已经登上|看星图|分享|再改/.test(rs) && !/确认这一版是你认可的，然后登月/.test(rs), rs.replace(/\n+/g, ' | ').slice(0, 160));
    ok('画展 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 1b. 入口不选大类：学游泳 */
  {
    const p = await page(b, { offline: true }); await enter(p, '', '学游泳');
    ok('学游泳 不选大类 → swimming', (await st(p)).lib === 'swimming', (await st(p)).lib);
    await p.ctx.close();
  }
  /* 2. 学游泳 alone-default 1A */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '学游泳');
    const seen = await cards(p, [0, 0, 0, 0], 'off_swim');
    ok('学游泳 15 分钟 ④ 默认先「买齐泳镜泳帽」，约课仍在', /买齐泳镜泳帽/.test(seen[3]) && /约一节体验课/.test(seen[3]), seen[3]);
    const f = await toStep(p, 'off_swim');
    ok('学游泳 默认第一步 = 买齐泳镜装进包（一个人能做完）', /买齐泳镜/.test(f.check) && /包放门口|装进/.test(f.check) && !/约一节体验课/.test(f.check.split('摘星')[0]), f.check.slice(0, 100));
    ok('学游泳 三行结果', /我想改变什么/.test(f.check));
    await p.click('#ck-next'); await sleep(700);
    ok('学游泳 定时间：「什么时候去买？」', /什么时候去买/.test(await p.$eval('#h-save', e => e.innerText)));
    await p.click('[data-cmi="2"]'); await p.fill('#cm-place', '城东游泳馆'); await sleep(150);
    await shot(p, 'off_swim_08b_commit_filled');
    const ics = await grabIcs(p, '#cm-go'); const un = checkIcs('学游泳', ics.text);
    ok('学游泳 .ics 地点和标题', /LOCATION:城东游泳馆/.test(un) && /买齐泳镜/.test(un), ics.name);
    await sleep(500); ok('学游泳 加到日历后进按住确认', /是你认可的这一版/.test((await p.$eval('#h-save', e => e.innerText)).replace(/\s/g, '')));
    ok('学游泳 走到登月', await hold(p, 'off_swim'));
    const s = await st(p); ok('学游泳 pin 记下', s.pin && s.pin.ics && s.pin.place === '城东游泳馆' && !s.pin.done, JSON.stringify(s.pin));
    await p.goto(URL + '#done=' + s.id); await p.reload(); await sleep(600); await shot(p, 'off_swim_11_return');
    const rt = await p.$eval('#v15-ret', e => e.innerText).catch(() => '');
    ok('学游泳 回来问完成态', /包放门口了吗？|存好了吗？/.test(rt) && /城东游泳馆/.test(rt), rt.replace(/\n+/g, ' | '));
    await p.click('#rt-done'); await sleep(900); await shot(p, 'off_swim_12_star');
    const rt2 = await p.$eval('#v15-ret', e => e.innerText);
    ok('学游泳 摘星完成态 + 庆祝档', /包放门口了|我决定从这里开始|我试过了/.test(rt2) && !!(await p.$('#rt-star')), rt2.replace(/\n+/g, ' | ').slice(0, 140));
    await p.click('#rt-map'); await sleep(900); await shot(p, 'off_swim_13_map');
    ok('学游泳 星图标完成态', /✓ 包放门口了|✓ /.test(await bodyText(p)));
    ok('学游泳 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 3. 跑步 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '想学跑步');
    await cards(p, [0, 0, 0, 0], 'off_run');
    const f = await toStep(p, 'off_run'); ok('跑步 第一步 = 鞋放门口', /把跑鞋、袜子和一套运动服放在门口/.test(f.check), f.check.slice(0, 90));
    await p.click('#ck-next'); await sleep(700);
    ok('跑步 定时间一屏', /明早几点出门/.test(await p.$eval('#h-save', e => e.innerText)));
    await p.fill('#cm-place', '江边步道'); await sleep(150); await shot(p, 'off_run_08_commit');
    const ics = await grabIcs(p, '#cm-go'); checkIcs('跑步', ics.text);
    ok('跑步 走到登月', await hold(p, 'off_run'));
    await p.evaluate(() => { const S = window.__lingcun.state(), x = S.projects[S.cur]; x.pin.t = Date.now() - 6e4; x.pin.setAt = Date.now() - 864e5; localStorage.setItem('lingcun_v010_state', JSON.stringify(S)); });
    await p.reload(); await sleep(700); await shot(p, 'off_run_11_return');
    const rt = await p.$eval('#v15-ret', e => e.innerText).catch(() => ''); ok('跑步 到点：「鞋放门口了吗？」', /鞋放门口了吗？/.test(rt), rt.replace(/\n+/g, ' | '));
    await p.click('#rt-done'); await sleep(900); await shot(p, 'off_run_12_star');
    ok('跑步 摘星', /✓ 鞋放门口了/.test(await p.$eval('#v15-ret', e => e.innerText)));
    ok('跑步 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 4. 学吉他 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '学吉他');
    const seen = await cards(p, [0, 0, 0, 's'], 'off_guitar');
    ok('学吉他 ④ 有认一认/约课', /认一认吉他，挑一种/.test(seen[3]) && /约一节体验课/.test(seen[3]), seen[3]);
    const f = await toStep(p, 'off_guitar'); ok('学吉他 默认认一认', /看一看吉他的几种和常见牌子/.test(f.check), f.check.slice(0, 80));
    await p.click('#ck-next'); await sleep(700); await shot(p, 'off_guitar_08_pick');
    ok('学吉他 挑一种', (await p.$eval('#h-save', e => e.innerText)) === '想要哪一种？');
    await p.click('[data-pki="1"]'); await sleep(200);
    await p.click('#cm-go'); await sleep(600);
    ok('学吉他 走到登月', await hold(p, 'off_guitar'));
    const s = await st(p); ok('学吉他 记下古典吉他', s.pin && s.pin.choice === '古典吉他' && s.pin.done, JSON.stringify(s.pin));
    ok('学吉他 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 5. 冥想 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '想学冥想');
    ok('冥想 → meditation', (await st(p)).lib === 'meditation', (await st(p)).lib);
    await cards(p, [0, 0, 1, 0], 'off_med'); const f = await toStep(p, 'off_med');
    ok('冥想 半小时引导音频', /正念引导音频|安静坐/.test(f.check), f.check.slice(0, 80));
    await p.click('#ck-next'); await sleep(700);
    ok('冥想 直接按住确认', !!(await p.$('#lc-go')) && !(await p.$('#cm-go')));
    ok('冥想 走到登月', await hold(p, '')); await p.ctx.close();
  }
  /* 6. 日语 7. 转行 8. 创造游戏 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '零基础学日语');
    await cards(p, [1, 0, 0, 0], 'off_jp'); const f = await toStep(p, 'off_jp');
    ok('学日语 → japanese', (await st(p)).lib === 'japanese');
    ok('学日语 五十音', /あいうえお|五十音/.test(f.check), f.check.slice(0, 100));
    await p.click('#ck-next'); await sleep(700); ok('学日语 走到登月', await hold(p, '')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'career', '想转行做产品经理');
    await cards(p, [2, 3, 1, 1], 'off_career'); const f = await toStep(p, 'off_career');
    ok('转行 → to_pm', (await st(p)).lib === 'to_pm', (await st(p)).lib);
    await p.click('#ck-next'); await sleep(700); ok('转行 走到登月', await hold(p, 'off_career')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'create', '我想做一个游戏');
    await cards(p, [0, 0, 0, 0], 'off_create'); const f = await toStep(p, 'off_create');
    ok('创造游戏 → game', (await st(p)).lib === 'game', (await st(p)).lib);
    ok('创造 三行', /我想改变什么/.test(f.check));
    await p.click('#ck-next'); await sleep(700); ok('创造 走到登月', await hold(p, '')); await p.ctx.close();
  }
  /* 9. 兜底换一类 2B */
  {
    const p = await page(b, { offline: true }); await enter(p, '', '我想做点新东西');
    const s = await st(p); ok('兜底 create_generic', s.lib === 'create_generic', s.lib);
    ok('兜底出现「换一类」', !!(await p.$('#btn-swap')));
    await shot(p, 'off_swap_01');
    await p.click('#btn-swap'); await sleep(600);
    const s2 = await st(p); ok('换一类后大类变了', s2.lc !== s.lc || s2.lib !== s.lib, JSON.stringify(s2));
    await p.ctx.close();
  }
  /* 10. 静音切换 + reduced-motion */
  {
    const p = await page(b, { offline: true });
    // 首页小人菜单在部分屏会藏；直接调钩子 + 强制打开菜单
    await p.evaluate(() => { const b = document.getElementById('menu-btn'); if (b) { b.classList.remove('hidden'); b.style.display = 'block'; b.style.visibility = 'visible'; } });
    await p.click('#menu-btn', { force: true }); await sleep(250);
    const has = await p.$('#menu-mute');
    ok('菜单有声音开关', !!has);
    if (has) {
      ok('默认显示声音：关', /声音：关/.test(await p.$eval('#menu-mute', e => e.innerText)));
      await p.click('#menu-mute'); await sleep(150);
      ok('打开声音', (await p.evaluate(() => window.__lingcunAudio.muted)) === false);
    } else {
      await p.evaluate(() => window.__lingcunAudio.setMuted(false));
      ok('打开声音（钩子）', (await p.evaluate(() => window.__lingcunAudio.muted)) === false);
    }
    await shot(p, 'off_mute_01'); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true });
    await p.goto(URL + '?reduce=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(300);
    ok('?reduce=1 生效', await p.evaluate(() => window.__lingcun && true) === true);
    await enter(p, '', '学游泳');
    await cards(p, [0, 0, 0, 0], ''); const f = await toStep(p, '');
    await p.click('#ck-next'); await sleep(500);
    if (await p.$('#cm-skip')) { await p.click('#cm-skip'); await sleep(500); }
    ok('reduce 下点一下也能确认登月', await hold(p, 'off_reduce'));
    await shot(p, 'off_reduce_10_land'); await p.ctx.close();
  }
  /* 页面约束 */
  {
    const html = fs.readFileSync(path.resolve(__dirname, '../page/index.html'), 'utf8');
    const vis = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    ok('页面可见文案里没有原则文字', !PRINCIPLE.test(vis.replace(/<script type="application\/json" id="lc-lib">[\s\S]*?<\/script>/, '')), (vis.match(PRINCIPLE) || [''])[0]);
    ok('本版无开图署名文案', !/另存人生 · 开图的第一步/.test(vis));
    const fonts = fs.readdirSync(path.resolve(__dirname, '../page/fonts')); ok('字体文件只有 OFL 子集', fonts.every(f => /^(geist|lc-head|lc-head-ext|lc-sans-300|lc-sans-400)\.woff2$|^OFL_|README/.test(f)) && !fonts.some(f => /MiSans|HarmonyOS|OPPO|Alibaba|PuHui/i.test(f)), fonts.join(','));
    ok('库里没有价格数字', noPrice(html.match(/<script type="application\/json" id="lc-lib">([\s\S]*?)<\/script>/)[1]));
    ok('标题和版本号是 v0.0.17', /<title>另存人生（v0\.0\.17 测试版）<\/title>/.test(html) && /VERSION = "0\.0\.17"/.test(html));
    ok('页面有 Rive 钩子与文件名', /__lingcun16/.test(html) && /__lingcunAudio/.test(html) && /lc_st01_star\.riv/.test(html) && /lc_l01_hold\.riv/.test(html));
    ok('vendor/rive 文件在 page 里', fs.existsSync(path.resolve(__dirname, '../page/vendor/rive.js')) && fs.existsSync(path.resolve(__dirname, '../page/rive/lc_st01_star.riv')));
  }
}

/* ---------- v0.0.17：宽屏入口两栏；所有屏的主操作在第一屏 ---------- */
const DESK = [[1280, 720], [1366, 768], [1440, 900], [1920, 1080]];
async function inView(p, sels) {
  return p.evaluate(ss => ss.map(s => { const e = document.querySelector(s); if (!e) return [s, 'missing']; const r = e.getBoundingClientRect(); const ok = r.height > 0 && r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; return [s, ok ? 'ok' : Math.round(r.top) + '-' + Math.round(r.bottom)]; }), sels);
}
const allOk = a => a.every(x => x[1] === 'ok');
const fmt = a => a.filter(x => x[1] !== 'ok').map(x => x.join(':')).join(' ') || 'ok';
async function dpage(b, w, h, q) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, acceptDownloads: true });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource|CORS policy|origin 'null'/.test(m.text())) p.errs.push('console: ' + m.text()); });
  await p.goto(URL + (q || '')); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(300);
  await ctx.setOffline(true); p.ctx = ctx; return p;
}
const RIGHT = ['#pk-exchips', '.pk-r .netline', '#pk-more', '#pk-back'];
async function layout(b) {
  for (const [w, h] of DESK) {
    const T = w + '×' + h, pre = 'desk_' + w;
    const p = await dpage(b, w, h);
    await sleep(600); await shot(p, pre + '_01_home');
    ok(T + ' 首页「找到我的第一步」在第一屏', allOk(await inView(p, ['#h-pick', '#pk-start'])));
    await p.click('#pk-start'); await sleep(900); await shot(p, pre + '_02_idea');
    ok(T + ' 问句屏：没有重复副标题', !(await p.$('#pk-desc')) && !/你最想让生活里的哪件事有点不一样/.test(await p.$eval('#b-pick', e => e.innerText)));
    ok(T + ' 问句屏：大标题「哪件事想有点不一样？」', (await p.$eval('#h-pick', e => e.innerText)) === '哪件事想有点不一样？');
    const g = await p.evaluate(() => { const L = document.querySelector('.pk-l'), R = document.querySelector('.pk-r'), H = document.querySelector('#s-pick > .head'); if (!L || !R) return null; const l = L.getBoundingClientRect(), r = R.getBoundingClientRect(), hh = H.getBoundingClientRect(); return { lr: l.right, rl: r.left, hr: hh.right, vzIn: !!L.querySelector('#vz-btn'), typeIn: !!R.querySelector('#vz-type'), chipsIn: !!R.querySelector('#pk-exchips'), backIn: !!R.querySelector('#pk-back'), moreIn: !!R.querySelector('#pk-more'), net: !!R.querySelector('.netline') }; });
    ok(T + ' 两栏：左＝问句＋按住说话，右＝打字/例子/说明/更多/回去', g && g.rl >= g.lr && g.rl >= g.hr && g.vzIn && g.typeIn && g.chipsIn && g.backIn && g.moreIn && g.net, JSON.stringify(g));
    let v = await inView(p, ['#h-pick', '#vz-btn', '#vz-type'].concat(RIGHT));
    ok(T + ' 语音态：全部在第一屏', allOk(v), fmt(v));
    ok(T + ' 语音态：不用滚动', await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), await p.evaluate(() => document.documentElement.scrollHeight + '/' + innerHeight));
    /* 模拟说完（done 态）：文字卡和「就这样」也在第一屏 */
    await p.evaluate(() => document.getElementById('vz').setAttribute('data-st', 'done')); await sleep(200);
    v = await inView(p, ['#vz-text', '#vz-ok', '#pk-back']); ok(T + ' 说完态（模拟）：文字卡、就这样在第一屏；打字收起', allOk(v) && !(await p.isVisible('#vz-type')), fmt(v));
    if (w === 1440) await shot(p, pre + '_02c_voice_done_sim');
    await p.evaluate(() => document.getElementById('vz').setAttribute('data-st', 'idle'));
    /* 更多展开后还能看到 */
    await p.click('#pk-more summary'); await sleep(300); if (w === 1440 || w === 1280) await shot(p, pre + '_02d_more_open');
    ok(T + ' 更多展开：「还没想好，看看例子」可见', allOk(await inView(p, ['#pk-none'])));
    await p.click('#pk-more summary'); await sleep(200);
    await p.click('#vz-type'); await sleep(500); await shot(p, pre + '_02b_type');
    v = await inView(p, ['#h-pick', '#pk-idea', '#pk-go'].concat(RIGHT));
    ok(T + ' 打字态：输入框在左，右栏都在第一屏', allOk(v) && (await p.evaluate(() => !!document.querySelector('.pk-l #pk-typebox'))), fmt(v));
    ok(T + ' 打字态：不用滚动', await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
    await p.click('#pk-exchips button >> nth=1'); await sleep(150);
    ok(T + ' 点例子填进输入框', (await p.inputValue('#pk-idea')) === '想开始跑步，但总迈不出第一步');
    await p.fill('#pk-idea', '学游泳'); await p.click('#pk-go'); await sleep(900);
    /* 其它屏：主操作在第一屏 */
    await shot(p, pre + '_03_q1'); v = await inView(p, ['#deck .q.cur label.choice:not(.skip)', '#mat-skip']);
    ok(T + ' 卡片屏：选项和「跳过」在第一屏', allOk(v), fmt(v));
    for (let i = 0; i < 4; i++) { await p.click('#deck .q.cur label.choice:not(.skip) >> nth=0'); await sleep(900); }
    await sleep(500); await shot(p, pre + '_04_ready'); v = await inView(p, ['#mat-go']); ok(T + ' 准备屏：「做出第一版」在第一屏', allOk(v), fmt(v));
    await p.click('#mat-go'); for (let i = 0; i < 150 && !(await p.$('#cr-first')); i++) await sleep(100);
    await sleep(900); await shot(p, pre + '_05_step'); v = await inView(p, ['#ck-next', '.threelines .tl.main']); ok(T + ' 第一步屏：「就它了」和第一步在第一屏', allOk(v), fmt(v));
    await p.click('#ck-next'); await sleep(1000); await shot(p, pre + '_06_commit'); v = await inView(p, ['#cm-go']); ok(T + ' 定时间屏：主按钮在第一屏', allOk(v), fmt(v));
    if (await p.$('#cm-skip')) { await p.click('#cm-skip'); await sleep(1000); }
    await shot(p, pre + '_07_confirm'); v = await inView(p, ['#lc-go']); ok(T + ' 确认登月屏：按住按钮在第一屏', allOk(v), fmt(v));
    const bx = await (await p.$('#lc-go')).boundingBox();
    await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await sleep(1600); await p.mouse.up();
    for (let i = 0; i < 60 && !(await p.$('#land')); i++) await sleep(100);
    await sleep(1500); await shot(p, pre + '_08_land'); ok(T + ' 桌面上走到登月', !!(await p.$('#land')));
    ok(T + ' 没有页面报错', !p.errs.length, p.errs.join(' / '));
    await p.ctx.close();
    /* 不支持语音的浏览器：直接打字态 */
    const q = await dpage(b, w, h, '?voice=off'); await q.click('#pk-start'); await sleep(900);
    v = await inView(q, ['#pk-idea', '#pk-go'].concat(RIGHT)); ok(T + ' voice=off：打字框和右栏在第一屏', allOk(v), fmt(v));
    if (w === 1440) await shot(q, pre + '_02e_voice_off');
    await q.ctx.close();
  }
  /* 手机 390×844：布局不变（单栏，顺序：问句 → 按住说话 → 打字 → 例子 → 说明 → 更多 → 回去） */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(600);
    await shot(p, 'phone390_01_home');
    await p.click('#pk-start'); await sleep(900); await shot(p, 'phone390_02_idea');
    const m = await p.evaluate(() => {
      const q = s => document.querySelector(s).getBoundingClientRect();
      const t = q('#vz-type'), btn = q('#vz-btn'), ch = q('#pk-exchips'), net = q('#b-pick .netline'), mo = q('#pk-more'), bk = q('#pk-back'), hd = q('#h-pick');
      return { contents: getComputedStyle(document.querySelector('.pk-r')).display, single: Math.abs((t.left + t.right) / 2 - innerWidth / 2) < 3, order: hd.bottom <= btn.top && btn.bottom <= t.top && t.bottom <= ch.top && ch.bottom <= net.top && net.bottom <= mo.top && mo.bottom <= bk.top, desc: !!document.getElementById('pk-desc') };
    });
    ok('手机 390：单栏、「打字」居中、顺序不变、无副标题', m.contents === 'contents' && m.single && m.order && !m.desc, JSON.stringify(m));
    await p.click('#vz-type'); await sleep(400); await shot(p, 'phone390_02b_type');
    ok('手机 390：打字态有输入框和例子', await p.isVisible('#pk-idea') && (await p.$$('#pk-exchips button')).length >= 4);
    await p.fill('#pk-idea', '学游泳'); await p.click('#pk-go'); await sleep(900); await shot(p, 'phone390_03_q1');
    ok('手机 390：进到卡片屏', !!(await p.$('#deck .q.cur')));
    ok('手机 390：没有页面报错', !errs.length, errs.join(' / '));
    await ctx.close();
  }
}

async function online(b) {
  const p = await page(b, {});
  ok('联网：默认走免费中转', (await p.evaluate(() => window.lingcunAI.mode())) === 'relay');
  await enter(p, '', '学游泳');
  await cards(p, [0, 0, 1, 0], 'on_swim'); // 半小时 → 仍含买齐
  const f = await toStep(p, 'on_swim');
  ok('联网 学游泳 有第一步', /买齐|泳/.test(f.check), f.check.slice(0, 80));
  ok('联网 调用次数 ≤3', p.posts.length <= 3, p.posts.join(','));
  await p.click('#ck-next'); await sleep(700);
  if (await p.$('#cm-skip')) await p.click('#cm-skip');
  await sleep(400);
  ok('联网 走到登月', await hold(p, 'on_swim'));
  ok('联网 没有页面报错', !p.errs.length, p.errs.join(' / '));
  await shot(p, 'on_swim_10_land');
  await p.ctx.close();
}


(async () => {
  const b = await launch();
  try { if (ONLY === 'all' || ONLY === 'offline') await offline(b); if (ONLY === 'all' || ONLY === 'online') await online(b); if (ONLY === 'all' || ONLY === 'layout') await layout(b); } catch (e) { ok('脚本没有中断', false, e.stack); }
  await b.close();
  const pass = R.filter(r => r[0] === 'PASS').length;
  fs.writeFileSync(path.join(OUT, 'result_' + ONLY + '.txt'), R.map(r => r.join('\t')).join('\n') + '\n' + pass + '/' + R.length + '\n');
  console.log(pass + '/' + R.length);
})();
