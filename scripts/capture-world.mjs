/** Capture the current app for art review; run with a local dev server. */
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--use-angle=gl', '--enable-gpu'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.WORLD_REVIEW_URL || 'http://localhost:3000', { waitUntil: 'networkidle', timeout: 120000 });
  await page.locator('[data-lobby-state=idle]').waitFor({ timeout: 90000 });
  await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
  await page.waitForTimeout(16000);
  const dir = 'docs/design/isekai-world/implementation/';
  for (const [width, height, name] of [[1440,900,'desktop'],[1280,720,'laptop'],[1920,1080,'wide']]) {
    await page.setViewportSize({ width, height });
    await page.mouse.move(width/2, height/2);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: dir + name + '.png' });
  }
  console.log(JSON.stringify({ errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); }
