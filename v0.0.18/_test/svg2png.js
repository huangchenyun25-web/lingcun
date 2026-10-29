const { chromium } = require('playwright-core');
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const p = await b.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  for (const n of ['a-1-default', 'a-2-recording', 'a-4-near', 'a-3-done']) { await p.goto('file:///workspace/lingcun/design_next/voice_od/voice/' + n + '.svg'); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/' + n + '.png' }); }
  await b.close(); })();
