/* v0.0.15 自测（Playwright + /usr/bin/google-chrome --no-sandbox --disable-gpu，375×812）。
   跑法：node selftest15.js [offline|online|all]   截图 → /workspace/lingcun/v0.0.15_selftest/ */
const { chromium } = require('playwright-core'); const path = require('path'); const fs = require('fs');
const URL = 'file://' + path.resolve(__dirname, '../page/index.html');
const OUT = '/workspace/lingcun/v0.0.15_selftest'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] || 'all';
const R = []; const ok = (name, cond, info) => { R.push([cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : String(info)]); console.log(cond ? 'PASS' : 'FAIL', name, info === undefined ? '' : info); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PRINCIPLE = /只管第一步|库打底|API 润色|不预设|第二步以后|引流|开图/;
async function launch() { return chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] }); }
async function page(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); p.errs = []; p.posts = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) p.errs.push('console: ' + m.text()); });
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
  await p.click('[data-act="' + act + '"]'); await sleep(150); await p.click('#pk-start'); await sleep(350);
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
  /* 1. 学编舞：三个大类都落到 学习 · 编舞 */
  for (const act of ['create', 'learn', 'career']) {
    const p = await page(b, { offline: true }); await enter(p, act, '学编舞'); const s = await st(p);
    ok('学编舞（首页选 ' + act + '）→ 学习 · 编舞', s.lc === '学习技能' && s.lib === 'choreography', s.lc + '/' + s.lib);
    if (act === 'create') {
      const seen = await cards(p, [0, 0, 1, 0], 'off_choreo');
      ok('学编舞 ④ 是现实动作（不再有「能点的原型」）', /今天先把哪件事落地/.test(seen[3]) && !/原型|第一屏/.test(seen[3]), seen[3].slice(0, 90));
      const f = await toStep(p, 'off_choreo'); ok('学编舞 第一步不是「第一屏」', !/第一屏/.test(f.check), f.check.slice(0, 80));
    }
    ok('学编舞（' + act + '）没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 2. 学游泳：15 分钟 → 约一节体验课 → 定时间 → .ics → 登月 → #done 回来 → 约好了 → 约在哪天 → 星图 ✓ */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '学游泳');
    const seen = await cards(p, [0, 0, 0, 1], 'off_swim');
    ok('学游泳 ③ 是「今天能拿出多久」三档', /今天能拿出多久？ \| 15 分钟 \| 半小时 \| 一小时 \| 其他，我自己写/.test(seen[2]), seen[2]);
    ok('学游泳 ④ 只列 15 分钟放得下的现实动作', /存好泳馆电话 \| 约一节体验课 \| 其他/.test(seen[3]) && !/买齐泳衣|浅水区/.test(seen[3]), seen[3]);
    const f = await toStep(p, 'off_swim');
    ok('学游泳 材料齐了：路线只占一行、无时长', /看清地图 → 打地基 → 天天小练 → 真用一次 → 查漏再练/.test(f.panel) && !/约 \d+ 周|第一阶段/.test(f.panel), f.panel);
    ok('学游泳 第一步 = 约体验课，摘星是完成态「约好了」', /打给泳馆，约一节成人入门体验课/.test(f.check) && /摘星 \| 约好了/.test(f.check), f.check.slice(0, 120));
    ok('学游泳 第一步页「之后」只一行、无时长', /之后 \| 看清地图 → 打地基/.test(f.check) && !/约 8 周/.test(f.check));
    await p.click('#ck-next'); await sleep(700); await shot(p, 'off_swim_08_commit');
    ok('学游泳 定时间一屏：标题「什么时候约？」', (await p.$eval('#h-save', e => e.innerText)) === '什么时候约？');
    await p.click('[data-cmi="2"]'); await p.fill('#cm-place', '城东游泳馆'); await sleep(150);
    const line = await p.$eval('#cm-line', e => e.innerText); ok('学游泳 主句跟着选择变', /周六 10:00 · 城东游泳馆/.test(line), line);
    await shot(p, 'off_swim_08b_commit_filled');
    const ics = await grabIcs(p, '#cm-go'); const un = checkIcs('学游泳', ics.text);
    ok('学游泳 .ics 地点和标题', /LOCATION:城东游泳馆/.test(un) && /SUMMARY:约一节体验课 · 学游泳/.test(un), ics.name);
    await sleep(500); ok('学游泳 加到日历后进按住确认', (await p.$eval('#h-save', e => e.innerText)).replace(/\s/g, '') === '是你认可的这一版？');
    ok('学游泳 走到登月', await hold(p, 'off_swim'));
    const s = await st(p); ok('学游泳 pin 记下时间地点', s.pin && s.pin.ics && s.pin.place === '城东游泳馆' && !s.pin.done, JSON.stringify(s.pin));
    await p.goto(URL + '#done=' + s.id); await p.reload(); await sleep(600); await shot(p, 'off_swim_11_return');
    const rt = await p.$eval('#v15-ret', e => e.innerText).catch(() => ''); ok('学游泳 从日历链接回来：显示「约好了吗？」+ 两个按钮', /约好了吗？/.test(rt) && /改个时间/.test(rt) && /周六 10:00 · 城东游泳馆/.test(rt), rt.replace(/\n+/g, ' | '));
    await p.click('#rt-done'); await sleep(900); await shot(p, 'off_swim_12_star');
    const rt2 = await p.$eval('#v15-ret', e => e.innerText); ok('学游泳 摘星：标题变完成态 + 星星，课的日期收起', /^另存人生\s+约好了/.test(rt2) && !!(await p.$('#rt-star svg')) && /课也加进日历/.test(rt2) && !/约在哪天？/.test(rt2), rt2.replace(/\n+/g, ' | ').slice(0, 120));
    await p.click('#rt-cls-open'); await sleep(300); await shot(p, 'off_swim_12b_class');
    ok('学游泳 点「课也加进日历」才展开「约在哪天？」', /约在哪天？/.test(await p.$eval('#v15-ret', e => e.innerText)));
    const ics2 = await grabIcs(p, '#rc-go'); checkIcs('学游泳 体验课', ics2.text);
    await p.click('#rt-map'); await sleep(900); await shot(p, 'off_swim_13_map');
    const mt = await bodyText(p); ok('学游泳 星图上标出「✓ 约好了」', /✓ 约好了/.test(mt));
    const s2 = await st(p); ok('学游泳 pin.done 写入', s2.pin.done && !!s2.pin.cls, JSON.stringify(s2.pin));
    ok('学游泳 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 3. 跑步：15 分钟 → 鞋放门口 → 明早几点出门 → .ics → 登月 → 第二天到点回来 → 鞋放门口了 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '想学跑步');
    const seen = await cards(p, [0, 0, 0, 0], 'off_run');
    const f = await toStep(p, 'off_run'); ok('跑步 第一步 = 鞋放门口', /把跑鞋、袜子和一套运动服放在门口/.test(f.check) && /摘星 \| 鞋放门口了/.test(f.check), f.check.slice(0, 90));
    await p.click('#ck-next'); await sleep(700);
    ok('跑步 定时间一屏：「明早几点出门？」默认 7:00', (await p.$eval('#h-save', e => e.innerText)) === '明早几点出门？' && /明早 7:00/.test(await p.$eval('#cm-line', e => e.innerText)));
    await p.fill('#cm-place', '江边步道'); await sleep(150); await shot(p, 'off_run_08_commit');
    const ics = await grabIcs(p, '#cm-go'); const un = checkIcs('跑步', ics.text);
    const dt = /DTSTART:(\d{8}T\d{6}Z)/.exec(un)[1]; const d = new Date(dt.replace(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/, '$1-$2-$3T$4:$5:$6Z'));
    ok('跑步 .ics 是明天本地 7:00', d.getHours() === 7 && d.getMinutes() === 0 && d.getDate() === new Date(Date.now() + 864e5).getDate(), d.toString());
    ok('跑步 走到登月', await hold(p, 'off_run'));
    await p.evaluate(() => { const S = window.__lingcun.state(), x = S.projects[S.cur]; x.pin.t = Date.now() - 6e4; x.pin.setAt = Date.now() - 864e5; localStorage.setItem('lingcun_v010_state', JSON.stringify(S)); });
    await p.reload(); await sleep(700); await shot(p, 'off_run_11_return');
    const rt = await p.$eval('#v15-ret', e => e.innerText).catch(() => ''); ok('跑步 到点打开页面：「鞋放门口了吗？」', /鞋放门口了吗？/.test(rt) && /江边步道/.test(rt), rt.replace(/\n+/g, ' | '));
    await p.click('#rt-done'); await sleep(900); await shot(p, 'off_run_12_star');
    ok('跑步 摘星完成态', /✓ 鞋放门口了/.test(await p.$eval('#v15-ret', e => e.innerText)) && !(await p.$('#rt-cls')));
    ok('跑步 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  /* 4. 学吉他：④ 跳过 → 默认「认一认吉他，挑一种」→ 挑一种的卡 → 古典吉他 → 挑好了 → 登月（不出日历） */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '学吉他');
    const seen = await cards(p, [0, 0, 0, 's'], 'off_guitar');
    ok('学吉他 15 分钟时 ④ 有「认一认吉他，挑一种」「约一节体验课」', /认一认吉他，挑一种 \| 约一节体验课/.test(seen[3]) && !/找到一家琴行/.test(seen[3]), seen[3]);
    const f = await toStep(p, 'off_guitar'); ok('学吉他 默认第一步 = 看一看吉他的几种和常见牌子', /看一看吉他的几种和常见牌子，挑出最想弹的那一种/.test(f.check) && noPrice(f.check), f.check.slice(0, 80));
    await p.click('#ck-next'); await sleep(700); await shot(p, 'off_guitar_08_pick');
    const t = await p.$eval('#b-save', e => e.innerText);
    ok('学吉他 挑一种：标题「想要哪一种？」+ 四种 + 一句说明，无价格', (await p.$eval('#h-save', e => e.innerText)) === '想要哪一种？' && /民谣吉他[\s\S]*古典吉他[\s\S]*电吉他[\s\S]*尤克里里/.test(t) && /雅马哈/.test(t) && noPrice(t), t.replace(/\n+/g, ' | '));
    await p.click('[data-pki="1"]'); await sleep(200); await shot(p, 'off_guitar_08b_pick_classical');
    ok('学吉他 主句跟着换成「古典吉他」', (await p.$eval('#pk2-line', e => e.innerText)) === '古典吉他' && /尼龙弦/.test(await p.$eval('#pk2-note', e => e.innerText)));
    await p.click('#cm-go'); await sleep(600);
    ok('学吉他 走到登月', await hold(p, 'off_guitar'));
    const s = await st(p); ok('学吉他 记下选择且已摘星', s.pin && s.pin.kind === 'pick' && s.pin.choice === '古典吉他' && s.pin.done, JSON.stringify(s.pin));
    ok('学吉他 没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '学吉他');
    const seen = await cards(p, [0, 0, 2, 0], ''); ok('学吉他 一小时时 ④ 四个现实动作', /认一认吉他，挑一种 \| 约一节体验课 \| 在家先练一次 \| 去琴行试一次/.test(seen[3]), seen[3]);
    const f = await toStep(p, ''); ok('学吉他 选了「认一认」也走挑一种', /看一看吉他的几种/.test(f.check));
    await p.click('#ck-next'); await sleep(700); ok('学吉他 主动选「认一认」→ 挑一种', !!(await p.$('[data-pki="3"]')));
    await p.ctx.close();
  }
  /* 5. 想学冥想：单独条目、在家做、按 ③ 换一步、没有定时间那屏 */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '想学冥想'); let s = await st(p);
    ok('想学冥想 → 学习 · 冥想（不是瑜伽）', s.lib === 'meditation', s.lib);
    await cards(p, [0, 0, 1, 0], 'off_med'); const f = await toStep(p, 'off_med');
    ok('想学冥想 半小时 → 引导音频那一步', /跟一段 10 分钟的正念引导音频/.test(f.check), f.check.slice(0, 80));
    await p.click('#ck-next'); await sleep(700);
    ok('想学冥想 没有定时间一屏，直接按住确认', !!(await p.$('#lc-go')) && !(await p.$('#cm-go')));
    ok('想学冥想 走到登月', await hold(p, '')); await p.ctx.close();
  }
  /* 6. 学日语、7. 转行、8. 创造（游戏、兜底的 q4_if） */
  {
    const p = await page(b, { offline: true }); await enter(p, 'learn', '零基础学日语');
    const seen = await cards(p, [1, 0, 0, 0], 'off_jp'); const f = await toStep(p, 'off_jp');
    ok('学日语 → japanese，③ 今天能拿出多久', (await st(p)).lib === 'japanese' && /今天能拿出多久？/.test(seen[2]));
    ok('学日语 第一步还是五十音、路线一行', /あいうえお/.test(f.check) && /之后 \| 看清地图 →/.test(f.check) && !/第一阶段/.test(f.check + f.panel), f.check.slice(0, 100));
    await p.click('#ck-next'); await sleep(700); ok('学日语 没有定时间一屏', !!(await p.$('#lc-go')));
    ok('学日语 走到登月', await hold(p, '')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'career', '想转行做产品经理');
    const seen = await cards(p, [2, 3, 1, 1], 'off_career'); const f = await toStep(p, 'off_career');
    ok('转行 → to_pm；③ 今天能拿出多久（无「约 X 周」）', (await st(p)).lib === 'to_pm' && /今天能拿出多久？ \| 15 分钟 \| 半小时 \| 一小时/.test(seen[2]) && !/约 \d+ (周|个月)/.test(seen[2]), seen[2]);
    ok('转行 框架短标签：方向 / 手里有 / 今天 / 证明；路线一行', /方向[\s\S]*手里有[\s\S]*今天[\s\S]*证明/.test(f.check) && /看清岗位 → 盘点自己/.test(f.panel) && !/准备期/.test(f.panel + f.check), f.check.slice(0, 140));
    await p.click('#ck-next'); await sleep(700); ok('转行 走到登月', await hold(p, 'off_career')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'create', '我想做一个游戏');
    const seen = await cards(p, [0, 0, 0, 0], 'off_create'); const f = await toStep(p, 'off_create');
    ok('创造 游戏 → game，四问不变', (await st(p)).lib === 'game' && /发生[\s\S]*给谁[\s\S]*形式[\s\S]*草样/.test(f.check));
    ok('创造 路线仍是时间轴（带时长和合计）', /合计/.test(f.panel) || /约 \d/.test(f.panel), f.panel.slice(0, 160));
    await p.click('#ck-next'); await sleep(700); ok('创造 没有定时间一屏', !!(await p.$('#lc-go')));
    ok('创造 走到登月', await hold(p, '')); await p.ctx.close();
  }
  {
    const p = await page(b, { offline: true }); await enter(p, 'create', '我想做点新东西');
    const seen = await cards(p, [0, 0, 0, 3], ''); ok('创造兜底 ③ 选「一件实物」时 ④ 不出「能点的原型」', !/能点的原型/.test(seen[3]) && /约一个人或一个地方试一次/.test(seen[3]), seen[3]);
    const f = await toStep(p, ''); ok('创造兜底 选了替换项 → 对应第一步', /想好第一个能试的人或地方/.test(f.check), f.check.slice(0, 60));
    await p.ctx.close();
    const p2 = await page(b, { offline: true }); await enter(p2, 'create', '我想做点新东西');
    const seen2 = await cards(p2, [0, 0, 2, 3], ''); ok('创造兜底 ③ 选「网页或小程序」时 ④ 保留「能点的原型」', /能点的原型/.test(seen2[3]), seen2[3]); await p2.ctx.close();
  }
  /* 页面上不出现原则文字；字体只有 OFL 子集 */
  {
    const html = fs.readFileSync(path.resolve(__dirname, '../page/index.html'), 'utf8');
    const vis = html.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    ok('页面可见文案里没有原则文字', !PRINCIPLE.test(vis.replace(/<script type="application\/json" id="lc-lib">[\s\S]*?<\/script>/, '')), (vis.match(PRINCIPLE) || [''])[0]);
    const fonts = fs.readdirSync(path.resolve(__dirname, '../page/fonts')); ok('字体文件只有 OFL 子集', fonts.every(f => /^(geist|lc-head|lc-head-ext|lc-sans-300|lc-sans-400)\.woff2$|^OFL_|README/.test(f)) && !fonts.some(f => /MiSans|HarmonyOS|OPPO|Alibaba|PuHui/i.test(f)), fonts.join(','));
    ok('库里没有价格数字', noPrice(html.match(/<script type="application\/json" id="lc-lib">([\s\S]*?)<\/script>/)[1]));
  }
}
async function online(b) {
  const p = await page(b, {});
  ok('联网：默认走免费中转', (await p.evaluate(() => window.lingcunAI.mode())) === 'relay');
  await enter(p, 'learn', '学游泳');
  for (let i = 0; i < 70 && !(await p.evaluate(() => { const x = window.__lingcun.state().projects[0]; return !!x.lopts || window.lingcunAI.timings.some(t => t.type === 'lib_options' && t.ok !== null); })); i++) await sleep(100);
  const seen = await cards(p, [0, 0, 1, 2], 'on_swim');
  ok('联网：③ 三档固定、④ 现实动作没被改写', /15 分钟 \| 半小时 \| 一小时/.test(seen[2]) && /存好泳馆电话 \| 约一节体验课 \| 买齐泳衣泳镜/.test(seen[3]), seen[3]);
  for (let i = 0; i < 90; i++) { const s = await st(p); if (s.plan && s.plan.src === 'ai') break; await sleep(100); }
  const f = await toStep(p, 'on_swim'); const s = await st(p);
  ok('联网：第一步拿到了且仍是买泳衣这件事', /泳衣|泳镜|泳帽/.test(s.out.first_step) && noPrice(s.out.first_step), s.out.first_step + '（' + s.out.src + '）');
  ok('联网：路线一行', /看清地图 → 打地基/.test(f.panel));
  ok('联网：一局 AI 调用 ≤ 3 次', p.posts.length <= 3, p.posts.join(','));
  await p.click('#ck-next'); await sleep(700); ok('联网：定时间一屏「什么时候去买？」', (await p.$eval('#h-save', e => e.innerText)) === '什么时候去买？');
  const ics = await grabIcs(p, '#cm-go'); checkIcs('联网 买泳衣', ics.text);
  ok('联网：走到登月', await hold(p, 'on_swim'));
  const tm = await p.evaluate(() => window.lingcunAI.timings.map(t => ({ type: t.type, ok: t.ok, ms: t.full_ms })));
  fs.writeFileSync(path.join(OUT, 'online_run.json'), JSON.stringify({ posts: p.posts, timings: tm, lopts: (await p.evaluate(() => window.__lingcun.state().projects[0].lopts)), plan: s.plan, out: s.out, panel: f.panel, check: f.check }, null, 1));
  ok('联网：没有页面报错', !p.errs.length, p.errs.join(' / ')); await p.ctx.close();
  const p2 = await page(b, {}); await enter(p2, 'create', '学编舞'); const s2 = await st(p2); ok('联网：学编舞（创造）→ 学习 · 编舞', s2.lib === 'choreography'); await p2.ctx.close();
}
(async () => {
  const b = await launch();
  try { if (ONLY === 'all' || ONLY === 'offline') await offline(b); if (ONLY === 'all' || ONLY === 'online') await online(b); } catch (e) { ok('脚本没有中断', false, e.stack); }
  await b.close();
  const pass = R.filter(r => r[0] === 'PASS').length;
  fs.writeFileSync(path.join(OUT, 'result_' + ONLY + '.txt'), R.map(r => r.join('\t')).join('\n') + '\n' + pass + '/' + R.length + '\n');
  console.log(pass + '/' + R.length);
})();
