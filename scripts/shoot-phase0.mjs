import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3001';
const browser = await chromium.launch();

async function shot({ path, width, height, url, out, fullPage = true, before }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (before) await before(page);
  if (fullPage) {
    // Scroll through the page so whileInView reveal animations fire, then return to top.
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const step = window.innerHeight * 0.6;
      const max = document.documentElement.scrollHeight;
      for (let y = 0; y < max; y += step) {
        window.scrollTo(0, y);
        await sleep(220);
      }
      window.scrollTo(0, max);
      await sleep(600); // let the final reveal's IntersectionObserver latch (once:true)
      window.scrollTo(0, 0);
      await sleep(200);
    });
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: out, fullPage });
  console.log('saved', out);
  await ctx.close();
}

// Landing — desktop full page
await shot({ width: 1440, height: 1000, url: '/', out: 'p0-landing-desktop.png' });

// Landing — mobile full page
await shot({ width: 390, height: 844, url: '/', out: 'p0-landing-mobile.png' });

// Sign-in
await shot({ width: 1440, height: 900, url: '/sign-in', out: 'p0-signin.png', fullPage: false });

// CIO dashboard — log in via demo button, confirm shell consistency
await shot({
  width: 1440,
  height: 1000,
  url: '/sign-in',
  out: 'p0-cio.png',
  before: async page => {
    await page.getByRole('button', { name: /Mahesh Iyer/ }).click();
    await page.waitForSelector('text=CIO Dashboard', { timeout: 15000 });
    await page.waitForTimeout(600);
  },
});

await browser.close();
console.log('done');
