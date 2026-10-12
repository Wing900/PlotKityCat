import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const ctx = await chromium.launchPersistentContext('D:/projects/plotkitycat/tools/moodle/profile', {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('讨论区已打开:', page.url());
console.log('博士请在浏览器里删除多余的 d=161632（保留 d=161633）');
console.log('浏览器保持开 30 分钟');

await page.waitForTimeout(1800000);
await ctx.close();