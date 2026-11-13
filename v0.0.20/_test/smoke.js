const { chromium } = require('playwright-core'); const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../page/index.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
  await p.goto(URL + '?relay=off'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(300);
  console.log('head', await p.textContent('#h-pick'));
  console.log('caps', await p.$$eval('[data-act]', a => a.map(x => x.textContent)));
  await p.click('[data-act="learn"]'); await p.click('#pk-start'); await p.waitForTimeout(300);
  console.log('voice?', !!await p.$('#vz'), 'typebox hidden?', await p.$eval('#pk-typebox', e => e.classList.contains('hidden')));
  await p.screenshot({ path: '/tmp/s1.png' });
  await p.click('#vz-type'); await p.fill('#pk-idea', '零基础学日语'); await p.click('#pk-go'); await p.waitForTimeout(500);
  console.log(await p.evaluate(() => { const S = window.__lingcun.state(); const x = S.projects[S.cur]; return [x.cat, x.lc, x.lib, x.borrow]; }));
  await p.screenshot({ path: '/tmp/s2.png' });
  for (let i = 0; i < 4; i++) { const t = await p.$eval('#deck .q.cur', e => e.innerText.replace(/\n+/g, ' | ')); console.log('card', t); await p.click('#deck .q.cur label.choice:not(.skip) >> nth=0'); await p.waitForTimeout(600); }
  console.log('panel', (await p.$eval('#cr-panel', e => e.innerText)).replace(/\n+/g, ' | '));
  await p.screenshot({ path: '/tmp/s3.png' });
  await p.click('#mat-go'); await p.waitForTimeout(1500);
  console.log('stage', await p.evaluate(() => window.__lingcun.state().stage));
  console.log('check', (await p.$eval('#b-check', e => e.innerText)).replace(/\n+/g, ' | ').slice(0, 400));
  await p.screenshot({ path: '/tmp/s4.png' });
  console.log('errs', errs);
  await b.close();
})();
