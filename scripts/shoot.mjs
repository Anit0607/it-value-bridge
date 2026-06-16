import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';

const shots = [
  { role: 'cio', nameMatch: 'Mahesh Iyer', waitFor: 'text=CIO Dashboard', out: 'shot-cio.png' },
  { role: 'pmo', nameMatch: 'Anita Desai', waitFor: 'text=Portfolio', out: 'shot-pmo.png' },
];

const browser = await chromium.launch();

for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Click the demo login button matching this role's name
  await page.getByRole('button', { name: new RegExp(s.nameMatch) }).click();
  await page.waitForSelector(s.waitFor, { timeout: 15000 });
  await page.waitForTimeout(800); // let funnel/transitions settle
  await page.screenshot({ path: s.out, fullPage: true });
  console.log('saved', s.out);
  await ctx.close();
}

await browser.close();
console.log('done');
